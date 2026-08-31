import bcrypt from 'bcryptjs'

// PIN à 6 chiffres — jamais stocké en clair. Hash bcrypt (compatible pur JS,
// utilisable sur Node et Cloudflare Workers).
const BCRYPT_COST = 10

/** Génère un PIN à 6 chiffres cryptographiquement aléatoire (avec zéros de tête). */
export function generatePin(): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (buf[0] % 1_000_000).toString().padStart(6, '0')
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_COST)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

// Hash factice, calculé une fois, pour égaliser le temps de réponse du login
// quand aucun compte ne correspond (évite un oracle de timing sur l'existence).
export const DUMMY_PIN_HASH = bcrypt.hashSync('semi-cash-dummy-pin', BCRYPT_COST)
