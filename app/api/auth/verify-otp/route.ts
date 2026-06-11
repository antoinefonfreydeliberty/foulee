import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { hashOtpCode } from '@/lib/otp'

const MAX_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()

    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Récupérer le code actif pour cet email
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError || !otpRecord) {
      return NextResponse.json(
        { error: 'Code expiré ou invalide. Demandez-en un nouveau.' },
        { status: 400 }
      )
    }

    // Vérifier le nombre de tentatives
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id)
      return NextResponse.json(
        { error: 'Trop de tentatives. Demandez un nouveau code.' },
        { status: 400 }
      )
    }

    // Incrémenter les tentatives
    await supabase
      .from('otp_codes')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id)

    // Vérifier le hash
    const submitted_hash = hashOtpCode(code)
    if (submitted_hash !== otpRecord.code_hash) {
      return NextResponse.json(
        { error: 'Code incorrect. Vérifiez et réessayez.' },
        { status: 400 }
      )
    }

    // Marquer comme utilisé
    await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id)

    // Générer un token de session via Supabase admin
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
      },
    })

    if (linkError || !linkData.properties?.hashed_token) {
      console.error('generateLink error:', linkError)
      return NextResponse.json(
        { error: 'Erreur lors de la création de session. Réessayez.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      token_hash: linkData.properties.hashed_token,
    })
  } catch (err) {
    console.error('verify-otp error:', err)
    return NextResponse.json(
      { error: 'Une erreur est survenue. Réessayez.' },
      { status: 500 }
    )
  }
}
