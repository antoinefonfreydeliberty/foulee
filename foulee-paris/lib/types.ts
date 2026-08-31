// Types des tables Supabase de Semi Ca$h (foulee-paris). Montants en centièmes
// de jeton (entiers). Miroir du schéma init_semi_cash_schema.

export type MarketType = 'winner' | 'podium_full' | 'head_to_head' | 'time_bracket' | 'prop'
export type MarketStatus = 'open' | 'closed' | 'settled'
export type WagerStatus = 'pending' | 'won' | 'lost' | 'void'
export type TransactionType = 'grant_initial' | 'stake' | 'payout' | 'adjustment'

export interface Bettor {
  id: string
  first_name: string
  last_name: string | null
  email: string
  pin_hash: string
  balance_cents: number
  is_admin: boolean
  created_at: string
}

export interface Runner {
  id: string
  first_name: string
  goal_time_seconds: number | null
  foulee_first_name: string
}

export interface RunnerStatsSnapshot {
  id: string
  runner_id: string
  computed_at: string
  projected_time_seconds: number | null
  sd_seconds: number | null
  form_score: number | null
  adherence_pct: number | null
  reference_distance_km: number | null
  source_as_of: string | null
}

export interface Market {
  id: string
  key: string
  label: string
  type: MarketType
  status: MarketStatus
  closes_at: string | null
}

export interface Selection {
  id: string
  market_id: string
  label: string
  runner_id: string | null
  meta: Record<string, unknown> | null
}

export interface Odds {
  id: string
  selection_id: string
  decimal_odds: number
  computed_at: string
}

export interface Wager {
  id: string
  bettor_id: string
  selection_id: string
  stake_cents: number
  odds_at_placement: number
  potential_payout_cents: number
  status: WagerStatus
  placed_at: string
}

export interface Transaction {
  id: string
  bettor_id: string
  type: TransactionType
  amount_cents: number
  balance_after_cents: number
  created_at: string
  related_wager_id: string | null
}

export interface Settlement {
  id: string
  market_id: string
  settled_at: string
  winning_selection_ids: string[]
  official_results: Record<string, unknown> | null
}
