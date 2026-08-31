// Monnaie fictive "jetons" (J). Stockée en ENTIERS de centièmes de jeton
// (1 jeton = 100), jamais en flottant. Solde de départ = 100 jetons.
export const CENTS_PER_JETON = 100
export const STARTING_BALANCE_CENTS = 100 * CENTS_PER_JETON // 10000 = 100 J

/** Formate des centièmes de jeton en libellé "X J" (séparateur décimal FR). */
export function formatJetons(cents: number): string {
  const jetons = cents / CENTS_PER_JETON
  const rounded = Math.round(jetons * 100) / 100
  const s = Number.isInteger(rounded)
    ? rounded.toString()
    : rounded.toFixed(2).replace(/0$/, '').replace(/[.,]$/, '').replace('.', ',')
  return `${s} J`
}

/** Formate un montant signé (+/-) en jetons, pour l'historique des transactions. */
export function formatJetonsSigned(cents: number): string {
  const sign = cents > 0 ? '+' : ''
  return `${sign}${formatJetons(cents)}`
}
