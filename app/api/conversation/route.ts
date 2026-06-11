import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/claude/client'
import { buildSystemPrompt, buildConversationPrompt } from '@/lib/claude/prompts'
import { getProgramWeek, getProgramWeekStart } from '@/lib/utils/dates'
import { calcPace } from '@/lib/utils/pace'
import type { CoachConversation, Profile, TrainingSession } from '@/types'

type RawLog = { date: string; distance_km: number; duration_minutes: number }

function buildTrainingHistorySummary(
  logs: RawLog[],
  weekNumber: number,
  programStart: string
): string {
  if (!logs || logs.length === 0) return 'Aucune sortie enregistrée récemment.'

  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
  const summaries: string[] = []

  for (let offset = 3; offset >= 0; offset--) {
    const wNum = weekNumber - offset
    if (wNum < 1) continue

    const wStart = getProgramWeekStart(programStart, wNum)
    const wStartDate = new Date(wStart + 'T00:00:00')
    const wEndDate = new Date(wStartDate)
    wEndDate.setDate(wEndDate.getDate() + 6)
    const wEnd = wEndDate.toISOString().split('T')[0]

    const weekLogs = logs.filter(l => l.date >= wStart && l.date <= wEnd)
    if (weekLogs.length === 0) continue

    const totalKm = weekLogs.reduce((sum, l) => sum + (l.distance_km ?? 0), 0)
    const totalMins = weekLogs.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0)
    const avgPace = totalKm > 0 && totalMins > 0 ? calcPace(totalKm, totalMins) : '--'
    const sessions = weekLogs.length

    summaries.push(
      `Semaine ${wNum} (${fmt.format(wStartDate)}-${fmt.format(wEndDate)}) : ${totalKm > 0 ? totalKm.toFixed(1) : '--'} km, ${sessions} séance${sessions > 1 ? 's' : ''}, allure moy ${avgPace}/km`
    )
  }

  return summaries.length > 0 ? summaries.join('\n') : 'Aucune sortie enregistrée récemment.'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Non authentifié', { status: 401 })

    const { message } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message vide.' }, { status: 400 })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!profileData) return new Response('Profil introuvable', { status: 404 })
    const profile = profileData as Profile

    const programStart = process.env.PROGRAM_START_DATE ?? '2026-06-09'
    const weekNumber = Math.max(1, getProgramWeek(programStart))
    const currentWeekStart = getProgramWeekStart(programStart, weekNumber)
    const lookbackWeekNumber = Math.max(1, weekNumber - 3)
    const lookbackStart = getProgramWeekStart(programStart, lookbackWeekNumber)

    const [{ data: history }, { data: checkin }, { data: program }, { data: logsData }] = await Promise.all([
      supabase
        .from('coach_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50),
      supabase
        .from('weekly_checkins')
        .select('feeling_score, pain_notes')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('training_programs')
        .select('sessions')
        .eq('user_id', user.id)
        .eq('week_start', currentWeekStart)
        .maybeSingle(),
      supabase
        .from('training_logs')
        .select('date, distance_km, duration_minutes')
        .eq('user_id', user.id)
        .gte('date', lookbackStart)
        .order('date', { ascending: true }),
    ])

    const messages = (history ?? []) as CoachConversation[]
    const currentSessions = (program?.sessions ?? []) as TrainingSession[]
    const trainingHistory = buildTrainingHistorySummary(
      (logsData ?? []) as RawLog[],
      weekNumber,
      programStart
    )

    await supabase.from('coach_conversations').insert({
      user_id: user.id,
      role: 'user',
      content: message.trim(),
    })

    const conversationHistory = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const userPrompt = buildConversationPrompt({
      profile,
      weekNumber,
      feelingScore: checkin?.feeling_score ?? null,
      painNotes: checkin?.pain_notes ?? null,
      currentWeekProgram: currentSessions,
      trainingHistory,
      userMessage: message.trim(),
    })

    conversationHistory.push({ role: 'user', content: userPrompt })

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.7,
      system: buildSystemPrompt(profile),
      messages: conversationHistory,
    })

    let fullResponse = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              fullResponse += text
              controller.enqueue(new TextEncoder().encode(text))
            }
          }
        } catch (streamError) {
          console.error('[conversation stream]', streamError)
          controller.error(streamError)
          return
        }

        if (fullResponse) {
          await supabase.from('coach_conversations').insert({
            user_id: user.id,
            role: 'assistant',
            content: fullResponse,
          })
        }

        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    })

  } catch (error) {
    console.error('[conversation]', error)
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 })
  }
}
