import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, onboarding_completed')
    .eq('user_id', user.id)
    .single()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  return (
    <div className="flex flex-col min-h-screen">
      <Header firstName={profile.first_name} />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}
