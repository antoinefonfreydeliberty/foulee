// Orchestration du recalcul des cotes (SERVER-ONLY). Appelé par le bouton admin
// « recalculer » et par le cron. Étapes :
//   1. lire les 4 coureurs en base (Semi Ca$h)
//   2. récupérer runner-stats (Foulée, HTTP) et apparier par foulee_first_name
//   3. (idempotent) créer les marchés + sélections manquants
//   4. calculer les cotes (Riegel → forme → Monte Carlo / déterministe)
//   5. AJOUTER une ligne `odds` par sélection cotée + une ligne snapshot par coureur
//
// `odds` est en AJOUT SEUL : la cote courante = la ligne la plus récente.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Runner } from '@/lib/types'
import { fetchRunnerStats, type FouleeRunner } from './foulee'
import { buildCatalog, computeCatalogOdds, type MarketBlueprint } from './catalog'
import { buildRunnerModel } from './engine'

export interface RecomputeSummary {
  ok: boolean
  generated_at: string | null
  marketsEnsured: number
  selectionsEnsured: number
  oddsWritten: number
  snapshotsWritten: number
  modeledRunners: string[]
  skippedRunners: string[]
  warnings: string[]
}

/** true si la fenêtre de paris est fermée (BETS_CLOSE_AT dépassé). */
export function betsClosed(now: Date = new Date()): boolean {
  const closeAt = process.env.BETS_CLOSE_AT
  if (!closeAt) return false
  const t = Date.parse(closeAt)
  if (Number.isNaN(t)) return false
  return now.getTime() >= t
}

/**
 * Si la fenêtre de paris est fermée, bascule tous les marchés `open` → `closed`
 * (dernier jeu de cotes gelé, plus aucune mise possible). Idempotent.
 */
export async function closeMarketsIfDue(now: Date = new Date()): Promise<{ closed: number; due: boolean }> {
  if (!betsClosed(now)) return { closed: 0, due: false }
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('markets')
    .update({ status: 'closed' })
    .eq('status', 'open')
    .select('id')
  if (error) throw new Error(`fermeture marchés: ${error.message}`)
  return { closed: data?.length ?? 0, due: true }
}

/** Crée en base les marchés + sélections manquants. Renvoie market key→id et
 *  (market key, sel_key)→selection id. Idempotent (ne recrée jamais l'existant). */
async function ensureCatalog(
  supabase: SupabaseClient,
  catalog: MarketBlueprint[],
  closesAt: string | null
): Promise<{
  marketIdByKey: Map<string, string>
  selectionIdByKey: Map<string, string> // clé = `${marketKey}::${sel_key}`
  marketsCreated: number
  selectionsCreated: number
}> {
  const { data: existingMarkets } = await supabase.from('markets').select('id, key')
  const marketIdByKey = new Map<string, string>((existingMarkets ?? []).map((m) => [m.key as string, m.id as string]))

  // Créer les marchés manquants.
  const missingMarkets = catalog.filter((m) => !marketIdByKey.has(m.key))
  let marketsCreated = 0
  if (missingMarkets.length) {
    const { data: inserted, error } = await supabase
      .from('markets')
      .insert(
        missingMarkets.map((m) => ({
          key: m.key,
          label: m.label,
          type: m.type,
          status: 'open',
          closes_at: closesAt,
        }))
      )
      .select('id, key')
    if (error) throw new Error(`création marchés: ${error.message}`)
    for (const row of inserted ?? []) marketIdByKey.set(row.key as string, row.id as string)
    marketsCreated = inserted?.length ?? 0
  }

  // Charger les sélections existantes (avec leur sel_key en meta).
  const marketIds = catalog.map((m) => marketIdByKey.get(m.key)).filter(Boolean) as string[]
  const { data: existingSels } = await supabase
    .from('selections')
    .select('id, market_id, meta')
    .in('market_id', marketIds)

  const selectionIdByKey = new Map<string, string>()
  const marketKeyById = new Map<string, string>()
  for (const [k, id] of marketIdByKey) marketKeyById.set(id, k)
  for (const s of existingSels ?? []) {
    const mk = marketKeyById.get(s.market_id as string)
    const selKey = (s.meta as Record<string, unknown> | null)?.sel_key as string | undefined
    if (mk && selKey) selectionIdByKey.set(`${mk}::${selKey}`, s.id as string)
  }

  // Insérer les sélections manquantes (nouveaux marchés, ou marché objectif apparu),
  // en résolvant runner_id depuis le prénom porté par le blueprint.
  const { data: runners } = await supabase.from('runners').select('id, first_name')
  const runnerIdByName = new Map<string, string>((runners ?? []).map((r) => [r.first_name as string, r.id as string]))

  const rows: { market_id: string; label: string; runner_id: string | null; meta: Record<string, unknown> }[] = []
  for (const m of catalog) {
    const marketId = marketIdByKey.get(m.key)
    if (!marketId) continue
    for (const s of m.selections) {
      if (selectionIdByKey.has(`${m.key}::${s.sel_key}`)) continue
      rows.push({
        market_id: marketId,
        label: s.label,
        runner_id: s.runner_first_name ? runnerIdByName.get(s.runner_first_name) ?? null : null,
        meta: { ...s.meta, sel_key: s.sel_key },
      })
    }
  }

  let selectionsCreated = 0
  if (rows.length) {
    // Insère en une fois puis relit pour récupérer les ids par sel_key.
    const { data: inserted, error } = await supabase.from('selections').insert(rows).select('id, market_id, meta')
    if (error) throw new Error(`création sélections: ${error.message}`)
    selectionsCreated = inserted?.length ?? 0
    const marketKeyById = new Map<string, string>()
    for (const [k, id] of marketIdByKey) marketKeyById.set(id, k)
    for (const s of inserted ?? []) {
      const mk = marketKeyById.get(s.market_id as string)
      const selKey = (s.meta as Record<string, unknown>)?.sel_key as string | undefined
      if (mk && selKey) selectionIdByKey.set(`${mk}::${selKey}`, s.id as string)
    }
  }

  return { marketIdByKey, selectionIdByKey, marketsCreated, selectionsCreated }
}

/** Recalcule et écrit les cotes. Ne lève pas sur un coureur sans données. */
export async function recomputeOdds(seed?: number): Promise<RecomputeSummary> {
  const supabase = createAdminClient()
  const warnings: string[] = []

  // 1) Coureurs Semi Ca$h.
  const { data: runnersData, error: runnersErr } = await supabase
    .from('runners')
    .select('*')
    .order('first_name', { ascending: true })
  if (runnersErr) throw new Error(`lecture runners: ${runnersErr.message}`)
  const runners = (runnersData ?? []) as Runner[]
  if (runners.length === 0) throw new Error('aucun coureur en base')

  // 2) runner-stats (Foulée) + appariement par foulee_first_name.
  const stats = await fetchRunnerStats()
  const statsByName = new Map<string, FouleeRunner>()
  for (const r of stats.runners) statsByName.set(r.first_name.trim().toLowerCase(), r)

  const goals = new Map<string, number | null>()
  const engineRunners: FouleeRunner[] = []
  for (const r of runners) {
    goals.set(r.first_name, r.goal_time_seconds)
    const match = statsByName.get(r.foulee_first_name.trim().toLowerCase())
    if (match) {
      // On force le prénom Semi Ca$h (clé de nommage des marchés/sélections).
      engineRunners.push({ ...match, first_name: r.first_name })
    } else {
      warnings.push(`Pas de stats Foulée pour ${r.first_name} (foulee_first_name="${r.foulee_first_name}")`)
    }
  }

  const allNames = runners.map((r) => r.first_name)

  // 3) Catalogue idempotent (créé pour les 4 coureurs ; marchés objectif si goal saisi).
  const catalog = buildCatalog(allNames, goals)
  const closesAt = process.env.BETS_CLOSE_AT ?? null
  const { marketIdByKey, selectionIdByKey, marketsCreated, selectionsCreated } = await ensureCatalog(
    supabase,
    catalog,
    closesAt
  )

  // 4) Cotes.
  const computation = computeCatalogOdds(catalog, engineRunners, goals, seed)

  // 5) Écriture des cotes (AJOUT SEUL).
  const oddsRows: { selection_id: string; decimal_odds: number }[] = []
  for (const market of catalog) {
    const sel = computation.oddsByMarket.get(market.key)
    if (!sel) continue
    for (const [selKey, odds] of sel) {
      const selectionId = selectionIdByKey.get(`${market.key}::${selKey}`)
      if (selectionId) oddsRows.push({ selection_id: selectionId, decimal_odds: odds })
    }
  }
  let oddsWritten = 0
  if (oddsRows.length) {
    const { error } = await supabase.from('odds').insert(oddsRows)
    if (error) throw new Error(`écriture odds: ${error.message}`)
    oddsWritten = oddsRows.length
  }

  // 6) Snapshots par coureur (source_as_of = generated_at de la donnée Foulée).
  const snapshotRows = runners.map((r) => {
    const fr = engineRunners.find((x) => x.first_name === r.first_name)
    const model = fr ? buildRunnerModel(fr, r.goal_time_seconds) : null
    return {
      runner_id: r.id,
      projected_time_seconds: model?.projectedTimeSeconds ?? null,
      sd_seconds: model?.sdSeconds ?? null,
      form_score: model?.form.combined ?? null,
      adherence_pct: model?.form.adherencePct ?? null,
      reference_distance_km: model?.reference.reference_distance_km ?? null,
      source_as_of: stats.generated_at,
    }
  })
  const { error: snapErr } = await supabase.from('runner_stats_snapshots').insert(snapshotRows)
  if (snapErr) throw new Error(`écriture snapshots: ${snapErr.message}`)

  return {
    ok: true,
    generated_at: stats.generated_at,
    marketsEnsured: marketsCreated,
    selectionsEnsured: selectionsCreated,
    oddsWritten,
    snapshotsWritten: snapshotRows.length,
    modeledRunners: computation.modeledNames,
    skippedRunners: computation.skippedRunners,
    warnings,
  }
}
