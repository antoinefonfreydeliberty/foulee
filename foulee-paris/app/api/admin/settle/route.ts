import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentBettor } from '@/lib/auth/current'
import { loadBoard } from '@/lib/markets'
import { fetchRunnerStats, type FouleeRunner } from '@/lib/odds/foulee'
import { computeWinningSelections, type OfficialResults } from '@/lib/odds/settle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Règlement admin : saisie des résultats officiels (temps + DNF) → calcul des
// sélections gagnantes → application idempotente via settle_market (pas de double
// crédit). Les marchés déterministes sont réglés depuis les données finales Foulée.
export async function POST(req: NextRequest) {
  const admin = await getCurrentBettor()
  if (!admin?.is_admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const rawResults = body?.results
  if (!rawResults || typeof rawResults !== 'object') {
    return NextResponse.json({ error: 'results requis (par prénom : { seconds, dnf })' }, { status: 400 })
  }

  // Normalise les résultats.
  const results: OfficialResults = {}
  for (const [name, val] of Object.entries(rawResults as Record<string, { seconds?: unknown; dnf?: unknown }>)) {
    const dnf = val?.dnf === true
    const secs = typeof val?.seconds === 'number' && Number.isFinite(val.seconds) && val.seconds > 0 ? Math.round(val.seconds) : null
    results[name] = { seconds: dnf ? null : secs, dnf: dnf || secs == null }
  }

  const board = await loadBoard()

  // Données finales pour les marchés déterministes (best effort).
  let statsRunners: FouleeRunner[] = []
  const warnings: string[] = []
  let deterministicSettled = true
  try {
    const stats = await fetchRunnerStats()
    statsRunners = stats.runners
  } catch (e) {
    deterministicSettled = false
    warnings.push(
      `Stats Foulée indisponibles (${e instanceof Error ? e.message : 'erreur'}) : marchés déterministes NON réglés (à relancer).`
    )
  }

  const winning = computeWinningSelections(board, results, statsRunners)
  const supabase = createAdminClient()

  const perMarket: { key: string; label: string; alreadySettled?: boolean; won?: number; lost?: number; payoutCents?: number; skipped?: boolean }[] = []
  let totalPayout = 0

  for (const m of board) {
    if (m.status === 'settled') {
      perMarket.push({ key: m.key, label: m.label, alreadySettled: true })
      continue
    }
    // Sans données finales, on ne règle pas les marchés déterministes maintenant.
    const isDeterministic = m.type === 'prop' && !m.key.startsWith('objectif_')
    if (isDeterministic && !deterministicSettled) {
      perMarket.push({ key: m.key, label: m.label, skipped: true })
      continue
    }

    const ids = winning.get(m.id) ?? []
    const { data, error } = await supabase.rpc('settle_market', {
      p_market_id: m.id,
      p_winning_selection_ids: ids,
      p_official_results: results,
    })
    if (error) {
      return NextResponse.json({ error: `Règlement ${m.key}: ${error.message}` }, { status: 500 })
    }
    const row = Array.isArray(data) ? data[0] : data
    if (row?.already_settled) {
      perMarket.push({ key: m.key, label: m.label, alreadySettled: true })
    } else {
      const payout = Number(row?.payout_total_cents ?? 0)
      totalPayout += payout
      perMarket.push({ key: m.key, label: m.label, won: row?.won_count ?? 0, lost: row?.lost_count ?? 0, payoutCents: payout })
    }
  }

  return NextResponse.json({ ok: true, totalPayoutCents: totalPayout, markets: perMarket, warnings })
}
