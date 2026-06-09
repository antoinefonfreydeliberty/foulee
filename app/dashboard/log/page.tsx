import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogForm from '@/components/training/LogForm'

export default async function LogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  return <LogForm firstName={profile.first_name} />
}
