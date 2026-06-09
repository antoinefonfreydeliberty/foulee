import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConversationClient from '@/components/conversation/ConversationClient'

export default async function ConversationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, historyResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, coach_name, coach_style')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('coach_conversations')
      .select('role, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50),
  ])

  if (!profileResult.data) redirect('/onboarding')

  return (
    <ConversationClient
      firstName={profileResult.data.first_name}
      coachName={profileResult.data.coach_name}
      coachStyle={profileResult.data.coach_style}
      initialHistory={historyResult.data ?? []}
    />
  )
}
