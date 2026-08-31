// Catalogue de marchés + calcul des cotes par sélection (pur, sans I/O).
// Le catalogue est un « blueprint » stable : chaque sélection porte un `sel_key`
// stable dans son marché, ce qui permet, à chaque recalcul, de retrouver la
// sélection en base et d'y AJOUTER une nouvelle ligne `odds` (jamais d'update).

import type { MarketType } from '@/lib/types'
import type { FouleeRunner } from './foulee'
import {
  buildRunnerModel,
  computeFormFactors,
  probToOdds,
  runMonteCarlo,
  type RunnerModel,
  type SimulationResult,
  type TimeBracket,
} from './engine'

// Tranches de temps (secondes). Spec : 4 tranches. hi = null → ouvert (+∞).
export const TIME_BRACKETS: { label: string; lo: number; hi: number | null }[] = [
  { label: '< 1h45', lo: 0, hi: 6300 },
  { label: '1h45–2h00', lo: 6300, hi: 7200 },
  { label: '2h00–2h15', lo: 7200, hi: 8100 },
  { label: '> 2h15', lo: 8100, hi: null },
]

export function bracketsForSim(): TimeBracket[] {
  return TIME_BRACKETS.map((b) => [b.lo, b.hi ?? Infinity] as TimeBracket)
}

// Cotes fixes des marchés déterministes, par rang (spec : « cote fixe simple selon
// le classement »). Rang 1 = favori actuel. Valeurs documentées, non issues du
// Monte Carlo.
export const DETERMINISTIC_ODDS_LADDER = [1.6, 2.75, 4.5, 8.0]

// ---------------------------------------------------------------------------
// Blueprint
// ---------------------------------------------------------------------------
export interface SelectionBlueprint {
  sel_key: string
  label: string
  runner_first_name: string | null // null = sélection composite (ex. ordre complet)
  meta: Record<string, unknown>
}
export interface MarketBlueprint {
  key: string
  label: string
  type: MarketType
  selections: SelectionBlueprint[]
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // retire les accents (é → e, etc.)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

/** Toutes les permutations d'un tableau (n! — ici 24 pour 4 coureurs). */
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest)) out.push([arr[i], ...p])
  }
  return out
}

/** Paires non ordonnées (6 pour 4 coureurs), triées alphabétiquement. */
export function unorderedPairs(names: string[]): [string, string][] {
  const sorted = [...names].sort()
  const pairs: [string, string][] = []
  for (let i = 0; i < sorted.length; i++)
    for (let j = i + 1; j < sorted.length; j++) pairs.push([sorted[i], sorted[j]])
  return pairs
}

/**
 * Construit le blueprint complet des marchés à partir de la liste des coureurs.
 * `goals` : map prénom → objectif en secondes (ou null). Les marchés « objectif »
 * ne sont créés que pour les coureurs ayant un objectif renseigné.
 */
export function buildCatalog(
  runnerNames: string[],
  goals: Map<string, number | null>
): MarketBlueprint[] {
  const names = [...runnerNames]
  const markets: MarketBlueprint[] = []

  // 1) Vainqueur
  markets.push({
    key: 'vainqueur',
    label: 'Vainqueur du groupe',
    type: 'winner',
    selections: names.map((n) => ({
      sel_key: norm(n),
      label: n,
      runner_first_name: n,
      meta: {},
    })),
  })

  // 2) Classement complet (24 permutations)
  markets.push({
    key: 'classement',
    label: 'Classement complet',
    type: 'podium_full',
    selections: permutations(names).map((order) => ({
      sel_key: order.map(norm).join('-'),
      label: order.join(' › '),
      runner_first_name: null,
      meta: { order },
    })),
  })

  // 3) Face à face (6 marchés, 2 sélections)
  for (const [a, b] of unorderedPairs(names)) {
    markets.push({
      key: `duel_${norm(a)}_${norm(b)}`,
      label: `Face-à-face · ${a} vs ${b}`,
      type: 'head_to_head',
      selections: [a, b].map((n) => ({
        sel_key: norm(n),
        label: n,
        runner_first_name: n,
        meta: { pair: [a, b] },
      })),
    })
  }

  // 4) Temps d'arrivée (1 marché par coureur, 4 tranches)
  for (const n of names) {
    markets.push({
      key: `temps_${norm(n)}`,
      label: `Temps d'arrivée · ${n}`,
      type: 'time_bracket',
      selections: TIME_BRACKETS.map((b, i) => ({
        sel_key: `b${i}`,
        label: b.label,
        runner_first_name: n,
        meta: { lo: b.lo, hi: b.hi },
      })),
    })
  }

  // 5) Battra son objectif (1 marché par coureur AYANT un objectif)
  for (const n of names) {
    const goal = goals.get(n)
    if (goal == null) continue
    markets.push({
      key: `objectif_${norm(n)}`,
      label: `${n} battra son objectif`,
      type: 'prop',
      selections: [
        { sel_key: 'oui', label: 'Oui', runner_first_name: n, meta: { side: 'yes', goal } },
        { sel_key: 'non', label: 'Non', runner_first_name: n, meta: { side: 'no', goal } },
      ],
    })
  }

  // 6-8) Marchés déterministes (4 sélections chacun, une par coureur)
  const deterministic: { key: string; label: string }[] = [
    { key: 'progression_allure', label: "Meilleure progression d'allure" },
    { key: 'assiduite', label: 'Meilleure assiduité' },
    // Libellé volontairement léger et bienveillant (jamais clinique ni moqueur).
    { key: 'moins_douleurs', label: 'Le plus en forme (le moins de bobos)' },
  ]
  for (const m of deterministic) {
    markets.push({
      key: m.key,
      label: m.label,
      type: 'prop',
      selections: names.map((n) => ({
        sel_key: norm(n),
        label: n,
        runner_first_name: n,
        meta: { deterministic: m.key },
      })),
    })
  }

  return markets
}

// ---------------------------------------------------------------------------
// Métriques déterministes + classement
// ---------------------------------------------------------------------------
export interface DeterministicMetrics {
  paceSlope: number // plus négatif = meilleure progression
  adherencePct: number // 0..100, plus haut = mieux
  painCount: number // plus bas = mieux
}

export function deterministicMetrics(runner: FouleeRunner): DeterministicMetrics {
  const f = computeFormFactors(runner.weekly_stats)
  return { paceSlope: f.paceSlope, adherencePct: f.adherencePct, painCount: f.painCount }
}

/**
 * Classe les coureurs pour un marché déterministe et renvoie sel_key → cote (ladder).
 * `betterFirst` : comparateur (a est meilleur que b si < 0).
 */
function rankToOdds(
  names: string[],
  value: (n: string) => number,
  betterFirst: (a: number, b: number) => number
): Record<string, number> {
  const sorted = [...names].sort((a, b) => betterFirst(value(a), value(b)))
  const out: Record<string, number> = {}
  sorted.forEach((n, i) => {
    out[norm(n)] = DETERMINISTIC_ODDS_LADDER[Math.min(i, DETERMINISTIC_ODDS_LADDER.length - 1)]
  })
  return out
}

/** Renvoie le prénom gagnant d'un marché déterministe (meilleur métrique). */
export function deterministicWinner(
  key: string,
  names: string[],
  metrics: Map<string, DeterministicMetrics>
): string | null {
  const m = (n: string) => metrics.get(n)
  const sorted = [...names]
  if (key === 'progression_allure')
    sorted.sort((a, b) => (m(a)?.paceSlope ?? 0) - (m(b)?.paceSlope ?? 0)) // plus négatif d'abord
  else if (key === 'assiduite')
    sorted.sort((a, b) => (m(b)?.adherencePct ?? 0) - (m(a)?.adherencePct ?? 0)) // plus haut d'abord
  else if (key === 'moins_douleurs')
    sorted.sort((a, b) => (m(a)?.painCount ?? 0) - (m(b)?.painCount ?? 0)) // plus bas d'abord
  else return null
  return sorted[0] ?? null
}

// ---------------------------------------------------------------------------
// Calcul des cotes de tout le catalogue
// ---------------------------------------------------------------------------
export interface OddsComputation {
  // marketKey → (sel_key → cote). Une sélection absente = pas de cote émise ce
  // tour (ex. coureur sans données pour un marché Monte Carlo).
  oddsByMarket: Map<string, Map<string, number>>
  simulation: SimulationResult | null
  modeledNames: string[]
  skippedRunners: string[] // coureurs exclus faute de données
}

/**
 * Calcule les cotes de tous les marchés. `runners` = données Foulée filtrées aux
 * 4 coureurs. `goals` = objectifs en secondes. `seed` optionnel (reproductibilité).
 */
export function computeCatalogOdds(
  catalog: MarketBlueprint[],
  runners: FouleeRunner[],
  goals: Map<string, number | null>,
  seed?: number
): OddsComputation {
  const names = runners.map((r) => r.first_name)

  // Modèles Monte Carlo (coureurs avec données suffisantes).
  const models: RunnerModel[] = []
  const skipped: string[] = []
  for (const r of runners) {
    const model = buildRunnerModel(r, goals.get(r.first_name) ?? null)
    if (model) models.push(model)
    else skipped.push(r.first_name)
  }
  const modeledNames = models.map((m) => m.first_name)
  const modeledSet = new Set(modeledNames)

  // Monte Carlo (au moins 2 coureurs modélisés pour classer).
  const simulation =
    models.length >= 2 ? runMonteCarlo(models, { seed, brackets: bracketsForSim() }) : null

  // Métriques déterministes (tous les coureurs).
  const metrics = new Map<string, DeterministicMetrics>()
  for (const r of runners) metrics.set(r.first_name, deterministicMetrics(r))

  const oddsByMarket = new Map<string, Map<string, number>>()

  for (const market of catalog) {
    const sel = new Map<string, number>()

    if (market.type === 'winner' && simulation) {
      for (const s of market.selections) {
        const n = s.runner_first_name as string
        if (modeledSet.has(n)) sel.set(s.sel_key, probToOdds(simulation.winProb[n] ?? 0))
      }
    } else if (market.type === 'podium_full' && simulation && skipped.length === 0) {
      for (const s of market.selections) {
        const order = (s.meta.order as string[]).join('>')
        sel.set(s.sel_key, probToOdds(simulation.orderProb[order] ?? 0))
      }
    } else if (market.type === 'head_to_head' && simulation) {
      const [a, b] = market.selections.map((s) => s.runner_first_name as string)
      if (modeledSet.has(a) && modeledSet.has(b)) {
        const [lo, hi] = a < b ? [a, b] : [b, a]
        const pLoFaster = simulation.h2hProb[`${lo}|${hi}`] ?? 0
        for (const s of market.selections) {
          const n = s.runner_first_name as string
          const p = n === lo ? pLoFaster : 1 - pLoFaster
          sel.set(s.sel_key, probToOdds(p))
        }
      }
    } else if (market.type === 'time_bracket' && simulation) {
      const n = market.selections[0]?.runner_first_name as string
      if (modeledSet.has(n)) {
        const probs = simulation.bracketProb[n] ?? []
        market.selections.forEach((s, i) => sel.set(s.sel_key, probToOdds(probs[i] ?? 0)))
      }
    } else if (market.type === 'prop' && market.key.startsWith('objectif_') && simulation) {
      const n = market.selections[0]?.runner_first_name as string
      if (modeledSet.has(n)) {
        const pYes = simulation.goalProb[n] ?? 0
        for (const s of market.selections) {
          const side = (s.meta.side as string) === 'yes' ? pYes : 1 - pYes
          sel.set(s.sel_key, probToOdds(side))
        }
      }
    } else if (market.type === 'prop') {
      // Marché déterministe : cote fixe selon le classement (pas de Monte Carlo).
      let ladder: Record<string, number> = {}
      if (market.key === 'progression_allure')
        ladder = rankToOdds(names, (n) => metrics.get(n)?.paceSlope ?? 0, (a, b) => a - b)
      else if (market.key === 'assiduite')
        ladder = rankToOdds(names, (n) => metrics.get(n)?.adherencePct ?? 0, (a, b) => b - a)
      else if (market.key === 'moins_douleurs')
        ladder = rankToOdds(names, (n) => metrics.get(n)?.painCount ?? 0, (a, b) => a - b)
      for (const s of market.selections) {
        const v = ladder[s.sel_key]
        if (v != null) sel.set(s.sel_key, v)
      }
    }

    oddsByMarket.set(market.key, sel)
  }

  return { oddsByMarket, simulation, modeledNames, skippedRunners: skipped }
}
