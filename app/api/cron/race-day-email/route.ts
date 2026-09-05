import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { anthropic, MODEL, extractJSON, callClaudeWithRetry } from '@/lib/claude/client'
import { buildSystemPrompt } from '@/lib/claude/prompts'
import { buildRaceDayEmailPrompt, type RaceDayContent, type RaceDayStats } from '@/lib/claude/race-day-prompt'
import { buildRaceDayEmailHtml } from '@/lib/brevo/race-day-email'
import { sendRaceDayEmail } from '@/lib/brevo/client'
import { getDaysLeft } from '@/lib/utils/dates'
import { calcPace } from '@/lib/utils/pace'
import type { Profile } from '@/types'

// Même contrainte de temps que le cron hebdomadaire : traitement parallèle par
// utilisateur (Promise.allSettled), maxDuration explicite = plafond plateforme.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  // Secret DÉDIÉ, distinct de CRON_SECRET (cf. consigne : ne pas réutiliser).
  if (authHeader !== `Bearer ${process.env.RACE_DAY_CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // dryRun : calcule et logge le contenu généré pour les 4 utilisateurs, n'envoie
  // rien via Brevo, ne pose pas race_day_email_sent_at.
  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true'

  const supabase = createAdminClient()
  const programStart = process.env.PROGRAM_START_DATE!

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_completed', true)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ success: true, dryRun, processed: 0, skipped: 0, errors: [] })
  }

  type UserResult =
    | { status: 'processed'; name: string }
    | { status: 'skipped'; name: string; reason: string }
    | { status: 'error'; name: string; error: string }
    | { status: 'dry-run'; name: string; content: RaceDayContent; stats: RaceDayStats; html: string }

  const processUser = async (profile: Profile): Promise<UserResult> => {
    try {
      // Idempotence : en envoi réel uniquement (le dry-run ne pose jamais le flag
      // et ne doit pas être bloqué par un envoi précédent).
      if (!dryRun && profile.race_day_email_sent_at) {
        console.log(`Skipped ${profile.first_name}: race-day email already sent`)
        return { status: 'skipped', name: profile.first_name, reason: 'already sent' }
      }

      // Stats cumulées réelles depuis le début du programme (mêmes calculs que la
      // page Rapports / le cron hebdo : somme km, nb séances, plus longue sortie,
      // allure moyenne via calcPace). Une seule requête training_logs par user.
      const { data: allLogs } = await supabase
        .from('training_logs')
        .select('date, distance_km, duration_minutes')
        .eq('user_id', profile.user_id)
        .gte('date', programStart)

      const logs = (allLogs ?? []) as { date: string; distance_km: number | null; duration_minutes: number | null }[]
      const totalKm  = logs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
      const totalMin = logs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0)
      const longestRunKm = logs.reduce((m, l) => Math.max(m, l.distance_km ?? 0), 0)
      const startMs = new Date(programStart + 'T00:00:00').getTime()
      const weeksTrained = new Set(
        logs.map((l) => Math.floor((new Date(l.date + 'T00:00:00').getTime() - startMs) / (7 * 86_400_000)) + 1)
      ).size

      const stats: RaceDayStats = {
        totalKm,
        sessions: logs.length,
        longestRunKm,
        avgPace: totalKm > 0 ? calcPace(totalKm, totalMin) : '--\'--"',
        weeksTrained,
      }

      // Génération du contenu (5 blocs) via Claude, mêmes garde-fous que le cron
      // hebdo : max_tokens 4000, callClaudeWithRetry (retry JSON tronqué), extractJSON.
      const content = await callClaudeWithRetry(async () => {
        const msg = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 4000,
          temperature: 0.7,
          system: buildSystemPrompt(profile, programStart),
          messages: [{ role: 'user', content: buildRaceDayEmailPrompt({ profile, stats }) }],
        })
        const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
        return extractJSON(text) as RaceDayContent
      })

      const html = buildRaceDayEmailHtml({
        firstName: profile.first_name,
        coachName: profile.coach_name,
        goalTime: profile.goal_time,
        content,
        stats,
        daysLeft: getDaysLeft(),
        magicLink: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
      })

      if (dryRun) {
        console.log(`[DRY-RUN] Race-day email for ${profile.first_name} (success ${content.success_percentage}%, target ${content.target_pace ?? 'n/a'})`)
        return { status: 'dry-run', name: profile.first_name, content, stats, html }
      }

      // Envoi réel
      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id)
      const userEmail = userData?.user?.email ?? ''
      const senderVerified = process.env.BREVO_SENDER_VERIFIED === 'true'

      if (userEmail && senderVerified) {
        await sendRaceDayEmail({
          to: userEmail,
          toName: profile.first_name,
          coachName: profile.coach_name,
          htmlContent: html,
        })
        await supabase
          .from('profiles')
          .update({ race_day_email_sent_at: new Date().toISOString() })
          .eq('id', profile.id)
      } else if (userEmail) {
        console.log(`[TEST MODE] Race-day email HTML for ${profile.first_name}:\n${html}`)
      }

      return { status: 'processed', name: profile.first_name }
    } catch (err) {
      console.error(`Error processing ${profile.first_name}:`, err)
      return { status: 'error', name: profile.first_name, error: String(err) }
    }
  }

  const settled = await Promise.allSettled((profiles as Profile[]).map(processUser))

  const processed: string[] = []
  const skipped: { name: string; reason: string }[] = []
  const errors: { user: string; error: string }[] = []
  const previews: { name: string; content: RaceDayContent; stats: RaceDayStats; html: string }[] = []

  for (const s of settled) {
    if (s.status === 'rejected') {
      errors.push({ user: 'unknown', error: String(s.reason) })
      continue
    }
    const r = s.value
    if (r.status === 'processed') processed.push(r.name)
    else if (r.status === 'skipped') skipped.push({ name: r.name, reason: r.reason })
    else if (r.status === 'dry-run') previews.push({ name: r.name, content: r.content, stats: r.stats, html: r.html })
    else errors.push({ user: r.name, error: r.error })
  }

  return NextResponse.json({
    success: true,
    dryRun,
    processed: processed.length,
    skipped: skipped.length,
    errors,
    ...(dryRun ? { previews } : {}),
  })
}
