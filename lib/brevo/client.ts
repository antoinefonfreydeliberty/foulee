import { BrevoClient } from '@getbrevo/brevo'

interface EmailParams {
  to: string
  toName: string
  coachName: string
  htmlContent: string
  weekNumber: number
}

export const sendWeeklyEmail = async ({ to, toName, coachName, htmlContent, weekNumber }: EmailParams) => {
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! })

  return client.transactionalEmails.sendTransacEmail({
    sender: {
      email: process.env.BREVO_SENDER_EMAIL ?? 'coach@foulee.run',
      name: `${coachName} via Foulée`,
    },
    to: [{ email: to, name: toName }],
    subject: `Semaine ${weekNumber} - Ton bilan de la semaine, ${toName}`,
    htmlContent,
  })
}

interface RaceDayEmailParams {
  to: string
  toName: string
  coachName: string
  htmlContent: string
}

// Email J-1 (veille de course), envoi one-shot. Même sender que l'email
// hebdomadaire, sujet dédié orienté "veille de course".
export const sendRaceDayEmail = async ({ to, toName, coachName, htmlContent }: RaceDayEmailParams) => {
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! })

  return client.transactionalEmails.sendTransacEmail({
    sender: {
      email: process.env.BREVO_SENDER_EMAIL ?? 'coach@foulee.run',
      name: `${coachName} via Foulée`,
    },
    to: [{ email: to, name: toName }],
    subject: `Demain, c'est le grand jour, ${toName} 🏁`,
    htmlContent,
  })
}

interface ClosingEmailParams {
  to: string
  toName: string
  coachName: string
  htmlContent: string
}

// Email de clôture (jour de la course, semaine 14/14). Même sender, sujet dédié
// orienté bilan de fin de préparation.
export const sendClosingEmail = async ({ to, toName, coachName, htmlContent }: ClosingEmailParams) => {
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! })

  return client.transactionalEmails.sendTransacEmail({
    sender: {
      email: process.env.BREVO_SENDER_EMAIL ?? 'coach@foulee.run',
      name: `${coachName} via Foulée`,
    },
    to: [{ email: to, name: toName }],
    subject: `Ton bilan des 14 semaines, ${toName} 🎉`,
    htmlContent,
  })
}
