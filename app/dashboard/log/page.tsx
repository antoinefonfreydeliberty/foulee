import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogForm from '@/components/training/LogForm'
import type { TrainingLog } from '@/types'

export default async function LogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, logsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('training_logs')
      .select('id, date, distance_km, duration_minutes, pace_per_km, feeling, pain_notes')
      .eq('user_id', user.id)
      .order('date', { ascending: false }),
  ])

  if (!profileResult.data) redirect('/onboarding')

  return (
    <LogForm
      firstName={profileResult.data.first_name}
      logs={(logsResult.data ?? []) as TrainingLog[]}
    />
  )
}
