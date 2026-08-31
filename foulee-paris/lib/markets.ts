// Lecture du « tableau des paris » : marchés + sélections + cote courante.
// SERVER-ONLY (service role). RLS deny-all : aucun accès direct client.

import { createAdminClient } from '@/lib/supabase/admin'
import type { MarketType, MarketStatus } from '@/lib/types'

export interface BoardSelection {
  id: string
  label: string
  runner_first_name: string | null
  sel_key: string | null
  odds: number | null // cote courante (null si pas encore calculée)
  meta: Record<string, unknown> | null
}
export interface BoardMarket {
  id: string
  key: string
  label: string
  type: MarketType
  status: MarketStatus
  closes_at: string | null
  category: BoardCategory
  selections: BoardSelection[]
}

export type BoardCategory = 'winner' | 'head_to_head' | 'time_bracket' | 'prop' | 'podium'

// Ordre d'affichage des marchés (fidèle à la maquette : vainqueur en tête).
const TYPE_ORDER: Record<MarketType, number> = {
  winner: 0,
  head_to_head: 1,
  time_bracket: 2,
  prop: 3,
  podium_full: 4,
}

export function marketCategory(type: MarketType): BoardCategory {
  if (type === 'podium_full') return 'podium'
  return type as BoardCategory
}

export async function loadBoard(): Promise<BoardMarket[]> {
  const supabase = createAdminClient()

  const [{ data: markets }, { data: selections }, { data: odds }, { data: runners }] = await Promise.all([
    supabase.from('markets').select('id, key, label, type, status, closes_at'),
    supabase.from('selections').select('id, market_id, label, runner_id, meta'),
    supabase.from('current_odds').select('selection_id, decimal_odds'),
    supabase.from('runners').select('id, first_name'),
  ])

  const oddsBySelection = new Map<string, number>()
  for (const o of odds ?? []) oddsBySelection.set(o.selection_id as string, Number(o.decimal_odds))
  const runnerNameById = new Map<string, string>()
  for (const r of runners ?? []) runnerNameById.set(r.id as string, r.first_name as string)

  const selByMarket = new Map<string, BoardSelection[]>()
  for (const s of selections ?? []) {
    const meta = (s.meta as Record<string, unknown> | null) ?? null
    const arr = selByMarket.get(s.market_id as string) ?? []
    arr.push({
      id: s.id as string,
      label: s.label as string,
      runner_first_name: s.runner_id ? runnerNameById.get(s.runner_id as string) ?? null : null,
      sel_key: (meta?.sel_key as string) ?? null,
      odds: oddsBySelection.get(s.id as string) ?? null,
      meta,
    })
    selByMarket.set(s.market_id as string, arr)
  }

  const board: BoardMarket[] = (markets ?? []).map((m) => {
    const type = m.type as MarketType
    const sels = selByMarket.get(m.id as string) ?? []
    // Tri des sélections : par cote croissante (favori en tête), null en dernier.
    sels.sort((a, b) => (a.odds ?? Infinity) - (b.odds ?? Infinity))
    return {
      id: m.id as string,
      key: m.key as string,
      label: m.label as string,
      type,
      status: m.status as MarketStatus,
      closes_at: (m.closes_at as string) ?? null,
      category: marketCategory(type),
      selections: sels,
    }
  })

  board.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.label.localeCompare(b.label))
  return board
}
