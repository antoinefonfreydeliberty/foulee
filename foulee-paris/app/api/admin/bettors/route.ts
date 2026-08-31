import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentBettor } from '@/lib/auth/current'
import { generatePin, hashPin } from '@/lib/auth/pin'
import { STARTING_BALANCE_CENTS } from '@/lib/money'
import type { Bettor } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Liste des parieurs (sans pin_hash) — admin uniquement.
export async function GET() {
  const admin = await getCurrentBettor()
  if (!admin?.is_admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('bettors')
    .select('id, first_name, last_name, email, balance_cents, is_admin, created_at')
    .order('created_at', { ascending: true })

  return NextResponse.json({ bettors: data ?? [] })
}

// Création d'un parieur : génère un PIN (affiché UNE seule fois), crédite 100 jetons.
export async function POST(req: NextRequest) {
  const admin = await getCurrentBettor()
  if (!admin?.is_admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!firstName || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Prénom et email valides requis' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase.from('bettors').select('id').eq('email', email).maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Un parieur avec cet email existe déjà' }, { status: 409 })
  }

  const pin = generatePin()
  const pinHash = await hashPin(pin)

  const { data: inserted, error } = await supabase
    .from('bettors')
    .insert({
      first_name: firstName,
      last_name: lastName || null,
      email,
      pin_hash: pinHash,
      balance_cents: STARTING_BALANCE_CENTS,
      is_admin: false,
    })
    .select('id, first_name, last_name, email, balance_cents, is_admin, created_at')
    .single()

  if (error || !inserted) {
    return NextResponse.json({ error: 'Création impossible' }, { status: 500 })
  }
  const bettor = inserted as Omit<Bettor, 'pin_hash'>

  // Trace le crédit initial dans le grand livre.
  await supabase.from('transactions').insert({
    bettor_id: bettor.id,
    type: 'grant_initial',
    amount_cents: STARTING_BALANCE_CENTS,
    balance_after_cents: STARTING_BALANCE_CENTS,
  })

  // Le PIN n'est renvoyé qu'ici, une seule fois. Jamais stocké en clair, jamais relu.
  return NextResponse.json({ bettor, pin })
}
