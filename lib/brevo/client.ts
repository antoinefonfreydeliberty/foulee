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
