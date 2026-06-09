import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { date, distanceKm, durationMinutes, pacePerKm, feeling, painNotes, notes } = body

    if (!date || !distanceKm || distanceKm <= 0) {
      return NextResponse.json({ error: 'Distance obligatoire.' }, { status: 400 })
    }
    if (!durationMinutes || durationMinutes <= 0) {
      return NextResponse.json({ error: 'Durée obligatoire.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('training_logs')
      .insert({
        user_id: user.id,
        date,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        pace_per_km: pacePerKm ?? null,
        feeling: feeling ?? null,
        pain_notes: painNotes ?? null,
        notes: notes ?? null,
      })

    if (error) {
      console.error('[training-log]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[training-log]', error)
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 })
  }
}
