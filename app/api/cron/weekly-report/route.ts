import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { anthropic, MODEL, extractJSON, callClaudeWithRetry } from '@/lib/claude/client'
import { buildSystemPrompt, buildWeeklyReportPrompt } from '@/lib/claude/prompts'
import { buildClosingReportPrompt } from '@/lib/claude/closing-prompt'
import type { ClosingPodiumEntry, ClosingStats, RaceResult } from '@/lib/claude/closing-prompt'
import { sendWeeklyEmail, sendClosingEmail } from '@/lib/brevo/client'
import { buildEmailHtml } from '@/lib/brevo/email-builder'
import { buildClosingEmailHtml } from '@/lib/brevo/closing-email'
import { getDaysLeft, getProgramWeek, getProgramWeekStart, getRawProgramWeek } from '@/lib/utils/dates'
import { calcPace } from '@/lib/utils/pace'
import type { ClassementEntry, Profile, TrainingSession } from '@/types'

// Nombre total de semaines du programme. Sert à détecter la semaine finale
// (bilan de clôture) et l'après-programme (garde-fou anti-envoi).
const TOTAL_PROGRAM_WEEKS = 14

// Durée en minutes -> libellé "1 h 52" (ou "48 min" si moins d'une heure).
// Utilisé pour le temps de course dans le bilan de clôture.
const formatDurationHm = (minutes: number): string => {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

// Traitement parallèle des utilisateurs (cf. Foulée.md, timeout cron semaine 7
// sur Alix) : le temps mural ne dépend plus de la SOMME des traitements mais du
// plus long. maxDuration explicite = plafond effectif déjà appliqué par la
// plateforme (le run semaine 7 a été tué à 300 s). À vérifier côté plan Vercel.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── Garde-fou après-programme + détection semaine finale ───────────────
  // getProgramWeek borne à 14 ; on lit ici la semaine NON clampée pour distinguer
  // la semaine 14 (bilan de clôture) de l'après-programme (> 14). Au-delà de la
  // 14e semaine, no-op complet : aucun rapport, aucun email (le cron hebdo tourne
  // chaque dimanche, y compris après la course).
  const rawWeek = getRawProgramWeek(process.env.PROGRAM_START_DATE)
  const isFinalWeek = rawWeek === TOTAL_PROGRAM_WEEKS
  if (rawWeek > TOTAL_PROGRAM_WEEKS) {
    return NextResponse.json({ success: true, processed: 0, skipped: 0, errors: [], note: 'post-program: no-op' })
  }

  const supabase = createAdminClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_completed', true)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ success: true, processed: 0, skipped: 0, errors: [] })
  }

  // ─── Classement nominatif de la semaine (calculé UNE SEULE fois par run) ───
  // Données de groupe identiques dans les 4 emails. Une seule requête Supabase,
  // hors de la boucle par utilisateur. Fenêtre de dates STRICTEMENT identique à
  // celle du rapport individuel (weekStart -> nextWeekStart), pour qu'une séance
  // saisie dimanche avant le cron soit comptée de façon cohérente des deux côtés.
  const classementProfiles = profiles as Profile[]
  const groupProgramStart = process.env.PROGRAM_START_DATE!
  const groupWeekNumber = Math.max(1, getProgramWeek(groupProgramStart))
  const groupWeekStart = getProgramWeekStart(groupProgramStart, groupWeekNumber)
  const groupNextWeekStart = getProgramWeekStart(groupProgramStart, Math.min(groupWeekNumber + 1, 14))

  const { data: groupWeekLogs } = await supabase
    .from('training_logs')
    .select('user_id, distance_km')
    .in('user_id', classementProfiles.map((p) => p.user_id))
    .gte('date', groupWeekStart)
    .lt('date', groupNextWeekStart)

  // Agrégation par user_id : somme des km + comptage des sorties.
  // Chaque coureur du groupe est pré-initialisé à 0/0 : un coureur sans aucune
  // séance cette semaine reste présent dans le classement avec ces valeurs réelles.
  const aggByUser = new Map<string, { km: number; sorties: number }>()
  for (const p of classementProfiles) aggByUser.set(p.user_id, { km: 0, sorties: 0 })
  for (const row of (groupWeekLogs ?? []) as { user_id: string; distance_km: number | null }[]) {
    const agg = aggByUser.get(row.user_id)
    if (!agg) continue
    agg.km += row.distance_km ?? 0
    agg.sorties += 1
  }

  // Tri : km décroissant, puis sorties décroissant, puis prénom alphabétique.
  // Groupe fermé de 4 personnes -> ordre strict, pas de gestion d'ex aequo affiché.
  const classement: ClassementEntry[] = classementProfiles
    .map((p) => ({
      userId: p.user_id,
      prenom: p.first_name,
      km: aggByUser.get(p.user_id)!.km,
      sorties: aggByUser.get(p.user_id)!.sorties,
    }))
    .sort((a, b) => b.km - a.km || b.sorties - a.sorties || a.prenom.localeCompare(b.prenom, 'fr'))
    .map((entry, index) => ({ rang: index + 1, ...entry }))

  // ─── Bilan de clôture (semaine finale uniquement) ────────────────────────
  // Résultat de course du jour J (séance loggée à RACE_DATE) par coureur, et
  // podium du groupe classé par TEMPS de course (pas le volume de la semaine).
  // Calculés UNE SEULE fois par run, comme le classement.
  const raceDate = process.env.RACE_DATE ?? '2026-09-13'
  const raceResultByUser = new Map<string, { distanceKm: number; durationMinutes: number; pace: string | null; feeling: number | null }>()
  let podium: ClosingPodiumEntry[] = []

  if (isFinalWeek) {
    const { data: raceLogs } = await supabase
      .from('training_logs')
      .select('user_id, distance_km, duration_minutes, pace_per_km, feeling')
      .in('user_id', classementProfiles.map((p) => p.user_id))
      .eq('date', raceDate)

    for (const row of (raceLogs ?? []) as { user_id: string; distance_km: number | null; duration_minutes: number | null; pace_per_km: string | null; feeling: number | null }[]) {
      const prev = raceResultByUser.get(row.user_id)
      // Si plusieurs séances le jour J, on retient la plus longue (= la course).
      if (!prev || (row.distance_km ?? 0) > prev.distanceKm) {
        raceResultByUser.set(row.user_id, {
          distanceKm: row.distance_km ?? 0,
          durationMinutes: row.duration_minutes ?? 0,
          pace: row.pace_per_km ?? null,
          feeling: row.feeling ?? null,
        })
      }
    }

    // Coureurs avec résultat triés par temps croissant, puis ceux sans résultat.
    const withResult = classementProfiles
      .filter((p) => (raceResultByUser.get(p.user_id)?.durationMinutes ?? 0) > 0)
      .map((p) => ({ prenom: p.first_name, minutes: raceResultByUser.get(p.user_id)!.durationMinutes }))
      .sort((a, b) => a.minutes - b.minutes || a.prenom.localeCompare(b.prenom, 'fr'))
    const withoutResult = classementProfiles
      .filter((p) => (raceResultByUser.get(p.user_id)?.durationMinutes ?? 0) <= 0)

    podium = [
      ...withResult.map((e, i) => ({ rang: i + 1, prenom: e.prenom, timeLabel: formatDurationHm(e.minutes), hasResult: true })),
      ...withoutResult.map((p) => ({ rang: null, prenom: p.first_name, timeLabel: null, hasResult: false })),
    ]
  }

  // Résultat typé par utilisateur : permet d'agréger proprement après
  // Promise.allSettled (le traitement de chaque utilisateur ne rejette jamais,
  // il retourne son issue ; l'isolation des erreurs est garantie par le
  // try/catch interne).
  type UserResult =
    | { status: 'processed'; name: string }
    | { status: 'skipped'; name: string }
    | { status: 'error'; name: string; error: string }

  const processUser = async (profile: Profile): Promise<UserResult> => {
    try {
      const programStart = process.env.PROGRAM_START_DATE!
      const weekNumber = Math.max(1, getProgramWeek(programStart))
      const weekStart = getProgramWeekStart(programStart, weekNumber)
      const nextWeekNumber = Math.min(weekNumber + 1, 14)
      const nextWeekStart = getProgramWeekStart(programStart, nextWeekNumber)

      // Idempotence: skip if email already sent this week
      const { data: existingReport } = await supabase
        .from('weekly_reports')
        .select('email_sent_at')
        .eq('user_id', profile.user_id)
        .eq('week_start', weekStart)
        .maybeSingle()

      if (existingReport?.email_sent_at) {
        console.log(`Skipped ${profile.first_name}: email already sent this week`)
        return { status: 'skipped', name: profile.first_name }
      }

      // ─── SEMAINE FINALE : email de clôture (bilan global 14 semaines) ──────
      // Bilan global + résultat du jour J mis en avant, aucun programme de
      // semaine suivante. Podium du groupe par temps de course (calculé au run).
      if (isFinalWeek) {
        const week14End = getProgramWeekStart(programStart, TOTAL_PROGRAM_WEEKS + 1)

        const { data: programLogs } = await supabase
          .from('training_logs')
          .select('date, distance_km, duration_minutes')
          .eq('user_id', profile.user_id)
          .gte('date', programStart)
          .lt('date', week14End)

        const pLogs = (programLogs ?? []) as { date: string; distance_km: number | null; duration_minutes: number | null }[]
        const gTotalKm = pLogs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
        const gTotalMin = pLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0)
        const longestRunKm = pLogs.reduce((m, l) => Math.max(m, l.distance_km ?? 0), 0)
        const weeksTrained = new Set(
          pLogs.map((l) => {
            const d = new Date(l.date + 'T00:00:00').getTime()
            const s = new Date(programStart + 'T00:00:00').getTime()
            return Math.floor((d - s) / (7 * 86_400_000)) + 1
          })
        ).size

        const closingStats: ClosingStats = {
          totalKm: gTotalKm,
          sessions: pLogs.length,
          longestRunKm,
          avgPace: gTotalKm > 0 ? calcPace(gTotalKm, gTotalMin) : '--\'--"',
          weeksTrained,
        }

        const rr = raceResultByUser.get(profile.user_id)
        const raceResult: RaceResult | null = rr && rr.distanceKm > 0 ? {
          distanceKm: rr.distanceKm,
          durationLabel: formatDurationHm(rr.durationMinutes),
          pace: rr.pace,
          feeling: rr.feeling,
        } : null

        const closingResult = await callClaudeWithRetry(async () => {
          const msg = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4000,
            temperature: 0.7,
            system: buildSystemPrompt(profile, process.env.PROGRAM_START_DATE),
            messages: [{
              role: 'user',
              content: buildClosingReportPrompt({
                profile,
                stats: closingStats,
                raceResult,
                goalTime: profile.goal_time ?? null,
                podium,
              }),
            }],
          })
          const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
          return extractJSON(text) as { coach_analysis: string; coach_tips: { category: string; tip: string }[] }
        })

        // Stats stockées : fenêtre semaine 14 (cohérence avec les autres semaines ;
        // la page Rapports recalcule de toute façon en direct depuis training_logs).
        const w14Logs = pLogs.filter((l) => l.date >= weekStart)
        const w14Km = w14Logs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
        const w14Min = w14Logs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0)
        const stats = { distance: w14Km, sessions: w14Logs.length, avg_pace: w14Km > 0 ? calcPace(w14Km, w14Min) : '--\'--"' }

        const { data: closingUserData } = await supabase.auth.admin.getUserById(profile.user_id)
        const closingEmail = closingUserData?.user?.email ?? ''
        const magicLink = `${process.env.NEXT_PUBLIC_URL}/dashboard`

        const htmlContent = buildClosingEmailHtml({
          firstName:     profile.first_name,
          coachName:     profile.coach_name,
          coachAnalysis: closingResult.coach_analysis,
          stats:         closingStats,
          raceResult,
          podium,
          coachTips:     closingResult.coach_tips,
          magicLink,
        })

        const { data: reportRow } = await supabase
          .from('weekly_reports')
          .upsert({
            user_id: profile.user_id,
            week_start: weekStart,
            week_number: weekNumber,
            coach_analysis: closingResult.coach_analysis,
            email_body: htmlContent,
            stats,
            next_week_program: [],   // programme terminé : aucune semaine suivante
            coach_tips: closingResult.coach_tips,
          }, { onConflict: 'user_id,week_start' })
          .select()
          .single()

        // PAS d'upsert de programme semaine suivante : le programme est terminé.

        const senderVerified = process.env.BREVO_SENDER_VERIFIED === 'true'
        if (closingEmail) {
          if (senderVerified) {
            await sendClosingEmail({
              to: closingEmail,
              toName: profile.first_name,
              coachName: profile.coach_name,
              htmlContent,
            })
            if (reportRow) {
              await supabase
                .from('weekly_reports')
                .update({ email_sent_at: new Date().toISOString() })
                .eq('id', reportRow.id)
            }
          } else {
            console.log(`[TEST MODE][CLOTURE] Email HTML for ${profile.first_name}:\n${htmlContent}`)
          }
        }

        return { status: 'processed', name: profile.first_name }
      }

      const [
        { data: currentProgram },
        { data: nextProgram },
        { data: logs },
        { data: checkin },
        { data: recentReports },
        { data: allLogs },
      ] = await Promise.all([
        supabase.from('training_programs').select('sessions').eq('user_id', profile.user_id).eq('week_start', weekStart).maybeSingle(),
        supabase.from('training_programs').select('sessions').eq('user_id', profile.user_id).eq('week_start', nextWeekStart).maybeSingle(),
        supabase.from('training_logs').select('*').eq('user_id', profile.user_id).gte('date', weekStart).lt('date', nextWeekStart),
        supabase.from('weekly_checkins').select('*').eq('user_id', profile.user_id).eq('week_start', weekStart).maybeSingle(),
        supabase.from('weekly_reports').select('*').eq('user_id', profile.user_id).order('week_start', { ascending: false }).limit(3),
        supabase.from('training_logs').select('date').eq('user_id', profile.user_id).gte('date', programStart),
      ])

      const plannedSessions = (currentProgram?.sessions ?? []) as TrainingSession[]
      const nextWeekPlanned = (nextProgram?.sessions ?? []) as TrainingSession[]
      const actualLogs = logs ?? []

      // Streak de semaines consécutives sans aucune sortie enregistrée (dont la semaine courante).
      // Sert au coach à évoquer une absence prolongée avec du recul sur les semaines passées.
      const loggedWeeks = new Set(
        ((allLogs ?? []) as { date: string }[]).map((l) => {
          const d = new Date(l.date + 'T00:00:00').getTime()
          const s = new Date(programStart + 'T00:00:00').getTime()
          return Math.floor((d - s) / (7 * 86_400_000)) + 1
        })
      )
      let noSessionStreak = 0
      for (let w = weekNumber; w >= 1; w--) {
        if (loggedWeeks.has(w)) break
        noSessionStreak++
      }

      // Generate weekly report JSON
      const reportResult = await callClaudeWithRetry(async () => {
        const msg = await anthropic.messages.create({
          model: MODEL,
          // 4000 (et non 2000) : certains rapports (ex. Hugo semaine 7) dépassaient
          // 2000 tokens de sortie -> JSON tronqué DÉTERMINISTE que le retry seul ne
          // corrige pas. Marge suffisante pour analyse + tips + programme + notes.
          max_tokens: 4000,
          temperature: 0.7,
          system: buildSystemPrompt(profile, process.env.PROGRAM_START_DATE),
          messages: [{
            role: 'user',
            content: buildWeeklyReportPrompt({
              profile,
              weekNumber,
              plannedSessions,
              actualLogs,
              checkin: checkin ?? null,
              recentHistory: recentReports ?? [],
              nextWeekPlanned,
              nextWeekNumber,
              noSessionStreak,
              classement,
            }),
          }],
        })
        const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
        return extractJSON(text) as {
          coach_analysis: string
          coach_tips: unknown[]
          next_week_program: TrainingSession[]
          adaptation_notes: string
        }
      })

      // Compute stats
      const totalKm = actualLogs.reduce((s: number, l: { distance_km: number }) => s + (l.distance_km ?? 0), 0)
      const totalMin = actualLogs.reduce((s: number, l: { duration_minutes: number }) => s + (l.duration_minutes ?? 0), 0)
      const avgPace = totalKm > 0 ? calcPace(totalKm, totalMin) : '--\'--"'
      const stats = { distance: totalKm, sessions: actualLogs.length, avg_pace: avgPace }

      // Get user email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id)
      const userEmail = userData?.user?.email ?? ''

      // Plain dashboard URL (no single-use magic token: Gmail's link prescan
      // consumes one-time links before the user clicks). If the session is valid
      // the click opens the dashboard directly; otherwise proxy.ts redirects to
      // /login where the OTP flow takes over.
      const magicLink = `${process.env.NEXT_PUBLIC_URL}/dashboard`
      const checkinLink = `${process.env.NEXT_PUBLIC_URL}/dashboard/checkin`

      // Generate email HTML from template
      const htmlContent = buildEmailHtml({
        firstName:       profile.first_name,
        coachName:       profile.coach_name,
        coachAnalysis:   reportResult.coach_analysis,
        stats,
        nextWeekProgram: reportResult.next_week_program,
        weekNumber,
        daysLeft:        getDaysLeft(),
        nextWeekStart,
        magicLink,
        checkinLink,
        classement,
      })

      // Upsert weekly report
      const { data: reportRow } = await supabase
        .from('weekly_reports')
        .upsert({
          user_id: profile.user_id,
          week_start: weekStart,
          week_number: weekNumber,
          coach_analysis: reportResult.coach_analysis,
          email_body: htmlContent,
          stats,
          next_week_program: reportResult.next_week_program,
          coach_tips: reportResult.coach_tips,
        }, { onConflict: 'user_id,week_start' })
        .select()
        .single()

      // Upsert next week program if Claude returned an adaptation
      if (reportResult.next_week_program?.length > 0) {
        await supabase.from('training_programs').upsert({
          user_id: profile.user_id,
          week_start: nextWeekStart,
          week_number: nextWeekNumber,
          sessions: reportResult.next_week_program,
        }, { onConflict: 'user_id,week_start' })
      }

      // Send email or log in test mode
      const senderVerified = process.env.BREVO_SENDER_VERIFIED === 'true'
      if (userEmail) {
        if (senderVerified) {
          await sendWeeklyEmail({
            to: userEmail,
            toName: profile.first_name,
            coachName: profile.coach_name,
            htmlContent,
            weekNumber,
          })

          if (reportRow) {
            await supabase
              .from('weekly_reports')
              .update({ email_sent_at: new Date().toISOString() })
              .eq('id', reportRow.id)
          }
        } else {
          console.log(`[TEST MODE] Email HTML for ${profile.first_name}:\n${htmlContent}`)
          console.log(`[TEST MODE] Magic link: ${magicLink}`)
        }
      }

      return { status: 'processed', name: profile.first_name }
    } catch (err) {
      console.error(`Error processing ${profile.first_name}:`, err)
      return { status: 'error', name: profile.first_name, error: String(err) }
    }
  }

  // Promise.allSettled (et non Promise.all) : un rejet inattendu d'une tâche
  // n'interrompt pas les autres. En pratique processUser ne rejette jamais
  // (try/catch interne), mais la garantie reste utile.
  const settled = await Promise.allSettled((profiles as Profile[]).map(processUser))

  const processed: string[] = []
  const skipped: string[] = []
  const errors: { user: string; error: string }[] = []

  for (const s of settled) {
    if (s.status === 'rejected') {
      errors.push({ user: 'unknown', error: String(s.reason) })
      continue
    }
    const r = s.value
    if (r.status === 'processed') processed.push(r.name)
    else if (r.status === 'skipped') skipped.push(r.name)
    else errors.push({ user: r.name, error: r.error })
  }

  return NextResponse.json({
    success: true,
    processed: processed.length,
    skipped: skipped.length,
    errors,
  })
}
