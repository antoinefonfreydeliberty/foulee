import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateOtpCode, hashOtpCode } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/brevo/otp-email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email invalide.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Supprimer les anciens codes pour cet email
    await supabase.from('otp_codes').delete().eq('email', email)

    // Générer et stocker le nouveau code
    const code = generateOtpCode()
    const code_hash = hashOtpCode(code)

    const { error: insertError } = await supabase.from('otp_codes').insert({
      email,
      code_hash,
    })

    if (insertError) {
      console.error('OTP insert error:', insertError)
      return NextResponse.json(
        { error: "Impossible d'envoyer le code. Réessayez." },
        { status: 500 }
      )
    }

    // Envoyer via Brevo
    await sendOtpEmail({ to: email, code })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-otp error:', err)
    return NextResponse.json(
      { error: "Impossible d'envoyer le code. Réessayez." },
      { status: 500 }
    )
  }
}
