import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWeekStart } from '@/lib/utils/dates'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { sessionsCount, totalDistanceKm, feelingScore, painLevel, painNotes, freeWord } = body

    if (sessionsCount === null || sessionsCount === undefined) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
    }

    const weekStart = getWeekStart()

    const { error } = await supabase
      .from('weekly_checkins')
      .upsert({
        user_id: user.id,
        week_start: weekStart,
        sessions_count: sessionsCount,
        total_distance_km: totalDistanceKm ?? 0,
        feeling_score: feelingScore ?? null,
        pain_level: painLevel ?? 0,
        pain_notes: painNotes || null,
        free_word: freeWord || null,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'user_id,week_start' })

    if (error) {
      console.error('[checkin]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[checkin]', error)
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 })
  }
}
