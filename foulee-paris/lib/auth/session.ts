import { SignJWT, jwtVerify } from 'jose'

// Session parieur = cookie httpOnly signé (JWT HS256 via SESSION_SECRET).
// Pas de Supabase Auth (volume = 5 comptes).
export const SESSION_COOKIE = 'semicash_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 jours

export interface SessionPayload {
  bettorId: string
  email: string
  firstName: string
  isAdmin: boolean
}

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET manquant')
  return new TextEncoder().encode(s)
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (
      typeof payload.bettorId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.firstName !== 'string' ||
      typeof payload.isAdmin !== 'boolean'
    ) {
      return null
    }
    return {
      bettorId: payload.bettorId,
      email: payload.email,
      firstName: payload.firstName,
      isAdmin: payload.isAdmin,
    }
  } catch {
    return null
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE_SECONDS,
}
