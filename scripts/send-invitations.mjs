import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { buildInvitationEmail } from '../lib/brevo/invitation-email.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env.local') })

// ─── RENSEIGNER ICI ───────────────────────────────────────────────────────────
const INVITEES = [
  { name: 'Rémi', email: 'remi.baillot@tutamail.com' },
]
const APP_URL = 'https://www.foulee.run'
// ─────────────────────────────────────────────────────────────────────────────

const BREVO_API_KEY      = process.env.BREVO_API_KEY
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? 'coach@foulee.run'

if (!BREVO_API_KEY) {
  console.error('❌  BREVO_API_KEY manquant dans .env.local')
  process.exit(1)
}

async function sendInvitation({ name, email }) {
  const loginUrl = `${APP_URL}?email=${encodeURIComponent(email)}`
  const html = buildInvitationEmail({ recipientName: name, loginUrl })

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Antoine via Foulée', email: BREVO_SENDER_EMAIL },
      to: [{ name, email }],
      subject: `${name}, ta prépa Vannes-Auray commence ici 🏃`,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Brevo error ${res.status}: ${body}`)
  }

  console.log(`✓  Invitation envoyée à ${name} <${email}>`)
}

console.log(`Envoi de ${INVITEES.length} invitation(s)...\n`)

for (const invitee of INVITEES) {
  try {
    await sendInvitation(invitee)
  } catch (err) {
    console.error(`✗  Erreur pour ${invitee.name}: ${err.message}`)
  }
}

console.log('\nTerminé.')
