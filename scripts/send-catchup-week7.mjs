// ─────────────────────────────────────────────────────────────────────────────
// Rattrapage one-shot : emails hebdomadaires de la SEMAINE 7 pour Hugo et Alix.
//
// Contexte (cf. Foulée.md) : le cron du dimanche 26/07 a échoué pour ces deux
// coureurs (Hugo : JSON tronqué non retenté ; Alix : timeout cron sur le
// traitement séquentiel). Leurs séances existent dans training_logs mais aucun
// rapport ni email n'a été produit. Ce script régénère et renvoie EXACTEMENT ce
// qu'ils auraient reçu, avec un bandeau de rattrapage en tête d'email.
//
// Il RÉUTILISE la logique du cron (mêmes fonctions de prompt, stats, HTML email)
// via import des modules partagés. Aucune logique n'est réécrite en parallèle.
//
// USAGE (comme scripts/send-invitations.mjs, via tsx qui strippe le TS et résout
// les alias @/ et les imports .js -> .ts) :
//
//   npx tsx scripts/send-catchup-week7.mjs            # dry-run (défaut) : rien écrit, rien envoyé
//   npx tsx scripts/send-catchup-week7.mjs --send     # exécution réelle : écriture DB + envoi Brevo
//
// GARDE-FOUS :
//   - Ne cible QUE Hugo et Alix. Ne touche jamais aux lignes d'Antoine ou Rémi.
//   - Anti double-envoi : skip un coureur si une ligne weekly_reports existe déjà
//     pour la semaine 7 (réexécutable sans risque).
//   - --dry-run par défaut ; l'écriture/envoi n'a lieu qu'avec --send explicite.
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Charger .env.local AVANT tout import de module applicatif : lib/claude/client
// instancie le SDK Anthropic au chargement (a besoin de ANTHROPIC_API_KEY), et
// lib/utils/dates lit PROGRAM_START_DATE au chargement. On utilise donc des
// imports dynamiques après dotenv.config().
dotenv.config({ path: resolve(__dirname, '../.env.local') })

// ─── Paramètres du rattrapage ────────────────────────────────────────────────
const TARGET_NAMES = ['Hugo', 'Alix']
const WEEK_NUMBER  = 7
const WEEK_START   = '2026-07-20'   // lundi de la semaine 7 (attendu, vérifié ci-dessous)
const CATCHUP_NOTICE =
  'Rattrapage : voici le message que tu aurais dû recevoir dimanche dernier, avec un peu de retard.'
const SEND = process.argv.includes('--send')
// ─────────────────────────────────────────────────────────────────────────────

// Imports dynamiques (après dotenv) des modules partagés avec le cron.
const { anthropic, MODEL, extractJSON, callClaudeWithRetry } = await import('../lib/claude/client.js')
const { buildSystemPrompt, buildWeeklyReportPrompt }         = await import('../lib/claude/prompts.js')
const { buildEmailHtml }                                     = await import('../lib/brevo/email-builder.js')
const { sendWeeklyEmail }                                    = await import('../lib/brevo/client.js')
const { getDaysLeft, getProgramWeek, getProgramWeekStart }   = await import('../lib/utils/dates.js')
const { calcPace }                                           = await import('../lib/utils/pace.js')
const { createClient }                                       = await import('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const PROGRAM_START = process.env.PROGRAM_START_DATE ?? '2026-06-08'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local')
  process.exit(1)
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌  ANTHROPIC_API_KEY manquant dans .env.local')
  process.exit(1)
}
if (SEND && !process.env.BREVO_API_KEY) {
  console.error('❌  BREVO_API_KEY manquant dans .env.local (requis pour --send)')
  process.exit(1)
}

// Client admin Supabase (service role, bypass RLS) construit ici plutôt que via
// lib/supabase/server (qui importe next/headers, indisponible hors Next).
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Fenêtre de dates de la semaine 7, calculée avec la MÊME fonction que le cron.
const weekStart     = getProgramWeekStart(PROGRAM_START, WEEK_NUMBER)
const nextWeekNumber = Math.min(WEEK_NUMBER + 1, 14)
const nextWeekStart  = getProgramWeekStart(PROGRAM_START, nextWeekNumber)

if (weekStart !== WEEK_START) {
  console.error(`❌  Incohérence de dates : getProgramWeekStart(${PROGRAM_START}, ${WEEK_NUMBER}) = ${weekStart}, attendu ${WEEK_START}.`)
  console.error('    Vérifie PROGRAM_START_DATE dans .env.local (attendu 2026-06-08). Abandon.')
  process.exit(1)
}

const mode = SEND ? 'ENVOI RÉEL (--send)' : 'DRY-RUN (défaut, aucune écriture ni envoi)'
console.log('═══════════════════════════════════════════════════════════════════')
console.log(`  Rattrapage semaine ${WEEK_NUMBER} (${weekStart} → ${nextWeekStart})`)
console.log(`  Cibles : ${TARGET_NAMES.join(', ')}`)
console.log(`  Mode   : ${mode}`)
console.log('═══════════════════════════════════════════════════════════════════\n')

// ─── 1. Récupérer tous les profils onboardés (pour le classement de groupe) ───
const { data: allProfiles, error: profilesErr } = await supabase
  .from('profiles')
  .select('*')
  .eq('onboarding_completed', true)

if (profilesErr) {
  console.error('❌  Erreur lecture profiles :', profilesErr.message)
  process.exit(1)
}
if (!allProfiles || allProfiles.length === 0) {
  console.error('❌  Aucun profil onboardé trouvé.')
  process.exit(1)
}

// ─── 2. Classement nominatif de la semaine 7 (MÊME logique que le cron) ───────
// Une seule requête sur training_logs, fenêtre weekStart -> nextWeekStart,
// identique au rapport individuel. Chaque coureur pré-initialisé à 0/0.
const { data: groupWeekLogs, error: groupLogsErr } = await supabase
  .from('training_logs')
  .select('user_id, distance_km')
  .in('user_id', allProfiles.map((p) => p.user_id))
  .gte('date', weekStart)
  .lt('date', nextWeekStart)

if (groupLogsErr) {
  console.error('❌  Erreur lecture training_logs (groupe) :', groupLogsErr.message)
  process.exit(1)
}

const aggByUser = new Map()
for (const p of allProfiles) aggByUser.set(p.user_id, { km: 0, sorties: 0 })
for (const row of groupWeekLogs ?? []) {
  const agg = aggByUser.get(row.user_id)
  if (!agg) continue
  agg.km += row.distance_km ?? 0
  agg.sorties += 1
}

const classement = allProfiles
  .map((p) => ({
    userId: p.user_id,
    prenom: p.first_name,
    km: aggByUser.get(p.user_id).km,
    sorties: aggByUser.get(p.user_id).sorties,
  }))
  .sort((a, b) => b.km - a.km || b.sorties - a.sorties || a.prenom.localeCompare(b.prenom, 'fr'))
  .map((entry, index) => ({ rang: index + 1, ...entry }))

console.log('Classement semaine 7 (groupe, données réelles) :')
for (const c of classement) {
  console.log(`  ${c.rang}. ${c.prenom} — ${c.km.toFixed(1)} km / ${c.sorties} sortie(s)`)
}
console.log('')

// ─── 3. Restreindre aux cibles Hugo & Alix ───────────────────────────────────
const targets = allProfiles.filter((p) => TARGET_NAMES.includes(p.first_name))
const missing = TARGET_NAMES.filter((n) => !targets.some((p) => p.first_name === n))
if (missing.length > 0) {
  console.warn(`⚠️  Profil(s) introuvable(s) : ${missing.join(', ')} (ignoré(s)).`)
}
if (targets.length === 0) {
  console.error('❌  Aucune cible trouvée. Abandon.')
  process.exit(1)
}

// ─── Traitement d'un utilisateur (réplique fidèle du corps de boucle du cron) ─
async function processCatchUp(profile) {
  console.log(`\n───────── ${profile.first_name} ─────────`)

  // Garde-fou anti double-envoi : ne rien faire si une ligne weekly_reports
  // existe déjà pour cette semaine (réexécutable sans risque).
  const { data: existingReport, error: existErr } = await supabase
    .from('weekly_reports')
    .select('id, email_sent_at')
    .eq('user_id', profile.user_id)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (existErr) {
    console.error(`  ❌  Erreur lecture weekly_reports : ${existErr.message}`)
    return
  }
  if (existingReport) {
    console.log(`  ⏭️  Une ligne weekly_reports existe déjà (email_sent_at=${existingReport.email_sent_at ?? 'NULL'}). Skip (anti double-envoi).`)
    return
  }

  // Récupération des données de la semaine (MÊMES requêtes que le cron).
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
    supabase.from('training_logs').select('date').eq('user_id', profile.user_id).gte('date', PROGRAM_START),
  ])

  const plannedSessions = currentProgram?.sessions ?? []
  const nextWeekPlanned  = nextProgram?.sessions ?? []
  const actualLogs       = logs ?? []

  // Streak de semaines consécutives sans sortie (MÊME calcul que le cron).
  const loggedWeeks = new Set(
    (allLogs ?? []).map((l) => {
      const d = new Date(l.date + 'T00:00:00').getTime()
      const s = new Date(PROGRAM_START + 'T00:00:00').getTime()
      return Math.floor((d - s) / (7 * 86_400_000)) + 1
    })
  )
  let noSessionStreak = 0
  for (let w = WEEK_NUMBER; w >= 1; w--) {
    if (loggedWeeks.has(w)) break
    noSessionStreak++
  }

  // Génération du rapport JSON (MÊME appel Claude + retry + extractJSON).
  const reportResult = await callClaudeWithRetry(async () => {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,   // identique au cron : évite le JSON tronqué déterministe (ex. Hugo)
      temperature: 0.7,
      system: buildSystemPrompt(profile, PROGRAM_START),
      messages: [{
        role: 'user',
        content: buildWeeklyReportPrompt({
          profile,
          weekNumber: WEEK_NUMBER,
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
    return extractJSON(text)
  })

  // Stats (MÊME calcul que le cron).
  const totalKm  = actualLogs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
  const totalMin = actualLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0)
  const avgPace  = totalKm > 0 ? calcPace(totalKm, totalMin) : '--\'--"'
  const stats    = { distance: totalKm, sessions: actualLogs.length, avg_pace: avgPace }

  // Email utilisateur.
  const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id)
  const userEmail = userData?.user?.email ?? ''

  const magicLink   = `${process.env.NEXT_PUBLIC_URL}/dashboard`
  const checkinLink = `${process.env.NEXT_PUBLIC_URL}/dashboard/checkin`

  // HTML email via buildEmailHtml + bandeau de rattrapage (param catchUpNotice).
  const htmlContent = buildEmailHtml({
    firstName:       profile.first_name,
    coachName:       profile.coach_name,
    coachAnalysis:   reportResult.coach_analysis,
    stats,
    nextWeekProgram: reportResult.next_week_program,
    weekNumber:      WEEK_NUMBER,
    daysLeft:        getDaysLeft(),
    nextWeekStart,
    magicLink,
    checkinLink,
    classement,
    catchUpNotice:   CATCHUP_NOTICE,
  })

  // Résumé console (dry-run comme --send).
  console.log(`  Email : ${userEmail || '(introuvable)'}`)
  console.log(`  Stats : ${stats.distance.toFixed(1)} km / ${stats.sessions} sortie(s) / ${stats.avg_pace}`)
  console.log(`  Séances semaine suivante générées : ${reportResult.next_week_program?.length ?? 0}`)
  console.log(`  ── coach_analysis ──\n${reportResult.coach_analysis}\n  ────────────────────`)
  console.log(`  HTML email (${htmlContent.length} caractères) :\n${htmlContent}`)

  if (!SEND) {
    console.log('  [DRY-RUN] Rien écrit, rien envoyé.')
    return
  }

  if (!userEmail) {
    console.error('  ❌  Email introuvable : envoi impossible, on n\'écrit rien pour rester cohérent.')
    return
  }

  // ── Écriture DB + envoi (uniquement avec --send) ──
  const { data: reportRow, error: upsertErr } = await supabase
    .from('weekly_reports')
    .upsert({
      user_id: profile.user_id,
      week_start: weekStart,
      week_number: WEEK_NUMBER,
      coach_analysis: reportResult.coach_analysis,
      email_body: htmlContent,
      stats,
      next_week_program: reportResult.next_week_program,
      coach_tips: reportResult.coach_tips,
    }, { onConflict: 'user_id,week_start' })
    .select()
    .single()

  if (upsertErr) {
    console.error(`  ❌  Erreur upsert weekly_reports : ${upsertErr.message}`)
    return
  }

  if (reportResult.next_week_program?.length > 0) {
    await supabase.from('training_programs').upsert({
      user_id: profile.user_id,
      week_start: nextWeekStart,
      week_number: nextWeekNumber,
      sessions: reportResult.next_week_program,
    }, { onConflict: 'user_id,week_start' })
  }

  await sendWeeklyEmail({
    to: userEmail,
    toName: profile.first_name,
    coachName: profile.coach_name,
    htmlContent,
    weekNumber: WEEK_NUMBER,
  })

  if (reportRow) {
    await supabase
      .from('weekly_reports')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', reportRow.id)
  }

  console.log(`  ✅  Email envoyé à ${profile.first_name} <${userEmail}> et weekly_reports mis à jour.`)
}

// Traitement séquentiel des 2 cibles (volume négligeable, pas de risque de timeout ici).
for (const profile of targets) {
  try {
    await processCatchUp(profile)
  } catch (err) {
    console.error(`✗  Erreur pour ${profile.first_name} :`, err?.message ?? err)
  }
}

// ─── Vérification finale : email_sent_at rempli pour les cibles, semaine 7 ────
console.log('\n═══════════════════════════════════════════════════════════════════')
console.log('  Vérification post-traitement (weekly_reports, semaine 7)')
console.log('═══════════════════════════════════════════════════════════════════')

const { data: verifyRows, error: verifyErr } = await supabase
  .from('weekly_reports')
  .select('user_id, week_number, email_sent_at, generated_at')
  .in('user_id', targets.map((p) => p.user_id))
  .eq('week_start', weekStart)

if (verifyErr) {
  console.error('❌  Erreur lecture de vérification :', verifyErr.message)
} else {
  const byUser = new Map((verifyRows ?? []).map((r) => [r.user_id, r]))
  for (const p of targets) {
    const row = byUser.get(p.user_id)
    if (!row) {
      console.log(`  ${p.first_name} : aucune ligne weekly_reports (semaine 7).`)
    } else {
      console.log(`  ${p.first_name} : email_sent_at = ${row.email_sent_at ?? 'NULL'}`)
    }
  }
}

console.log(`\nTerminé.${SEND ? '' : ' (dry-run : relancer avec --send pour exécuter réellement)'}`)
