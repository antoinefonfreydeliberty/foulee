import { createHash, randomInt } from 'crypto'

/** Génère un code numérique à 6 chiffres */
export function generateOtpCode(): string {
  return randomInt(100000, 999999).toString()
}

/** Hash SHA-256 du code pour stockage sécurisé */
export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}
