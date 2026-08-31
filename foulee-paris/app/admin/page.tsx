import { requireAdmin } from '@/lib/auth/current'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Runner } from '@/lib/types'
import { AdminClient, type AdminBettor } from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  const [{ data: bettors }, { data: runners }] = await Promise.all([
    supabase
      .from('bettors')
      .select('id, first_name, last_name, email, balance_cents, is_admin, created_at')
      .order('created_at', { ascending: true }),
    supabase.from('runners').select('*').order('first_name', { ascending: true }),
  ])

  return (
    <AdminClient
      initialBettors={(bettors ?? []) as AdminBettor[]}
      initialRunners={(runners ?? []) as Runner[]}
    />
  )
}
