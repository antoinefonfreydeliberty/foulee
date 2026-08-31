import { NextResponse } from 'next/server'
import { getCurrentBettor } from '@/lib/auth/current'
import { recomputeOdds } from '@/lib/odds/recompute'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Le Monte Carlo (20 000 tirages) peut durer quelques secondes.
export const maxDuration = 60

// Bouton « recalculer les cotes » du panneau admin.
export async function POST() {
  const admin = await getCurrentBettor()
  if (!admin?.is_admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const summary = await recomputeOdds()
    return NextResponse.json(summary)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
