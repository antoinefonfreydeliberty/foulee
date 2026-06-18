import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getProgramWeek, getProgramWeekStart, getWeekEnd, getDaysLeft } from '@/lib/utils/dates'
import { calcPace } from '@/lib/utils/pace'

type ProfileRow = { user_id: string; first_name: string }
type LogRow     = { user_id: string; distance_km: number; duration_minutes: number }

export default async function GroupePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const programStart = process.env.PROGRAM_START_DATE ?? '2026-06-09'
  const weekNumber   = Math.max(1, getProgramWeek(programStart))
  const weekStart    = getProgramWeekStart(programStart, weekNumber)
  const weekEnd      = getWeekEnd(weekStart)
  const daysLeft     = getDaysLeft()

  const [profilesResult, logsResult, programsResult] = await Promise.all([
    admin.from('profiles').select('user_id, first_name').eq('onboarding_completed', true),
    admin.from('training_logs').select('user_id, distance_km, duration_minutes').gte('date', weekStart).lte('date', weekEnd),
    admin.from('training_programs').select('total_volume_km').eq('week_start', weekStart),
  ])

  const programs = (programsResult.data ?? []) as Array<{ total_volume_km: string | number | null }>
  const CHALLENGE_GOAL_KM = Math.max(
    programs.reduce((sum, p) => sum + Number(p.total_volume_km ?? 0), 0),
    1
  )

  const profiles = ((profilesResult.data ?? []) as ProfileRow[])
  const logs     = ((logsResult.data ?? []) as LogRow[])

  const groupData = profiles
    .map(profile => {
      const userLogs   = logs.filter(l => l.user_id === profile.user_id)
      const totalKm    = userLogs.reduce((sum, l) => sum + Number(l.distance_km), 0)
      const totalMin   = userLogs.reduce((sum, l) => sum + l.duration_minutes, 0)
      const avgPace    = totalKm > 0 && totalMin > 0 ? calcPace(totalKm, totalMin) : null
      return {
        firstName:     profile.first_name,
        km:            totalKm,
        sessions:      userLogs.length,
        avgPace,
        isCurrentUser: profile.user_id === user.id,
      }
    })
    .sort((a, b) => b.km - a.km)

  const groupTotalKm   = groupData.reduce((s, m) => s + m.km, 0)
  const challengePct   = Math.min(100, Math.round((groupTotalKm / CHALLENGE_GOAL_KM) * 100))
  const daysInWeek     = 7
  const dayOfWeek      = new Date().getDay()
  const daysRemaining  = dayOfWeek === 0 ? 0 : 7 - dayOfWeek

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={{ background: '#F4F0EA', minHeight: '100%', paddingTop: 2 }}>

      {/* Header */}
      <div style={{ padding: '2px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#160E08', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.8 }}>
          Groupe
        </h1>
        <span style={{
          background: 'rgba(197,64,44,0.10)', color: '#C5402C',
          fontSize: 11, padding: '4px 10px', borderRadius: 99, fontWeight: 700,
        }}>
          {profiles.length} membre{profiles.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Card défi collectif */}
      <div style={{
        margin: '0 14px 12px',
        background: 'linear-gradient(140deg, #C5402C, rgba(197,64,44,0.80))',
        borderRadius: 18, padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: 10, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              Défi collectif · Sem. {weekNumber}
            </p>
            <p style={{ color: 'white', fontSize: 17, fontWeight: 800, margin: 0 }}>
              {CHALLENGE_GOAL_KM} km en équipe
            </p>
          </div>
          <span style={{ fontSize: 26 }}>🏆</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 99, height: 6, marginBottom: 6, overflow: 'hidden' }}>
          <div style={{ background: 'white', height: '100%', width: `${challengePct}%`, borderRadius: 99, transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.90)', fontSize: 12, fontWeight: 600 }}>
            {groupTotalKm > 0 ? groupTotalKm.toFixed(1) : '--'} / {CHALLENGE_GOAL_KM} km
          </span>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
            {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Classement */}
      <div style={{ padding: '0 14px 20px' }}>
        <p style={{ color: '#160E08', fontSize: 12, fontWeight: 700, margin: '0 0 9px' }}>
          Classement · Cette semaine
        </p>

        {groupData.map((runner, i) => (
          <div
            key={runner.firstName}
            style={{
              background: runner.isCurrentUser ? 'rgba(197,64,44,0.10)' : '#FFFFFF',
              border: `1px solid ${runner.isCurrentUser ? '#C5402C' : '#DDD7CE'}`,
              borderRadius: 13, padding: '10px 13px', marginBottom: 7,
              display: 'flex', alignItems: 'center', gap: 9,
            }}
          >
            <span style={{ fontSize: 14, width: 22, textAlign: 'center', flexShrink: 0 }}>
              {i < 3 && runner.km > 0 ? medals[i] : (i + 1).toString()}
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: runner.isCurrentUser ? '#C5402C' : '#EDE8E1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: runner.isCurrentUser ? 'white' : '#160E08',
              fontSize: 12, fontWeight: 800, flexShrink: 0,
            }}>
              {runner.firstName.charAt(0).toUpperCase()}
            </div>
            <span style={{ flex: 1, color: '#160E08', fontSize: 12, fontWeight: runner.isCurrentUser ? 700 : 500 }}>
              {runner.firstName}{runner.isCurrentUser ? ' (moi)' : ''}
            </span>
            <span style={{ color: runner.isCurrentUser ? '#C5402C' : '#160E08', fontSize: 13, fontWeight: 800 }}>
              {runner.km > 0 ? `${runner.km.toFixed(1)} km` : '--'}
            </span>
          </div>
        ))}

        {groupData.length === 0 && (
          <p style={{ textAlign: 'center', color: '#C5BCAF', fontSize: 14, padding: '32px 0' }}>
            Aucun coureur inscrit pour le moment.
          </p>
        )}

        <p style={{ fontSize: 11, color: '#C5BCAF', textAlign: 'center', marginTop: 8 }}>
          Seuls les km, sorties et allure sont partagés.
        </p>
      </div>

    </div>
  )
}
