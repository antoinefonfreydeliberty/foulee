interface SendOtpEmailParams {
  to: string
  code: string
}

export async function sendOtpEmail({ to, code }: SendOtpEmailParams): Promise<void> {
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? 'coach@foulee.run'

  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY manquant')

  const html = `
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;
            padding: 32px 24px; background: #FDF8F3;">
  <p style="color: #6E5E55; font-size: 14px; margin: 0 0 24px 0;">
    Foulée · Coach semi-marathon
  </p>
  <h1 style="color: #160E08; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
    Votre code de connexion
  </h1>
  <p style="color: #6E5E55; font-size: 16px; margin: 0 0 32px 0;">
    Saisissez ce code dans l'application pour vous connecter :
  </p>
  <div style="background: #FFFFFF; border: 2px solid #C5402C; border-radius: 12px;
              padding: 24px; text-align: center; margin: 0 0 32px 0;">
    <span style="font-size: 40px; font-weight: 700; letter-spacing: 10px; color: #C5402C;">
      ${code}
    </span>
  </div>
  <p style="color: #6E5E55; font-size: 14px; margin: 0 0 8px 0;">
    Ce code est valable <strong>10 minutes</strong>.
  </p>
  <p style="color: #C5BCAF; font-size: 12px; margin: 0;">
    Si vous n'avez pas demandé ce code, ignorez cet email.
  </p>
</div>`

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Foulée', email: BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject: 'Votre code de connexion Foulée',
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Brevo error ${res.status}: ${body}`)
  }
}
