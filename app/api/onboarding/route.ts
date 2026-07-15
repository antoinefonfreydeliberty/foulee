import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, extractJSON, callClaudeWithRetry } from '@/lib/claude/client'
import { buildSystemPrompt, buildInitialProgramPrompt } from '@/lib/claude/prompts'
import { getWeekStart } from '@/lib/utils/dates'
import type { Profile, ProgramWeek } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const {
      first_name, coach_name, coach_style,
      weight_kg, age, runner_level, weekly_sessions,
      best_recent_time, availability, goal_time, injury_history,
    } = body

    if (!first_name || !coach_name || !age || !runner_level || weekly_sessions === null || !goal_time) {
      return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
    }

    const profileData: Omit<Profile, 'id' | 'created_at'> = {
      user_id: user.id,
      first_name,
      coach_name,
      coach_style,
      weight_kg: weight_kg ? parseFloat(weight_kg) : null,
      age: parseInt(age),
      runner_level,
      weekly_sessions: typeof weekly_sessions === 'number' ? weekly_sessions : parseInt(weekly_sessions) || 4,
      best_recent_time: best_recent_time || null,
      availability: availability ?? [],
      injury_history: injury_history || null,
      goal_time,
      onboarding_completed: false,
    }

    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

    const profile = { ...profileData, id: '', created_at: '' } as Profile
    const startDate = process.env.PROGRAM_START_DATE ?? getWeekStart()

    // Appel Claude - toute erreur remonte au catch global
    const result = await callClaudeWithRetry(async () => {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8192,
        temperature: 0.7,
        system: buildSystemPrompt(profile),
        messages: [{ role: 'user', content: buildInitialProgramPrompt(profile, startDate) }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      return extractJSON(text) as { weeks: ProgramWeek[] }
    })

    const weeks = result.weeks ?? []
    if (weeks.length === 0) {
      throw new Error('Programme vide retourné par Claude')
    }

    const programInserts = weeks.map((w: ProgramWeek) => ({
      user_id: user.id,
      week_start: w.week_start,
      week_number: w.week_number,
      sessions: w.sessions,
      total_volume_km: w.total_volume_km,
      focus: w.focus,
    }))

    const { error: programError } = await supabase
      .from('training_programs')
      .upsert(programInserts, { onConflict: 'user_id,week_start' })

    if (programError) {
      throw new Error(`Erreur d'enregistrement du programme : ${programError.message}`)
    }

    // Marquer onboarding terminé uniquement si tout a réussi
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[onboarding]', error)
    return NextResponse.json(
      { error: 'Impossible de générer le programme. Réessaie.' },
      { status: 500 }
    )
  }
}
