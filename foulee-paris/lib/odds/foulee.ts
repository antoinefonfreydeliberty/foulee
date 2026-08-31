// Client de l'endpoint Foulée `runner-stats` — SEUL lien entre Semi Ca$h et Foulée.
// Lecture seule, HTTP, secret Bearer partagé. Semi Ca$h ne touche JAMAIS la base
// Supabase de Foulée. Forme de la réponse = miroir exact de
// `app/api/betting/runner-stats/route.ts` côté Foulée (vérifié le 31/08/26).

export interface FouleeWeeklyStat {
  week_number: number
  total_distance_km: number
  session_count: number
  longest_run_km: number | null // null si aucune séance cette semaine-là
  avg_pace_min_per_km: number | null // sum(min)/sum(km), null si 0 km
  pain_flag_count: number
  planned_session_count: number
  planned_long_run_km: number | null
}

export interface FouleeRunner {
  first_name: string
  runner_level: string | null
  weekly_sessions: number | null
  goal_time: string | null // texte libre, non parsé ici (l'admin saisit goal_time_seconds)
  best_recent_time: string | null
  weekly_stats: FouleeWeeklyStat[]
  current_program_week: number
  days_until_race: number
}

export interface FouleeRunnerStatsResponse {
  generated_at: string
  program_start_date: string
  race_date: string
  runners: FouleeRunner[]
}

/**
 * Récupère les stats d'entraînement depuis Foulée. Lève une erreur explicite si
 * la config est absente ou si l'endpoint répond en erreur — l'appelant décide
 * quoi en faire (ne jamais laisser fuiter le secret dans un message d'erreur).
 */
export async function fetchRunnerStats(): Promise<FouleeRunnerStatsResponse> {
  const url = process.env.FOULEE_RUNNER_STATS_URL
  const secret = process.env.BETTING_API_SECRET
  if (!url) throw new Error('FOULEE_RUNNER_STATS_URL manquant')
  if (!secret) throw new Error('BETTING_API_SECRET manquant')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    // Jamais de cache : le volume est faible, on veut toujours la donnée fraîche.
    cache: 'no-store',
  })

  if (!res.ok) {
    // On n'inclut jamais le secret ni les en-têtes dans l'erreur.
    throw new Error(`runner-stats a répondu ${res.status}`)
  }

  const data = (await res.json()) as FouleeRunnerStatsResponse
  if (!data || !Array.isArray(data.runners)) {
    throw new Error('runner-stats: réponse inattendue (pas de tableau runners)')
  }
  return data
}
