import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getProgramWeek, getWeekStart, getWeekEnd, getProgressPercent, getDaysLeft } from '@/lib/utils/dates'
import { calcPace } from '@/lib/utils/pace'

type ProfileRow = { user_id: string; first_name: string }
type LogRow = { user_id: string; distance_km: number; duration_minutes: number }

export default async function GroupePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const programStart = process.env.PROGRAM_START_DATE ?? '2026-06-09'
  const weekNumber = Math.max(1, getProgramWeek(programStart))
  const weekStart = getWeekStart()
  const weekEnd = getWeekEnd(weekStart)
  const daysLeft = getDaysLeft()

  const [profilesResult, logsResult] = await Promise.all([
    admin
      .from('profiles')
      .select('user_id, first_name')
      .eq('onboarding_completed', true),
    admin
      .from('training_logs')
      .select('user_id, distance_km, duration_minutes')
      .gte('date', weekStart)
      .lte('date', weekEnd),
  ])

  const profiles = ((profilesResult.data ?? []) as ProfileRow[])
  const logs = ((logsResult.data ?? []) as LogRow[])

  const groupData = profiles
    .map(profile => {
      const userLogs = logs.filter(l => l.user_id === profile.user_id)
      const totalKm = userLogs.reduce((sum, l) => sum + Number(l.distance_km), 0)
      const totalMin = userLogs.reduce((sum, l) => sum + l.duration_minutes, 0)
      const sessionsCount = userLogs.length
      const avgPace = totalKm > 0 && totalMin > 0 ? calcPace(totalKm, totalMin) : null

      return {
        firstName: profile.first_name,
        km: totalKm,
        sessions: sessionsCount,
        avgPace,
        isCurrentUser: profile.user_id === user.id,
      }
    })
    .sort((a, b) => b.km - a.km)

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#3D2314' }}>
          Le groupe · Semaine {weekNumber}
        </h1>
        <p style={{ fontSize: 13, color: '#A07860', marginTop: 2 }}>
          {daysLeft} jours avant Vannes-Auray
        </p>
      </div>

      {groupData.map((runner, i) => (
        <div key={runner.firstName} style={{
          background: runner.isCurrentUser ? '#FDF2EE' : 'white',
          border: `0.5px solid ${runner.isCurrentUser ? '#C1532B' : '#EEE0D0'}`,
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            backgroundColor: '#E8A44A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3D2314', fontWeight: 700, fontSize: 16, flexShrink: 0,
          }}>
            {runner.firstName.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: '#3D2314', fontSize: 15 }}>
                {runner.firstName}
              </span>
              {runner.isCurrentUser && (
                <span style={{ fontSize: 11, color: '#A07860' }}>· Toi</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#A07860', marginBottom: 8 }}>
              {runner.km > 0 ? `${runner.km.toFixed(1)} km` : '--'} ·{' '}
              {runner.sessions > 0
                ? `${runner.sessions} sortie${runner.sessions > 1 ? 's' : ''}`
                : 'Aucune sortie'}
              {runner.avgPace ? ` · ${runner.avgPace}/km` : ''}
            </div>
            <div style={{ backgroundColor: '#EEE0D0', borderRadius: 99, height: 4 }}>
              <div style={{
                backgroundColor: runner.isCurrentUser ? '#C1532B' : '#D4845A',
                borderRadius: 99,
                height: 4,
                width: `${getProgressPercent(weekNumber)}%`,
              }} />
            </div>
          </div>

          {runner.km > 0 && (
            <span style={{ fontSize: 20, flexShrink: 0 }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}
            </span>
          )}
        </div>
      ))}

      {groupData.length === 0 && (
        <p style={{ textAlign: 'center', color: '#A07860', fontSize: 14, padding: '32px 20px' }}>
          Aucun coureur inscrit pour le moment.
        </p>
      )}

      <p style={{ fontSize: 11, color: '#A07860', textAlign: 'center', marginTop: 8 }}>
        Seuls les km, sorties et allure sont partagés. Les bilans et conversations restent privés.
      </p>

    </div>
  )
}
