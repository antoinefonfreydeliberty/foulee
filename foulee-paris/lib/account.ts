// Données de « Mon compte » et « Classement » (SERVER-ONLY, service role).

import { createAdminClient } from '@/lib/supabase/admin'
import { STARTING_BALANCE_CENTS } from '@/lib/money'
import type { WagerStatus } from '@/lib/types'

export interface WagerHistoryItem {
  id: string
  marketLabel: string
  selectionLabel: string
  placedAt: string
  stakeCents: number
  odds: number
  status: WagerStatus
  netCents: number | null // gagné: payout-stake ; perdu: -stake ; en attente: null ; annulé: 0
}

export interface AccountData {
  balanceCents: number
  wonCount: number
  lostCount: number
  pendingCount: number
  history: WagerHistoryItem[]
}

export async function loadAccount(bettorId: string, balanceCents: number): Promise<AccountData> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('wagers')
    .select('id, stake_cents, odds_at_placement, potential_payout_cents, status, placed_at, selections(label, markets(label))')
    .eq('bettor_id', bettorId)
    .order('placed_at', { ascending: false })

  let won = 0
  let lost = 0
  let pending = 0
  const history: WagerHistoryItem[] = (data ?? []).map((w) => {
    const status = w.status as WagerStatus
    if (status === 'won') won++
    else if (status === 'lost') lost++
    else if (status === 'pending') pending++

    const stake = w.stake_cents as number
    const payout = w.potential_payout_cents as number
    const net =
      status === 'won' ? payout - stake : status === 'lost' ? -stake : status === 'void' ? 0 : null

    // supabase renvoie les relations imbriquées ; typage souple.
    const sel = w.selections as unknown as { label?: string; markets?: { label?: string } } | null
    return {
      id: w.id as string,
      marketLabel: sel?.markets?.label ?? '—',
      selectionLabel: sel?.label ?? '—',
      placedAt: w.placed_at as string,
      stakeCents: stake,
      odds: Number(w.odds_at_placement),
      status,
      netCents: net,
    }
  })

  return { balanceCents, wonCount: won, lostCount: lost, pendingCount: pending, history }
}

export interface LeaderboardRow {
  bettorId: string
  firstName: string
  gainsCents: number // P&L réalisé (paris réglés uniquement)
  isAdmin: boolean
}

export async function loadLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = createAdminClient()
  const [{ data: bettors }, { data: wagers }] = await Promise.all([
    supabase.from('bettors').select('id, first_name, is_admin'),
    supabase.from('wagers').select('bettor_id, stake_cents, potential_payout_cents, status'),
  ])

  const gains = new Map<string, number>()
  for (const w of wagers ?? []) {
    const status = w.status as WagerStatus
    const stake = w.stake_cents as number
    const payout = w.potential_payout_cents as number
    // P&L réalisé : gagné = +net, perdu = -mise, en attente/annulé = 0 (non réalisé).
    const delta = status === 'won' ? payout - stake : status === 'lost' ? -stake : 0
    gains.set(w.bettor_id as string, (gains.get(w.bettor_id as string) ?? 0) + delta)
  }

  const rows: LeaderboardRow[] = (bettors ?? []).map((b) => ({
    bettorId: b.id as string,
    firstName: b.first_name as string,
    gainsCents: gains.get(b.id as string) ?? 0,
    isAdmin: b.is_admin as boolean,
  }))
  rows.sort((a, b) => b.gainsCents - a.gainsCents || a.firstName.localeCompare(b.firstName))
  return rows
}

// Couleur d'avatar par coureur/parieur connu (repris des tokens de la maquette).
const AVATAR_COLORS: Record<string, string> = {
  antoine: 'var(--av-antoine)',
  hugo: 'var(--av-hugo)',
  remi: 'var(--av-remi)',
  rémi: 'var(--av-remi)',
  alix: 'var(--av-alix)',
}
export function avatarColor(name: string): string {
  return AVATAR_COLORS[name.trim().toLowerCase()] ?? 'var(--gold)'
}
export function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}

export const STARTING = STARTING_BALANCE_CENTS
