import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getProgramWeek, getProgramWeekStart } from '@/lib/utils/dates'

// Endpoint lecture seule pour la plateforme de paris (foulee-paris/). Aucun cache :
// le volume est trop faible pour que ce soit utile, requête directe à chaque appel
// (cf. Foulée.md, section Intégrations externes). force-dynamic pour éviter toute
// mise en cache implicite par Next.
export const dynamic = 'force-dynamic'

// training_programs.sessions[].type contient DEUX variantes pour la sortie longue
// dans la donnée réelle (vérifié en base le 31/08/26 : 38 lignes "sortie_longue",
// 13 lignes "sortie longue"). Matcher une seule variante ferait retourner null
// pour ~1/4 des semaines. On tolère donc les deux.
const LONG_RUN_TYPES = new Set(['sortie_longue', 'sortie longue'])

type ProfileRow = {
  user_id: string
  first_name: string
  runner_level: string | null
  weekly_sessions: number | null
  goal_time: string | null
  best_recent_time: string | null
}
type LogRow = {
  user_id: string
  date: string
  distance_km: number | null
  duration_minutes: number | null
  pain_notes: string | null
}
type ProgramSession = { type?: string | null; distance_km?: number | null }
type ProgramRow = {
  user_id: string
  week_start: string
  sessions: ProgramSession[] | null
}

const round2 = (n: number) => Math.round(n * 100) / 100
const round4 = (n: number) => Math.round(n * 10000) / 10000

export async function GET(req: NextRequest) {
  // Auth par secret Bearer partagé (même pattern que le cron weekly-report).
  // Fail-closed : si BETTING_API_SECRET n'est pas configuré, on refuse tout,
  // plutôt que d'autoriser un `Bearer undefined`.
  const secret = process.env.BETTING_API_SECRET
  const authHeader = req.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const programStart = process.env.PROGRAM_START_DATE ?? '2026-06-08'
  const raceDate = process.env.RACE_DATE ?? '2026-09-13'
  const currentWeek = Math.max(1, getProgramWeek(programStart))
  const daysUntilRace = Math.max(
    0,
    Math.ceil((new Date(raceDate + 'T00:00:00').getTime() - Date.now()) / 86_400_000)
  )

  const supabase = createAdminClient()

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('user_id, first_name, runner_level, weekly_sessions, goal_time, best_recent_time')
    .eq('onboarding_completed', true)

  const profiles = (profilesData ?? []) as ProfileRow[]
  const userIds = profiles.map((p) => p.user_id)

  // Bornes de semaine (week_start de 1 à currentWeek + 1, la dernière servant de
  // borne exclusive pour la semaine courante). getProgramWeekStart aligne sur le
  // programme, pas sur une semaine ISO calendaire (cf. Foulée.md).
  const weekStarts: string[] = []
  for (let w = 1; w <= currentWeek + 1; w++) weekStarts.push(getProgramWeekStart(programStart, w))
  const overallStart = weekStarts[0]
  const overallEnd = weekStarts[currentWeek] // borne exclusive de la semaine courante

  const [{ data: logsData }, { data: programsData }] = await Promise.all([
    supabase
      .from('training_logs')
      .select('user_id, date, distance_km, duration_minutes, pain_notes')
      .in('user_id', userIds)
      .gte('date', overallStart)
      .lt('date', overallEnd),
    supabase
      .from('training_programs')
      .select('user_id, week_start, sessions')
      .in('user_id', userIds),
  ])

  const logs = (logsData ?? []) as LogRow[]
  const programs = (programsData ?? []) as ProgramRow[]

  const logsByUser = new Map<string, LogRow[]>()
  for (const l of logs) {
    const arr = logsByUser.get(l.user_id)
    if (arr) arr.push(l)
    else logsByUser.set(l.user_id, [l])
  }
  const programByUserWeek = new Map<string, ProgramRow>()
  for (const p of programs) programByUserWeek.set(`${p.user_id}|${p.week_start}`, p)

  const runners = profiles.map((profile) => {
    const userLogs = logsByUser.get(profile.user_id) ?? []

    const weekly_stats = []
    for (let w = 1; w <= currentWeek; w++) {
      const weekStart = weekStarts[w - 1]
      const nextWeekStart = weekStarts[w] // borne exclusive [week_start, week_start + 7j[
      const weekLogs = userLogs.filter((l) => l.date >= weekStart && l.date < nextWeekStart)

      const totalDistance = weekLogs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
      const totalMinutes = weekLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0)
      const longest = weekLogs.length ? Math.max(...weekLogs.map((l) => l.distance_km ?? 0)) : null
      const painFlags = weekLogs.filter(
        (l) => l.pain_notes != null && l.pain_notes.trim() !== ''
      ).length

      const program = programByUserWeek.get(`${profile.user_id}|${weekStart}`)
      const sessions = program?.sessions ?? []
      const longRunDistances = sessions
        .filter((s) => s.type != null && LONG_RUN_TYPES.has(s.type))
        .map((s) => Number(s.distance_km))
        .filter((d) => Number.isFinite(d))
      const plannedLongRun = longRunDistances.length ? Math.max(...longRunDistances) : null

      weekly_stats.push({
        week_number: w,
        total_distance_km: round2(totalDistance),
        session_count: weekLogs.length,
        longest_run_km: longest == null ? null : round2(longest),
        // sum(duration) / sum(distance) : allure moyenne pondérée par la distance,
        // PAS une moyenne des pace_per_km textuels (cf. Foulée.md). null si 0 km.
        avg_pace_min_per_km: totalDistance > 0 ? round4(totalMinutes / totalDistance) : null,
        pain_flag_count: painFlags,
        planned_session_count: sessions.length,
        planned_long_run_km: plannedLongRun == null ? null : round2(plannedLongRun),
      })
    }

    return {
      first_name: profile.first_name,
      runner_level: profile.runner_level,
      weekly_sessions: profile.weekly_sessions,
      goal_time: profile.goal_time,
      best_recent_time: profile.best_recent_time,
      weekly_stats,
      current_program_week: currentWeek,
      days_until_race: daysUntilRace,
    }
  })

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    program_start_date: programStart,
    race_date: raceDate,
    runners,
  })
}
