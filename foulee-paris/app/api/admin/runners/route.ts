import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentBettor } from '@/lib/auth/current'
import type { Runner } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getCurrentBettor()
  if (!admin?.is_admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('runners')
    .select('*')
    .order('first_name', { ascending: true })

  return NextResponse.json({ runners: (data ?? []) as Runner[] })
}

// Saisie manuelle du temps objectif (en secondes) d'un coureur.
export async function PATCH(req: NextRequest) {
  const admin = await getCurrentBettor()
  if (!admin?.is_admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const runnerId = typeof body?.runnerId === 'string' ? body.runnerId : ''
  const raw = body?.goalTimeSeconds
  const goalTimeSeconds =
    raw === null ? null : Number.isInteger(raw) && raw > 0 && raw < 86_400 ? raw : undefined

  if (!runnerId || goalTimeSeconds === undefined) {
    return NextResponse.json({ error: 'runnerId et goalTimeSeconds (int > 0) requis' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('runners')
    .update({ goal_time_seconds: goalTimeSeconds })
    .eq('id', runnerId)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Coureur introuvable' }, { status: 404 })
  }

  return NextResponse.json({ runner: data as Runner })
}
