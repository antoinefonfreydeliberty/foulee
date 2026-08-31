import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { SESSION_COOKIE, verifySession, type SessionPayload } from './session'
import type { Bettor } from '@/lib/types'

/** Lit et vérifie la session depuis le cookie. null si absente/invalide. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

/** Recharge le parieur courant depuis la base (solde frais). null si pas de session. */
export async function getCurrentBettor(): Promise<Bettor | null> {
  const session = await getSession()
  if (!session) return null
  const supabase = createAdminClient()
  const { data } = await supabase.from('bettors').select('*').eq('id', session.bettorId).maybeSingle()
  return (data as Bettor | null) ?? null
}

/** Pour les server components : redirige vers /login si non connecté. */
export async function requireBettor(): Promise<Bettor> {
  const bettor = await getCurrentBettor()
  if (!bettor) redirect('/login')
  return bettor
}

/** Pour les server components admin : redirige vers /login si non admin. */
export async function requireAdmin(): Promise<Bettor> {
  const bettor = await requireBettor()
  if (!bettor.is_admin) redirect('/login')
  return bettor
}
