// Calcul des sélections gagnantes à partir des résultats officiels (temps + ordre)
// pour les marchés Monte Carlo, et des données d'entraînement finales pour les
// marchés déterministes. PUR sauf le fetch runner-stats (fait par l'appelant).

import type { BoardMarket } from '@/lib/markets'
import type { FouleeRunner } from './foulee'
import { deterministicMetrics, deterministicWinner, type DeterministicMetrics } from './catalog'

export interface OfficialResult {
  seconds: number | null // temps d'arrivée en secondes ; null si DNF
  dnf: boolean
}
export type OfficialResults = Record<string, OfficialResult> // clé = prénom du coureur

/** Ordre d'arrivée réel : finishers triés par temps croissant (DNF exclus). */
export function realFinishOrder(results: OfficialResults): string[] {
  return Object.entries(results)
    .filter(([, r]) => !r.dnf && r.seconds != null)
    .sort((a, b) => (a[1].seconds as number) - (b[1].seconds as number))
    .map(([name]) => name)
}

function bracketContains(meta: Record<string, unknown> | null, seconds: number): boolean {
  const lo = Number(meta?.lo ?? 0)
  const hiRaw = meta?.hi
  const hi = hiRaw == null ? Infinity : Number(hiRaw)
  return seconds >= lo && seconds < hi
}

/**
 * Renvoie, par marché, la liste des selection ids gagnants.
 * `statsRunners` sert uniquement aux marchés déterministes (données finales).
 */
export function computeWinningSelections(
  board: BoardMarket[],
  results: OfficialResults,
  statsRunners: FouleeRunner[]
): Map<string, string[]> {
  const winners = new Map<string, string[]>()
  const finishOrder = realFinishOrder(results)
  const fastest = finishOrder[0] ?? null

  // Métriques déterministes (données finales).
  const names = board
    .flatMap((m) => m.selections.map((s) => s.runner_first_name))
    .filter((n): n is string => !!n)
  const uniqueNames = [...new Set(names)]
  const metrics = new Map<string, DeterministicMetrics>()
  for (const r of statsRunners) metrics.set(r.first_name, deterministicMetrics(r))

  const bySel = (m: BoardMarket, pred: (s: BoardMarket['selections'][number]) => boolean) =>
    m.selections.filter(pred).map((s) => s.id)

  for (const m of board) {
    let ids: string[] = []

    if (m.type === 'winner') {
      if (fastest) ids = bySel(m, (s) => s.runner_first_name === fastest)
    } else if (m.type === 'podium_full') {
      // La sélection dont meta.order == ordre réel complet.
      ids = bySel(m, (s) => {
        const order = (s.meta?.order as string[]) ?? []
        return order.length === finishOrder.length && order.every((n, i) => n === finishOrder[i])
      })
    } else if (m.type === 'head_to_head') {
      const pair = m.selections.map((s) => s.runner_first_name as string)
      const [a, b] = pair
      const ra = results[a]
      const rb = results[b]
      let win: string | null = null
      const aFin = ra && !ra.dnf && ra.seconds != null
      const bFin = rb && !rb.dnf && rb.seconds != null
      if (aFin && bFin) win = (ra.seconds as number) <= (rb.seconds as number) ? a : b
      else if (aFin) win = a
      else if (bFin) win = b
      if (win) ids = bySel(m, (s) => s.runner_first_name === win)
    } else if (m.type === 'time_bracket') {
      const runner = m.selections[0]?.runner_first_name
      const r = runner ? results[runner] : undefined
      if (r && !r.dnf && r.seconds != null) {
        ids = bySel(m, (s) => bracketContains(s.meta, r.seconds as number))
      }
    } else if (m.type === 'prop' && m.key.startsWith('objectif_')) {
      const runner = m.selections[0]?.runner_first_name
      const goal = Number(m.selections[0]?.meta?.goal ?? NaN)
      const r = runner ? results[runner] : undefined
      const beat = r && !r.dnf && r.seconds != null && Number.isFinite(goal) && (r.seconds as number) < goal
      const side = beat ? 'yes' : 'no'
      ids = bySel(m, (s) => (s.meta?.side as string) === side)
    } else if (m.type === 'prop') {
      // Déterministe : gagnant = meilleur métrique (données finales).
      const winnerName = deterministicWinner(m.key, uniqueNames, metrics)
      if (winnerName) ids = bySel(m, (s) => s.runner_first_name === winnerName)
    }

    winners.set(m.id, ids)
  }

  return winners
}
