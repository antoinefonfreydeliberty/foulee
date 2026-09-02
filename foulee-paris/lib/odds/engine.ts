// Moteur de cotes — fonctions PURES (aucune I/O). Suit exactement la spec de
// foulee-paris.md (section « Moteur de cotes »). Testable et vérifiable à la main.
//
// Chaîne : temps de référence (meilleure sortie longue sur 3 sem. glissantes,
// élargie à 4/6) → Riegel vers 21,1 km → facteurs de forme → écart-type →
// Monte Carlo 20 000 tirages → probabilités → cotes.

import type { FouleeRunner, FouleeWeeklyStat } from './foulee'

// ---------------------------------------------------------------------------
// Constantes de la spec (paramètres du modèle, documentés)
// ---------------------------------------------------------------------------
export const HALF_MARATHON_KM = 21.1
export const RIEGEL_EXPONENT = 1.06
export const MONTE_CARLO_DRAWS = 20_000
export const MARGIN = 1.07 // marge bookmaker : cote = 1 / (proba * MARGIN)
export const MIN_ODDS = 1.05 // plancher de cote (spec)
// Garde-fou d'affichage/paiement : plafonne les cotes des issues quasi impossibles
// (ex. permutations de classement jamais tirées en 20 000 simulations). NON prévu
// par la spec (qui ne fixe qu'un plancher) — ajouté pour éviter des cotes à 5 chiffres.
export const MAX_ODDS = 100.0

// Bornes des facteurs de forme (spec).
const PACE_FACTOR_MIN = 0.97
const PACE_FACTOR_MAX = 1.03
// Sensibilité pente d'allure → facteur. La spec fixe les bornes (0,97 / 1,03) mais
// pas la pente qui les atteint : on retient qu'une dérive de 0,1 min/km par semaine
// (≈ 6 s/km/sem., soit une tendance nette sur 6 semaines) sature la borne.
const PACE_SLOPE_SENSITIVITY = 0.3 // facteur = 1 + pente(min/km/sem) * sensibilité
const ADHERENCE_THRESHOLD = 0.7 // sous 70 % → pénalité
const ADHERENCE_MAX_PENALTY = 1.03
const PAIN_THRESHOLD = 2 // strictement > 2 douleurs sur 4 sem.
const PAIN_PENALTY = 1.02
const SD_BASE = 0.04 // bruit "jour de course" (variabilité d'un même coureur)
const SD_DISTANCE_TERM = 0.01
const SD_FLOOR_FRACTION = 0.03 // sd jamais sous 3 % du temps projeté
// Incertitude d'ESTIMATION du niveau ("modèle") : le temps semi est inféré d'une
// poignée de sorties longues extrapolées via Riegel — très incertain (on ne connaît
// pas le vrai niveau au ruban près). Combinée en quadrature avec le bruit jour-de-
// course, elle évite un modèle surconfiant qui envoie les outsiders à la cote plafond
// (proba ≈ 0). Socle plat, réglable : ↑ = course plus ouverte, ↓ = plus tranchée.
export const MODEL_UNCERTAINTY = 0.06
// L'incertitude d'estimation CROÎT avec la distance d'extrapolation : projeter un
// semi depuis une sortie courte (ex. 8,5 km) est bien plus hasardeux que depuis
// 20 km. On mesure l'excès d'extrapolation par (21,1 / dist_réf − 1) et on l'ajoute
// au socle modèle. Sans ça, un coureur mal renseigné (peu de longues) affichait une
// projection quasi aussi "sûre" qu'un coureur bien renseigné — donc des cotes
// d'outsider surévaluées. Réglable (↑ = SD des mal-renseignés plus large).
export const EXTRAPOLATION_SENSITIVITY = 0.06

// ---------------------------------------------------------------------------
// PRNG déterministe (mulberry32) + normale tronquée positive (Box–Muller)
// ---------------------------------------------------------------------------
// Un générateur graine rend les recalculs reproductibles (utile pour la
// vérification à la main et les tests). À 20 000 tirages les probabilités sont
// stables à ~2-3 décimales quel que soit le seed.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Tire une normale N(mean, sd) tronquée à une valeur strictement positive. */
function sampleTruncatedNormal(rng: () => number, mean: number, sd: number): number {
  // Box–Muller ; on re-tire tant que la valeur n'est pas positive (rarissime ici,
  // sd ≈ 4-5 % de la moyenne).
  for (let i = 0; i < 50; i++) {
    const u1 = Math.max(rng(), 1e-12)
    const u2 = rng()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const v = mean + sd * z
    if (v > 0) return v
  }
  return mean // repli : garde la moyenne (positive)
}

// ---------------------------------------------------------------------------
// Sélection des semaines / temps de référence
// ---------------------------------------------------------------------------
/** Les `n` dernières semaines (numéros les plus élevés), triées par week_number. */
function lastWeeks(weekly: FouleeWeeklyStat[], n: number): FouleeWeeklyStat[] {
  return [...weekly].sort((a, b) => a.week_number - b.week_number).slice(-n)
}

export interface ReferencePoint {
  reference_distance_km: number
  reference_pace_min_per_km: number
  reference_time_seconds: number
  window_weeks: number // fenêtre effectivement utilisée (3, 4 ou 6)
}

/**
 * Temps de référence : sur les 3 dernières semaines glissantes, la semaine au plus
 * grand `longest_run_km` (avec allure connue). Élargit à 4 puis 6 semaines si
 * aucune sortie longue exploitable. null si le coureur n'a aucune donnée utilisable.
 */
export function computeReference(weekly: FouleeWeeklyStat[]): ReferencePoint | null {
  for (const windowSize of [3, 4, 6]) {
    const weeks = lastWeeks(weekly, windowSize)
    let best: FouleeWeeklyStat | null = null
    for (const w of weeks) {
      if (w.longest_run_km != null && w.longest_run_km > 0 && w.avg_pace_min_per_km != null) {
        if (best == null || w.longest_run_km > (best.longest_run_km ?? 0)) best = w
      }
    }
    if (best) {
      const dist = best.longest_run_km as number
      const pace = best.avg_pace_min_per_km as number
      return {
        reference_distance_km: dist,
        reference_pace_min_per_km: pace,
        reference_time_seconds: dist * pace * 60,
        window_weeks: windowSize,
      }
    }
  }
  return null
}

/** Projection Riegel du temps de référence vers le semi (21,1 km). */
export function riegelProject(refTimeSeconds: number, refDistanceKm: number): number {
  return refTimeSeconds * Math.pow(HALF_MARATHON_KM / refDistanceKm, RIEGEL_EXPONENT)
}

// ---------------------------------------------------------------------------
// Facteurs de forme
// ---------------------------------------------------------------------------
/** Pente de la régression linéaire de l'allure (min/km) sur les 6 dernières sem. */
export function paceSlopePerWeek(weekly: FouleeWeeklyStat[]): number {
  const pts = lastWeeks(weekly, 6)
    .filter((w) => w.avg_pace_min_per_km != null)
    .map((w) => ({ x: w.week_number, y: w.avg_pace_min_per_km as number }))
  if (pts.length < 2) return 0
  const n = pts.length
  const sx = pts.reduce((s, p) => s + p.x, 0)
  const sy = pts.reduce((s, p) => s + p.y, 0)
  const sxx = pts.reduce((s, p) => s + p.x * p.x, 0)
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) return 0
  return (n * sxy - sx * sy) / denom
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export interface FormFactors {
  paceFactor: number
  adherenceFactor: number
  painFactor: number
  combined: number // form_score = produit des trois
  paceSlope: number
  adherencePct: number // 0..100 (cappé)
  painCount: number
}

export function computeFormFactors(weekly: FouleeWeeklyStat[]): FormFactors {
  // a) Tendance d'allure (6 sem.). Pente < 0 = progrès → facteur < 1.
  const slope = paceSlopePerWeek(weekly)
  const paceFactor = clamp(1 + slope * PACE_SLOPE_SENSITIVITY, PACE_FACTOR_MIN, PACE_FACTOR_MAX)

  // b) Assiduité (4 sem.) = séances réalisées / prévues, cappé à 100 %.
  const last4 = lastWeeks(weekly, 4)
  const done = last4.reduce((s, w) => s + w.session_count, 0)
  const planned = last4.reduce((s, w) => s + w.planned_session_count, 0)
  const adherence = planned > 0 ? Math.min(1, done / planned) : 1
  const adherenceFactor =
    adherence >= ADHERENCE_THRESHOLD
      ? 1
      : clamp(
          1 + ((ADHERENCE_THRESHOLD - adherence) / ADHERENCE_THRESHOLD) * (ADHERENCE_MAX_PENALTY - 1),
          1,
          ADHERENCE_MAX_PENALTY
        )

  // c) Douleurs (4 sem.) : > 2 séances avec douleur → pénalité.
  const painCount = last4.reduce((s, w) => s + w.pain_flag_count, 0)
  const painFactor = painCount > PAIN_THRESHOLD ? PAIN_PENALTY : 1

  return {
    paceFactor,
    adherenceFactor,
    painFactor,
    combined: paceFactor * adherenceFactor * painFactor,
    paceSlope: slope,
    adherencePct: Math.round(adherence * 1000) / 10,
    painCount,
  }
}

/** Écart-type de simulation (secondes), avec plancher à 3 % du temps projeté. */
export function computeSd(projectedTimeSeconds: number, refDistanceKm: number): number {
  // Bruit jour-de-course (terme distance léger de la spec).
  const raceFrac = SD_BASE + SD_DISTANCE_TERM * Math.max(0, (HALF_MARATHON_KM - refDistanceKm) / 5)
  // Incertitude d'estimation = socle plat + terme croissant avec l'extrapolation.
  const extrapolationExcess = Math.max(0, HALF_MARATHON_KM / refDistanceKm - 1)
  const modelFrac = MODEL_UNCERTAINTY + EXTRAPOLATION_SENSITIVITY * extrapolationExcess
  // Total prédictif = bruit course ⊕ incertitude d'estimation (variances additives).
  const factor = Math.sqrt(raceFrac * raceFrac + modelFrac * modelFrac)
  const sd = projectedTimeSeconds * factor
  return Math.max(sd, projectedTimeSeconds * SD_FLOOR_FRACTION)
}

// ---------------------------------------------------------------------------
// Profil d'un coureur prêt pour la simulation
// ---------------------------------------------------------------------------
export interface RunnerModel {
  first_name: string
  reference: ReferencePoint
  projectedTimeSeconds: number // Riegel, avant forme
  adjustedTimeSeconds: number // moyenne du tirage Monte Carlo
  sdSeconds: number
  form: FormFactors
  goalTimeSeconds: number | null
}

/** Construit le modèle de simulation d'un coureur, ou null si aucune donnée. */
export function buildRunnerModel(
  runner: FouleeRunner,
  goalTimeSeconds: number | null
): RunnerModel | null {
  const reference = computeReference(runner.weekly_stats)
  if (!reference) return null
  const projected = riegelProject(reference.reference_time_seconds, reference.reference_distance_km)
  const form = computeFormFactors(runner.weekly_stats)
  const adjusted = projected * form.combined
  const sd = computeSd(projected, reference.reference_distance_km)
  return {
    first_name: runner.first_name,
    reference,
    projectedTimeSeconds: projected,
    adjustedTimeSeconds: adjusted,
    sdSeconds: sd,
    form,
    goalTimeSeconds,
  }
}

// ---------------------------------------------------------------------------
// Monte Carlo
// ---------------------------------------------------------------------------
export interface SimulationResult {
  names: string[] // ordre des coureurs simulés (ceux qui ont des données)
  draws: number
  // fréquences (probabilités) :
  winProb: Record<string, number> // P(gagne / plus rapide)
  lastProb: Record<string, number> // P(dernier)
  // P(chaque coureur finit à chaque rang) : rankProb[name][rankIndex 0..n-1]
  rankProb: Record<string, number[]>
  // P(ordre complet) : clé = "A>B>C>D" (du plus rapide au plus lent)
  orderProb: Record<string, number>
  // P(A plus rapide que B) pour chaque paire non ordonnée "A|B" (a<b alpha) → P(a plus rapide)
  h2hProb: Record<string, number>
  // P(le temps du coureur tombe dans chaque tranche) : bracketProb[name][bracketIndex]
  bracketProb: Record<string, number[]>
  // P(le temps tiré < goalTimeSeconds) par coureur ayant un objectif
  goalProb: Record<string, number>
  // temps moyen simulé par coureur (secondes) — utile pour debug/affichage
  meanTimeSeconds: Record<string, number>
}

/** Bornes de tranches de temps en secondes [lo, hi[ (hi = Infinity pour la dernière). */
export type TimeBracket = [number, number]

/**
 * Simulation Monte Carlo. Ne simule que les coureurs ayant un modèle (données
 * suffisantes). L'appelant gère les coureurs exclus (pas de cote émise).
 * `seed` rend le tirage reproductible.
 */
// Seed par défaut = "Semi" en ASCII (0x53656d69). Reproductible d'un recalcul à l'autre.
export const DEFAULT_SEED = 0x53656d69

export interface MonteCarloOptions {
  seed?: number
  brackets?: TimeBracket[] // tranches de temps pour les marchés time_bracket
}

export function runMonteCarlo(models: RunnerModel[], opts: MonteCarloOptions = {}): SimulationResult {
  const seed = opts.seed ?? DEFAULT_SEED
  const brackets = opts.brackets ?? []
  const rng = mulberry32(seed)
  const names = models.map((m) => m.first_name)
  const n = names.length
  const draws = MONTE_CARLO_DRAWS

  const winCount: Record<string, number> = {}
  const lastCount: Record<string, number> = {}
  const rankCount: Record<string, number[]> = {}
  const orderCount: Record<string, number> = {}
  const h2hCount: Record<string, number> = {}
  const timeSum: Record<string, number> = {}
  const bracketCount: Record<string, number[]> = {}
  const goalCount: Record<string, number> = {}
  const goalByName = new Map(models.map((m) => [m.first_name, m.goalTimeSeconds]))
  for (const nm of names) {
    winCount[nm] = 0
    lastCount[nm] = 0
    rankCount[nm] = new Array(n).fill(0)
    timeSum[nm] = 0
    bracketCount[nm] = new Array(brackets.length).fill(0)
    goalCount[nm] = 0
  }

  for (let d = 0; d < draws; d++) {
    const times: { name: string; t: number }[] = models.map((m) => ({
      name: m.first_name,
      t: sampleTruncatedNormal(rng, m.adjustedTimeSeconds, m.sdSeconds),
    }))
    for (const { name, t } of times) {
      timeSum[name] += t
      // tranche de temps
      for (let b = 0; b < brackets.length; b++) {
        if (t >= brackets[b][0] && t < brackets[b][1]) {
          bracketCount[name][b]++
          break
        }
      }
      // objectif
      const goal = goalByName.get(name)
      if (goal != null && t < goal) goalCount[name]++
    }
    times.sort((a, b) => a.t - b.t) // du plus rapide au plus lent

    winCount[times[0].name]++
    lastCount[times[n - 1].name]++
    for (let r = 0; r < n; r++) rankCount[times[r].name][r]++

    const orderKey = times.map((x) => x.name).join('>')
    orderCount[orderKey] = (orderCount[orderKey] ?? 0) + 1

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = times[i].name
        const b = times[j].name
        // times[i] est plus rapide que times[j]. Clé normalisée alphabétiquement.
        const [lo, hi] = a < b ? [a, b] : [b, a]
        const key = `${lo}|${hi}`
        // On compte les tirages où `lo` est plus rapide que `hi`.
        if (a === lo) h2hCount[key] = (h2hCount[key] ?? 0) + 1
        else if (!(key in h2hCount)) h2hCount[key] = 0
      }
    }
  }

  const winProb: Record<string, number> = {}
  const lastProb: Record<string, number> = {}
  const rankProb: Record<string, number[]> = {}
  const bracketProb: Record<string, number[]> = {}
  const goalProb: Record<string, number> = {}
  const meanTimeSeconds: Record<string, number> = {}
  for (const nm of names) {
    winProb[nm] = winCount[nm] / draws
    lastProb[nm] = lastCount[nm] / draws
    rankProb[nm] = rankCount[nm].map((c) => c / draws)
    bracketProb[nm] = bracketCount[nm].map((c) => c / draws)
    goalProb[nm] = goalCount[nm] / draws
    meanTimeSeconds[nm] = timeSum[nm] / draws
  }
  const orderProb: Record<string, number> = {}
  for (const [k, c] of Object.entries(orderCount)) orderProb[k] = c / draws
  const h2hProb: Record<string, number> = {}
  for (const [k, c] of Object.entries(h2hCount)) h2hProb[k] = c / draws

  return {
    names,
    draws,
    winProb,
    lastProb,
    rankProb,
    orderProb,
    h2hProb,
    bracketProb,
    goalProb,
    meanTimeSeconds,
  }
}

// ---------------------------------------------------------------------------
// Lissage des probabilités d'un marché (shrinkage vers l'équiprobable)
// ---------------------------------------------------------------------------
// p' = (1-λ)·p + λ/K, sur les K issues mutuellement exclusives d'un marché.
// Rôle : garantir qu'aucune issue ne tombe à 0 % exact (donc plus de "mur" de
// cotes au plafond MAX_ODDS pour les outsiders), et faire varier les cotes au lieu
// d'un palier plat. Lissage de Laplace, réglable (λ=0 → aucun lissage).
export const SHRINKAGE_LAMBDA = 0.05

/** Lisse un vecteur de probabilités (issues mutuellement exclusives) vers 1/K. */
export function shrinkProbs(probs: number[], lambda: number = SHRINKAGE_LAMBDA): number[] {
  const k = probs.length
  if (k === 0) return probs
  return probs.map((p) => (1 - lambda) * p + lambda / k)
}

// ---------------------------------------------------------------------------
// Probabilité → cote
// ---------------------------------------------------------------------------
/**
 * Convertit une probabilité en cote décimale : round(1 / (p * MARGIN), 2),
 * plancher MIN_ODDS, plafond MAX_ODDS (garde-fou). p ≤ 0 → cote plafond.
 */
export function probToOdds(prob: number): number {
  if (prob <= 0) return MAX_ODDS
  const raw = 1 / (prob * MARGIN)
  const rounded = Math.round(raw * 100) / 100
  return clamp(rounded, MIN_ODDS, MAX_ODDS)
}
