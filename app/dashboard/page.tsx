import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { CoachMessage } from '@/components/coach/CoachMessage'
import { SessionCard } from '@/components/training/SessionCard'
import { getDaysLeft, getProgramWeek, getProgramWeekStart, getProgressPercent, getWeekStart, formatWeekRange } from '@/lib/utils/dates'
import { calcPace } from '@/lib/utils/pace'
import type { TrainingLog, TrainingProgram, WeeklyReport } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
  ])
  if (!profile) redirect('/onboarding')

  const programStart = process.env.PROGRAM_START_DATE ?? '2026-06-09'
  const weekStart = getWeekStart()
  const weekNumber = Math.max(1, getProgramWeek(programStart))
  const currentWeekProgramStart = getProgramWeekStart(programStart, weekNumber)
  const daysLeft = getDaysLeft()
  const progressPercent = getProgressPercent(weekNumber)

  const [{ data: currentProgram }, { data: latestReport }, { data: weekLogs }] = await Promise.all([
    supabase
      .from('training_programs')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', currentWeekProgramStart)
      .maybeSingle(),
    supabase
      .from('weekly_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('training_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', weekStart)
      .lt('date', new Date(new Date(weekStart).getTime() + 7 * 86400000).toISOString().split('T')[0]),
  ])

  const program = currentProgram as TrainingProgram | null
  const report = latestReport as WeeklyReport | null
  const logs = (weekLogs ?? []) as TrainingLog[]

  const totalKm = logs.reduce((s, l) => s + l.distance_km, 0)
  const totalMin = logs.reduce((s, l) => s + l.duration_minutes, 0)
  const avgPace = totalKm > 0 ? calcPace(totalKm, totalMin) : '--\'--"'

  const defaultCoachMessage = `Bonjour ${profile.first_name} ! Je suis ${profile.coach_name}, ton coach pour Vannes-Auray. Ton programme sur 14 semaines est prêt. On commence cette semaine — chaque sortie compte. Bonne préparation !`

  return (
    <div className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">
      {/* Welcome card */}
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-semibold text-lg text-[#3D2314]">Bonjour {profile.first_name} 👋</h2>
            <p className="text-sm text-[#A07860]">Semaine {weekNumber} sur 14 · {daysLeft} jours avant Vannes-Auray</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-[#C1532B]">{daysLeft}</span>
            <p className="text-xs text-[#A07860]">jours</p>
          </div>
        </div>
        <div className="h-2 bg-[#EEE0D0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C1532B] rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-[#A07860] mt-1">{progressPercent}% du programme accompli</p>
      </Card>

      {/* Coach message */}
      <CoachMessage
        coachName={profile.coach_name}
        content={report?.coach_analysis ?? defaultCoachMessage}
        date={report ? new Date(report.generated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : undefined}
      />

      {/* Weekly stats */}
      <div>
        <h3 className="text-sm font-medium text-[#A07860] mb-3">Cette semaine · {formatWeekRange(weekStart)}</h3>
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-2xl font-bold text-[#3D2314]">{totalKm > 0 ? `${totalKm.toFixed(1)}` : '--'}</p>
            <p className="text-xs text-[#A07860] mt-0.5">km</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-[#3D2314]">{logs.length > 0 ? logs.length : '--'}</p>
            <p className="text-xs text-[#A07860] mt-0.5">sorties</p>
          </Card>
          <Card className="text-center">
            <p className="text-xl font-bold text-[#3D2314]">{totalKm > 0 ? avgPace : '--'}</p>
            <p className="text-xs text-[#A07860] mt-0.5">allure moy.</p>
          </Card>
        </div>
      </div>

      {/* Planned sessions */}
      {program && program.sessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#A07860]">Séances prévues</h3>
            {program.focus && (
              <span className="text-xs bg-[#F5EDE4] text-[#A07860] px-2 py-1 rounded-full">{program.focus}</span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {program.sessions.map((session, i) => (
              <SessionCard key={i} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/dashboard/log"
          className="flex-1 py-3 text-center text-sm font-medium bg-[#C1532B] text-[#FDF8F3] rounded-lg hover:bg-[#a8472a] transition-colors"
        >
          + Saisir une sortie
        </Link>
        <Link
          href="/dashboard/checkin"
          className="flex-1 py-3 text-center text-sm font-medium border border-[#EEE0D0] bg-white text-[#A07860] rounded-lg hover:bg-[#F5EDE4] transition-colors"
        >
          Check-in semaine
        </Link>
      </div>
    </div>
  )
}
