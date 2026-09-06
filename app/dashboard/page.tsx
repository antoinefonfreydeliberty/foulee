import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CoachMessage } from '@/components/coach/CoachMessage'
import { SessionCard } from '@/components/training/SessionCard'
import RaceDayBilanCard from '@/components/dashboard/RaceDayBilanCard'
import {
  getDaysLeft, getProgramWeek, getProgramWeekStart,
  getProgressPercent, getWeekStart,
} from '@/lib/utils/dates'
import { calcPace } from '@/lib/utils/pace'
import type { TrainingLog, TrainingProgram, WeeklyReport } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
  ])
  if (!profile) redirect('/onboarding')

  const programStart           = process.env.PROGRAM_START_DATE ?? '2026-06-09'
  const weekStart              = getWeekStart()
  const weekNumber             = Math.max(1, getProgramWeek(programStart))
  const currentWeekProgramStart = getProgramWeekStart(programStart, weekNumber)
  const daysLeft               = getDaysLeft()
  const progressPercent        = getProgressPercent(weekNumber)

  const nextWeekDate = new Date(new Date(weekStart).getTime() + 7 * 86400000)

  // Bilan course : la carte s'affiche des le jour de la course (Europe/Paris),
  // et tant qu'aucune sortie n'est enregistree a cette date precise. RACE_DATE
  // est lue depuis l'env (dates.ts hardcode sa propre valeur pour getDaysLeft ;
  // on la relit ici pour rendre l'override de test effectif).
  const raceDate = process.env.RACE_DATE ?? '2026-09-13'
  const todayParis = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())

  const [{ data: currentProgram }, { data: latestReport }, { data: weekLogs }, { data: raceDayLog }] = await Promise.all([
    supabase
      .from('training_programs').select('*')
      .eq('user_id', user.id).eq('week_start', currentWeekProgramStart).maybeSingle(),
    supabase
      .from('weekly_reports').select('*')
      .eq('user_id', user.id).order('generated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from('training_logs').select('*')
      .eq('user_id', user.id)
      .gte('date', weekStart)
      .lt('date', nextWeekDate.toISOString().split('T')[0]),
    supabase
      .from('training_logs').select('id')
      .eq('user_id', user.id).eq('date', raceDate).limit(1).maybeSingle(),
  ])

  const showRaceDayCard = todayParis >= raceDate && !raceDayLog
  const isRaceDay       = todayParis === raceDate  // jour J : presentation en modale bloquante

  const program = currentProgram as TrainingProgram | null
  const report  = latestReport  as WeeklyReport | null
  const logs    = (weekLogs ?? []) as TrainingLog[]

  const totalKm        = logs.reduce((s, l) => s + l.distance_km, 0)
  const totalMin       = logs.reduce((s, l) => s + l.duration_minutes, 0)
  const avgPace        = totalKm > 0 ? calcPace(totalKm, totalMin) : null
  const sessionsTarget = program?.sessions?.length ?? profile.weekly_sessions ?? 2
  const targetKm       = (program as TrainingProgram | null)?.total_volume_km ?? 30

  // Header date
  const today     = new Date()
  const dateLabel = today.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const dateFormatted = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

  // Coach bubble message
  const defaultMsg = `Semaine ${weekNumber} sur 14 · On est parti pour Vannes-Auray. La base, c'est maintenant. 💪`
  const coachMsg   = report?.coach_analysis
    ? report.coach_analysis.replace(/\n+/g, ' ').slice(0, 130)
    : defaultMsg

  return (
    <div style={{ background: '#F4F0EA', minHeight: '100%', paddingTop: 2 }}>

      {/* Header */}
      <div style={{ padding: '2px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#6E5E55', fontSize: 11, margin: '0 0 2px', fontWeight: 500 }}>{dateFormatted}</p>
          <h1 style={{ color: '#160E08', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.8, lineHeight: 1.1 }}>
            Bonjour, {profile.first_name} 👋
          </h1>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: '#C5402C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 800, fontSize: 15, flexShrink: 0,
        }}>
          {profile.first_name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Bilan course : jour J en modale bloquante, jours suivants en carte inline,
          tant qu'aucune seance n'est enregistree a RACE_DATE */}
      {showRaceDayCard && <RaceDayBilanCard raceDate={raceDate} blocking={isRaceDay} />}

      {/* Coach Bubble */}
      <CoachMessage coachName={profile.coach_name} content={coachMsg} />

      {/* Stats 3 colonnes */}
      <div style={{ padding: '0 14px', display: 'flex', gap: 7, marginBottom: 10 }}>
        {/* Jours avant course */}
        <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, padding: '12px 8px', textAlign: 'center', border: '1px solid #DDD7CE' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
            <span style={{ color: '#C5402C', fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{daysLeft}</span>
            <span style={{ color: '#C5402C', fontSize: 12, fontWeight: 700 }}>j</span>
          </div>
          <p style={{ color: '#6E5E55', fontSize: 10, margin: '3px 0 0', fontWeight: 500 }}>avant Vannes</p>
        </div>

        {/* % accompli */}
        <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, padding: '12px 8px', textAlign: 'center', border: '1px solid #DDD7CE' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
            {progressPercent > 0 ? (
              <>
                <span style={{ color: '#6E5E55', fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{progressPercent}</span>
                <span style={{ color: '#6E5E55', fontSize: 12, fontWeight: 700 }}>%</span>
              </>
            ) : (
              <span style={{ color: '#C5BCAF', fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>--</span>
            )}
          </div>
          <p style={{ color: '#6E5E55', fontSize: 10, margin: '3px 0 0', fontWeight: 500 }}>accompli</p>
        </div>

        {/* Séances/semaine */}
        <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, padding: '12px 8px', textAlign: 'center', border: '1px solid #DDD7CE' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
            <span style={{ color: '#2A6B50', fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{sessionsTarget}</span>
            <span style={{ color: '#2A6B50', fontSize: 12, fontWeight: 700 }}>×</span>
          </div>
          <p style={{ color: '#6E5E55', fontSize: 10, margin: '3px 0 0', fontWeight: 500 }}>séances/sem</p>
        </div>
      </div>

      {/* Objectif hebdomadaire */}
      <div style={{ margin: '0 14px 10px', background: '#FFFFFF', borderRadius: 16, padding: '13px 15px', border: '1px solid #DDD7CE' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
          <span style={{ color: '#160E08', fontSize: 13, fontWeight: 700 }}>Objectif hebdomadaire</span>
          <span style={{ color: '#C5402C', fontSize: 13, fontWeight: 700 }}>
            {totalKm > 0 ? totalKm.toFixed(1) : '--'} / {targetKm} km
          </span>
        </div>
        <div style={{ background: '#E3DDD5', borderRadius: 99, height: 7, overflow: 'hidden' }}>
          <div style={{
            background: 'linear-gradient(90deg, #C5402C, rgba(197,64,44,0.53))',
            height: '100%',
            width: totalKm > 0 ? `${Math.min(100, Math.round((totalKm / targetKm) * 100))}%` : '2%',
            borderRadius: 99,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <p style={{ color: '#6E5E55', fontSize: 12, margin: '6px 0 0' }}>
          Programme : 14 semaines · Allure cible 5&apos;41&quot;/km
        </p>
      </div>

      {/* Stats semaine */}
      {logs.length > 0 && (
        <div style={{ padding: '0 14px', display: 'flex', gap: 7, marginBottom: 10 }}>
          <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, padding: '12px 8px', textAlign: 'center', border: '1px solid #DDD7CE' }}>
            <span style={{ color: '#160E08', fontSize: 20, fontWeight: 800, display: 'block' }}>
              {totalKm > 0 ? totalKm.toFixed(1) : '--'}
            </span>
            <p style={{ color: '#6E5E55', fontSize: 10, margin: '3px 0 0', fontWeight: 500 }}>km cette sem.</p>
          </div>
          <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, padding: '12px 8px', textAlign: 'center', border: '1px solid #DDD7CE' }}>
            <span style={{ color: '#160E08', fontSize: 20, fontWeight: 800, display: 'block' }}>
              {logs.length}
            </span>
            <p style={{ color: '#6E5E55', fontSize: 10, margin: '3px 0 0', fontWeight: 500 }}>sortie{logs.length > 1 ? 's' : ''}</p>
          </div>
          <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, padding: '12px 8px', textAlign: 'center', border: '1px solid #DDD7CE' }}>
            <span style={{ color: '#160E08', fontSize: 16, fontWeight: 800, display: 'block' }}>
              {avgPace ?? '--'}
            </span>
            <p style={{ color: '#6E5E55', fontSize: 10, margin: '3px 0 0', fontWeight: 500 }}>allure moy.</p>
          </div>
        </div>
      )}

      {/* Plan de la semaine */}
      {program && program.sessions.length > 0 && (
        <div style={{ padding: '0 14px 16px' }}>
          <p style={{ color: '#160E08', fontSize: 12, fontWeight: 700, margin: '0 0 9px' }}>Plan de la semaine</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {program.sessions.map((session, i) => (
              <SessionCard key={i} session={session} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
