import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Suppression d'une séance du Journal. Client scopé à la session (createClient) :
// la policy RLS `own_training_logs` (auth.uid() = user_id, cmd ALL) garantit
// qu'un utilisateur ne peut supprimer que ses propres séances. Pas de filtre
// manuel sur user_id nécessaire, mais on vérifie la session avant toute requête.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params

    // .select() renvoie les lignes réellement supprimées. RLS filtre en amont :
    // un id inexistant OU appartenant à un autre utilisateur => 0 ligne => 404.
    const { data, error } = await supabase
      .from('training_logs')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) {
      console.error('[training-log:delete]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Séance introuvable.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[training-log:delete]', error)
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 })
  }
}
