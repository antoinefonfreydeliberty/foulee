import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RapportItem } from './RapportItem'

export default async function RapportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: reports }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, coach_name')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('weekly_reports')
      .select('id, week_number, week_start, coach_analysis, stats, generated_at')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false }),
  ])

  if (!profile) redirect('/onboarding')

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#3D2314' }}>Mes bilans</h1>
        <p style={{ fontSize: 13, color: '#A07860', marginTop: 2 }}>
          {reports?.length ?? 0} bilan{(reports?.length ?? 0) > 1 ? 's' : ''} enregistré{(reports?.length ?? 0) > 1 ? 's' : ''}
        </p>
      </div>

      {!reports || reports.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          color: '#A07860', fontSize: 14,
        }}>
          <p>Ton premier bilan arrivera dimanche soir.</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            {profile.coach_name} t&apos;enverra un email chaque semaine.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reports.map(report => (
            <RapportItem key={report.id} report={report} coachName={profile.coach_name} />
          ))}
        </div>
      )}

    </div>
  )
}
