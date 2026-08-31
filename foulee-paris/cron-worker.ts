// Worker d'entrée Cloudflare : délègue les requêtes HTTP au worker OpenNext
// (l'app Next.js) et ajoute un handler `scheduled` pour le Cron Trigger.
//
// Le cron ré-invoque simplement la route interne `/api/cron/recompute-odds` via le
// `fetch` d'OpenNext : tout le contexte Next.js + `process.env` est ainsi initialisé
// exactement comme pour une vraie requête. La route recalcule les cotes (toutes les
// 6 h) et ferme les marchés au 12/09 minuit Europe/Paris. Auth par `ODDS_CRON_SECRET`.
//
// @ts-expect-error — généré au build par `opennextjs-cloudflare build`.
import worker, { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js'

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge }

interface CronEnv {
  ODDS_CRON_SECRET?: string
}

export default {
  fetch: worker.fetch,

  async scheduled(_event: ScheduledController, env: CronEnv, ctx: ExecutionContext): Promise<void> {
    const req = new Request('https://semi-cash.internal/api/cron/recompute-odds', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.ODDS_CRON_SECRET ?? ''}` },
    })
    const run = worker.fetch(req, env, ctx).then(async (res: Response) => {
      // On loggue le statut (jamais le secret) pour le suivi dans les logs Workers.
      console.log(`[cron] recompute-odds → ${res.status}`)
    })
    ctx.waitUntil(run)
  },
}
