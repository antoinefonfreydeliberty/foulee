import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProgramWeek } from '@/lib/utils/dates'
import { calcPace } from '@/lib/utils/pace'
import { RapportsClient, type ReportView, type ChartWeek } from './RapportsClient'

type LogRow = { date: string; distance_km: number | null; duration_minutes: number | null }

export default async function RapportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const programStart = process.env.PROGRAM_START_DATE ?? '2026-06-08'

  const [{ data: profile }, { data: reports }, { data: logs }] = await Promise.all([
    supabase
      .from('profiles').select('first_name, coach_name').eq('user_id', user.id).single(),
    supabase
      .from('weekly_reports')
      .select('id, week_number, week_start, coach_analysis')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false }),
    supabase
      .from('training_logs')
      .select('date, distance_km, duration_minutes')
      .eq('user_id', user.id)
      .gte('date', programStart),
  ])

  if (!profile) redirect('/onboarding')

  const reportList = reports ?? []
  const allLogs = (logs ?? []) as LogRow[]

  // Hero : total live depuis training_logs (toutes les séances du programme,
  // du début à aujourd'hui). Équivalent au total visible dans le Journal, et
  // non plus la somme des colonnes stats figées de weekly_reports.
  const totalDistance = allLogs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
  const totalSessions = allLogs.length
  const weekCount = Math.max(1, getProgramWeek(programStart))

  // Fenêtre [week_start, week_start + 7 jours[ : strictement identique à celle
  // du cron (gte week_start, lt nextWeekStart), pour des chiffres cohérents.
  const weekEndExclusive = (weekStart: string): string => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  }

  // Stats live par semaine de rapport (même formule que le cron : somme des km,
  // nombre de sorties, allure moyenne = calcPace(totalKm, totalMin)). Le texte
  // qualitatif (coach_analysis) reste lu depuis weekly_reports.
  const reportViews: ReportView[] = reportList.map(r => {
    const end = weekEndExclusive(r.week_start)
    const weekLogs = allLogs.filter(l => l.date >= r.week_start && l.date < end)
    const distance = weekLogs.reduce((s, l) => s + (l.distance_km ?? 0), 0)
    const totalMin = weekLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0)
    const avg_pace = distance > 0 ? calcPace(distance, totalMin) : '--\'--"'
    return {
      id: r.id,
      week_number: r.week_number,
      week_start: r.week_start,
      coach_analysis: r.coach_analysis,
      stats: { distance, sessions: weekLogs.length, avg_pace },
    }
  })

  // Graphique : uniquement les semaines qui ont déjà un rapport, 6 dernières.
  const chartWeeks: ChartWeek[] = [...reportViews]
    .sort((a, b) => a.week_number - b.week_number)
    .slice(-6)
    .map(r => ({
      weekNumber: r.week_number,
      weekStart: r.week_start,
      label: `S${r.week_number}`,
      value: r.stats.distance,
      current: r.week_number === reportViews[0]?.week_number,
    }))

  return (
    <RapportsClient
      coachName={profile.coach_name}
      reports={reportViews}
      hero={{ totalDistance, totalSessions, weekCount }}
      chartWeeks={chartWeeks}
    />
  )
}
