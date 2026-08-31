import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentBettor } from '@/lib/auth/current'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Messages d'erreur levés par la fonction Postgres place_wager → réponse HTTP.
const ERROR_MAP: Record<string, { status: number; message: string }> = {
  STAKE_INVALIDE: { status: 400, message: 'Mise invalide.' },
  SELECTION_INTROUVABLE: { status: 404, message: 'Sélection introuvable.' },
  MARCHE_FERME: { status: 409, message: 'Ce marché est fermé.' },
  PAS_DE_COTE: { status: 409, message: 'Aucune cote disponible pour cette sélection.' },
  PARIEUR_INTROUVABLE: { status: 404, message: 'Parieur introuvable.' },
  SOLDE_INSUFFISANT: { status: 409, message: 'Solde insuffisant.' },
}

// Placement d'une mise (pari SIMPLE : 1 wager = 1 sélection). La cote est figée
// côté serveur (dernière cote en base), le solde est débité de façon ATOMIQUE
// (fonction place_wager, verrou FOR UPDATE) : jamais de solde négatif.
export async function POST(req: NextRequest) {
  const bettor = await getCurrentBettor()
  if (!bettor) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const selectionId = typeof body?.selectionId === 'string' ? body.selectionId : ''
  const stakeCents = body?.stakeCents
  if (!selectionId || !Number.isInteger(stakeCents) || stakeCents <= 0) {
    return NextResponse.json({ error: 'selectionId et stakeCents (entier > 0) requis' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('place_wager', {
    p_bettor_id: bettor.id,
    p_selection_id: selectionId,
    p_stake_cents: stakeCents,
  })

  if (error) {
    // Les messages métier sont levés en MAJUSCULES par la fonction ; on cherche le code.
    const code = Object.keys(ERROR_MAP).find((c) => error.message.includes(c))
    const mapped = code ? ERROR_MAP[code] : { status: 500, message: 'Mise impossible.' }
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }

  // place_wager renvoie une table à une ligne.
  const row = Array.isArray(data) ? data[0] : data
  return NextResponse.json({
    ok: true,
    wagerId: row?.wager_id,
    oddsAtPlacement: Number(row?.odds_at_placement),
    potentialPayoutCents: row?.potential_payout_cents,
    newBalanceCents: row?.new_balance_cents,
  })
}
