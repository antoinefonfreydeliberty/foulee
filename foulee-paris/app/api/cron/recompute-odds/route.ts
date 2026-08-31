import { NextRequest, NextResponse } from 'next/server'
import { recomputeOdds, closeMarketsIfDue, betsClosed } from '@/lib/odds/recompute'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Cron (Cloudflare / plateforme) : recalcul des cotes toutes les 6 h, et fermeture
// automatique des marchés au 12/09/2026 minuit Europe/Paris (BETS_CLOSE_AT).
// Protégé par ODDS_CRON_SECRET (fail-closed si non configuré).
export async function POST(req: NextRequest) {
  const secret = process.env.ODDS_CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1) Fermeture si la date de coupure est passée.
    const close = await closeMarketsIfDue()
    if (close.due) {
      // Fenêtre fermée : on ne recalcule plus (dernières cotes gelées).
      return NextResponse.json({ ok: true, phase: 'closed', marketsClosed: close.closed })
    }

    // 2) Sinon, recalcul normal des cotes.
    const summary = await recomputeOdds()
    return NextResponse.json({ phase: 'open', betsClosed: betsClosed(), ...summary })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// GET autorisé aussi (certaines plateformes de cron n'émettent que des GET).
export async function GET(req: NextRequest) {
  return POST(req)
}
