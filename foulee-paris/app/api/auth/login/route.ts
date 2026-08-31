import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPin, DUMMY_PIN_HASH } from '@/lib/auth/pin'
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session'
import type { Bettor } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const pin = typeof body?.pin === 'string' ? body.pin.trim() : ''

  if (!email || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'Email ou PIN incorrect' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data } = await supabase.from('bettors').select('*').eq('email', email).maybeSingle()
  const bettor = (data as Bettor | null) ?? null

  // Compare toujours (hash factice si compte absent) pour ne pas révéler par le
  // timing si l'email existe.
  const ok = await verifyPin(pin, bettor?.pin_hash ?? DUMMY_PIN_HASH)
  if (!bettor || !ok) {
    return NextResponse.json({ error: 'Email ou PIN incorrect' }, { status: 401 })
  }

  const token = await signSession({
    bettorId: bettor.id,
    email: bettor.email,
    firstName: bettor.first_name,
    isAdmin: bettor.is_admin,
  })

  const res = NextResponse.json({ ok: true, isAdmin: bettor.is_admin })
  res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS)
  return res
}
