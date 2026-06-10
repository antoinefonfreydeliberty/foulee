import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RapportItem } from './RapportItem'

type Stats = { distance?: number; sessions?: number; avg_pace?: string }

export default async function RapportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: reports }] = await Promise.all([
    supabase
      .from('profiles').select('first_name, coach_name').eq('user_id', user.id).single(),
    supabase
      .from('weekly_reports')
      .select('id, week_number, week_start, coach_analysis, stats, generated_at')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false }),
  ])

  if (!profile) redirect('/onboarding')

  const reportList = reports ?? []

  // Compute hero stat: total distance across all reports
  const totalDistanceAllTime = reportList.reduce((sum, r) => {
    const s = r.stats as Stats | null
    return sum + (s?.distance ?? 0)
  }, 0)

  // Bar chart: last 6 weeks
  const chartWeeks = [...reportList]
    .sort((a, b) => a.week_number - b.week_number)
    .slice(-6)
    .map(r => ({
      label:   `S${r.week_number}`,
      value:   (r.stats as Stats | null)?.distance ?? 0,
      current: r.week_number === reportList[0]?.week_number,
    }))

  const chartMax = Math.max(...chartWeeks.map(w => w.value), 1)

  return (
    <div style={{ background: '#F4F0EA', minHeight: '100%', paddingTop: 2 }}>

      {/* Header */}
      <div style={{ padding: '2px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#160E08', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.8 }}>
            Rapports
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['Sem.', 'Mois', 'Saison'].map((p, i) => (
            <div key={p} style={{
              padding: '5px 9px', borderRadius: 99, fontSize: 10, fontWeight: 600,
              background: i === 1 ? '#C5402C' : '#EDE8E1',
              color:      i === 1 ? 'white'   : '#6E5E55',
              cursor: 'pointer',
            }}>
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Hero metric */}
      <div style={{ margin: '0 14px 10px', background: '#FFFFFF', borderRadius: 18, padding: '18px', border: '1px solid #DDD7CE' }}>
        <p style={{ color: '#6E5E55', fontSize: 10, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          Distance totale
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ color: '#160E08', fontSize: 48, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
            {totalDistanceAllTime > 0 ? totalDistanceAllTime.toFixed(1) : '--'}
          </span>
          {totalDistanceAllTime > 0 && (
            <span style={{ color: '#6E5E55', fontSize: 18, fontWeight: 600, marginBottom: 5 }}>km</span>
          )}
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: 'rgba(42,107,80,0.10)', color: '#2A6B50',
            fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 700,
          }}>
            {reportList.length > 0
              ? `${reportList.length} semaine${reportList.length > 1 ? 's' : ''} de programme`
              : 'Programme en cours'}
          </span>
          <span style={{ color: '#6E5E55', fontSize: 11 }}>
            {reportList.length > 0
              ? `${reportList.reduce((s, r) => s + ((r.stats as Stats | null)?.sessions ?? 0), 0)} sortie${reportList.reduce((s, r) => s + ((r.stats as Stats | null)?.sessions ?? 0), 0) > 1 ? 's' : ''}`
              : ''}
          </span>
        </div>
      </div>

      {/* Bar chart km/semaine */}
      {chartWeeks.length > 0 && (
        <div style={{ margin: '0 14px 10px', background: '#FFFFFF', borderRadius: 16, padding: '14px 16px', border: '1px solid #DDD7CE' }}>
          <p style={{ color: '#160E08', fontSize: 12, fontWeight: 700, margin: '0 0 14px' }}>
            Km / semaine · Programme 14 sem.
          </p>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 90 }}>
            {chartWeeks.map((w, i) => {
              const barH = w.value > 0 ? Math.max(Math.round((w.value / chartMax) * 70), 4) : 4
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ color: w.current ? '#C5402C' : '#C5BCAF', fontSize: 9, fontWeight: w.current ? 700 : 400 }}>
                    {w.value > 0 ? w.value.toFixed(0) : '·'}
                  </span>
                  <div style={{
                    width: '100%', height: barH,
                    background: w.current
                      ? 'linear-gradient(180deg, #C5402C, rgba(197,64,44,0.33))'
                      : '#EDE8E1',
                    borderRadius: '4px 4px 2px 2px',
                    border: `1px solid ${w.current ? 'rgba(197,64,44,0.33)' : '#DDD7CE'}`,
                  }} />
                  <span style={{ color: '#C5BCAF', fontSize: 9 }}>{w.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Liste bilans */}
      <div style={{ padding: '0 14px 20px' }}>
        <p style={{ color: '#160E08', fontSize: 12, fontWeight: 700, margin: '0 0 9px' }}>
          Bilans hebdomadaires
        </p>

        {reportList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#C5BCAF', fontSize: 14 }}>
            <p>Ton premier bilan arrivera dimanche soir.</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>
              {profile.coach_name} t&apos;enverra un email chaque semaine.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reportList.map(report => (
              <RapportItem key={report.id} report={report} coachName={profile.coach_name} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
