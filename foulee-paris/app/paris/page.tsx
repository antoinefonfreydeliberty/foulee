import { requireBettor } from '@/lib/auth/current'
import { loadBoard } from '@/lib/markets'
import { betsClosed } from '@/lib/odds/recompute'
import { ParisClient } from './ParisClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function ParisPage() {
  const bettor = await requireBettor()
  const board = await loadBoard()

  return (
    <ParisClient
      firstName={bettor.first_name}
      initialBalanceCents={bettor.balance_cents}
      board={board}
      betsClosed={betsClosed()}
    />
  )
}
