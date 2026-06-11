import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckinStepper from '@/components/checkin/CheckinStepper'
import { getProgramWeek, getProgramWeekStart } from '@/lib/utils/dates'

export default async function CheckinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, coach_name, coach_style')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const programStart = process.env.PROGRAM_START_DATE ?? '2026-06-09'
  const weekNumber = getProgramWeek(programStart)
  const weekStart = getProgramWeekStart(programStart, weekNumber)

  return (
    <CheckinStepper
      firstName={profile.first_name}
      coachName={profile.coach_name}
      coachStyle={profile.coach_style}
      weekStart={weekStart}
    />
  )
}
