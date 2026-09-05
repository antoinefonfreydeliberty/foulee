import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env.local') })

// ─── Mode ───────────────────────────────────────────────────────────────────
// --dry-run (DÉFAUT) : affiche le payload (secret masqué), n'appelle aucune API.
// --create           : crée réellement le job via PUT https://api.cron-job.org/jobs
const CREATE  = process.argv.includes('--create')
const DRY_RUN = !CREATE
// ─────────────────────────────────────────────────────────────────────────────

const CRONJOB_ORG_API_URL   = 'https://api.cron-job.org/jobs'
const JOB_TARGET_URL        = 'https://www.foulee.run/api/cron/race-day-email'

const CRONJOB_ORG_API_KEY   = process.env.CRONJOB_ORG_API_KEY   // clé de compte cron-job.org
const RACE_DAY_CRON_SECRET  = process.env.RACE_DAY_CRON_SECRET  // secret d'appel de la route

// Construit le payload du job. `secret` est injecté dans le header Authorization
// que cron-job.org enverra à la route Foulée à chaque déclenchement.
// Points d'attention (cf. consigne) :
//  - expiresAt = 2026-09-13 00:00:00 : le job s'auto-désactive après l'envoi et
//    ne se redéclenche jamais un 12 septembre d'une année ultérieure.
//  - wdays: [-1] (non restreint) : évite toute intersection ambiguë mdays/wdays.
//    Seule la combinaison mdays=[12] + months=[9] cible la date.
function buildPayload(secret) {
  return {
    job: {
      url: JOB_TARGET_URL,
      enabled: true,
      title: 'Foulee - Email J-1 course (one-shot)',
      requestMethod: 0,
      extendedData: {
        headers: { Authorization: `Bearer ${secret}` },
      },
      schedule: {
        timezone: 'Europe/Paris',
        expiresAt: 20260913000000,
        hours: [12],
        minutes: [0],
        mdays: [12],
        months: [9],
        wdays: [-1],
      },
    },
  }
}

async function main() {
  if (DRY_RUN) {
    // Secret JAMAIS affiché : masqué dans le payload imprimé.
    const preview = buildPayload('***RACE_DAY_CRON_SECRET***')
    console.log('── DRY-RUN (aucun appel API) ─────────────────────────────────')
    console.log(`Cible du job     : ${JOB_TARGET_URL}`)
    console.log(`Endpoint création: PUT ${CRONJOB_ORG_API_URL}`)
    console.log('Payload (Authorization masquée) :')
    console.log(JSON.stringify(preview, null, 2))
    console.log('──────────────────────────────────────────────────────────────')
    console.log('Pour créer réellement le job : node scripts/setup-race-day-cronjob.mjs --create')
    console.log('Prérequis --create : CRONJOB_ORG_API_KEY et RACE_DAY_CRON_SECRET dans .env.local')
    return
  }

  // ── Mode --create ──────────────────────────────────────────────────────────
  if (!CRONJOB_ORG_API_KEY) {
    console.error('❌  CRONJOB_ORG_API_KEY manquant dans .env.local (fourni par Antoine)')
    process.exit(1)
  }
  if (!RACE_DAY_CRON_SECRET) {
    console.error('❌  RACE_DAY_CRON_SECRET manquant dans .env.local')
    process.exit(1)
  }

  const payload = buildPayload(RACE_DAY_CRON_SECRET)

  const res = await fetch(CRONJOB_ORG_API_URL, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${CRONJOB_ORG_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`cron-job.org error ${res.status}: ${body}`)
  }

  const data = await res.json()
  // L'API renvoie { jobId }. On le logge pour qu'Antoine le retrouve dans sa
  // console cron-job.org et puisse le supprimer manuellement après le 12/09.
  console.log(`✓  Job créé. jobId = ${data.jobId ?? JSON.stringify(data)}`)
  console.log('   À retrouver dans la console cron-job.org (compte antoine.fonfreyde.liberty@gmail.com).')
}

main().catch((err) => {
  console.error(`✗  ${err.message}`)
  process.exit(1)
})
