import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { anthropic, MODEL, extractJSON, callClaudeWithRetry } from '@/lib/claude/client'
import { buildSystemPrompt, buildWeeklyReportPrompt } from '@/lib/claude/prompts'
import { sendWeeklyEmail } from '@/lib/brevo/client'
import { buildEmailHtml } from '@/lib/brevo/email-builder'
import { getDaysLeft, getProgramWeek, getProgramWeekStart } from '@/lib/utils/dates'
import { calcPace } from '@/lib/utils/pace'
import type { Profile, TrainingSession } from '@/types'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_completed', true)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ success: true, processed: 0, skipped: 0, errors: [] })
  }

  const processed: string[] = []
  const skipped: string[] = []
  const errors: { user: string; error: string }[] = []

  for (const profile of profiles as Profile[]) {
    try {
      const programStart = process.env.PROGRAM_START_DATE!
      const weekNumber = Math.max(1, getProgramWeek(programStart))
      const weekStart = getProgramWeekStart(programStart, weekNumber)
      const nextWeekNumber = Math.min(weekNumber + 1, 14)
      const nextWeekStart = getProgramWeekStart(programStart, nextWeekNumber)

      // Idempotence: skip if email already sent this week
      const { data: existingReport } = await supabase
        .from('weekly_reports')
        .select('email_sent_at')
        .eq('user_id', profile.user_id)
        .eq('week_start', weekStart)
        .maybeSingle()

      if (existingReport?.email_sent_at) {
        console.log(`Skipped ${profile.first_name}: email already sent this week`)
        skipped.push(profile.first_name)
        continue
      }

      const [
        { data: currentProgram },
        { data: nextProgram },
        { data: logs },
        { data: checkin },
        { data: recentReports },
      ] = await Promise.all([
        supabase.from('training_programs').select('sessions').eq('user_id', profile.user_id).eq('week_start', weekStart).maybeSingle(),
        supabase.from('training_programs').select('sessions').eq('user_id', profile.user_id).eq('week_start', nextWeekStart).maybeSingle(),
        supabase.from('training_logs').select('*').eq('user_id', profile.user_id).gte('date', weekStart).lt('date', nextWeekStart),
        supabase.from('weekly_checkins').select('*').eq('user_id', profile.user_id).eq('week_start', weekStart).maybeSingle(),
        supabase.from('weekly_reports').select('*').eq('user_id', profile.user_id).order('week_start', { ascending: false }).limit(3),
      ])

      const plannedSessions = (currentProgram?.sessions ?? []) as TrainingSession[]
      const nextWeekPlanned = (nextProgram?.sessions ?? []) as TrainingSession[]
      const actualLogs = logs ?? []

      // Generate weekly report JSON
      const reportResult = await callClaudeWithRetry(async () => {
        const msg = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 2000,
          temperature: 0.7,
          system: buildSystemPrompt(profile, process.env.PROGRAM_START_DATE),
          messages: [{
            role: 'user',
            content: buildWeeklyReportPrompt({
              profile,
              weekNumber,
              plannedSessions,
              actualLogs,
              checkin: checkin ?? null,
              recentHistory: recentReports ?? [],
              nextWeekPlanned,
              nextWeekNumber,
            }),
          }],
        })
        const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
        return extractJSON(text) as {
          coach_analysis: string
          coach_tips: unknown[]
          next_week_program: TrainingSession[]
          adaptation_notes: string
        }
      })

      // Compute stats
      const totalKm = actualLogs.reduce((s: number, l: { distance_km: number }) => s + (l.distance_km ?? 0), 0)
      const totalMin = actualLogs.reduce((s: number, l: { duration_minutes: number }) => s + (l.duration_minutes ?? 0), 0)
      const avgPace = totalKm > 0 ? calcPace(totalKm, totalMin) : '--\'--"'
      const stats = { distance: totalKm, sessions: actualLogs.length, avg_pace: avgPace }

      // Get user email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id)
      const userEmail = userData?.user?.email ?? ''

      // Plain dashboard URL (no single-use magic token: Gmail's link prescan
      // consumes one-time links before the user clicks). If the session is valid
      // the click opens the dashboard directly; otherwise proxy.ts redirects to
      // /login where the OTP flow takes over.
      const magicLink = `${process.env.NEXT_PUBLIC_URL}/dashboard`

      // Generate email HTML from template
      const htmlContent = buildEmailHtml({
        firstName:       profile.first_name,
        coachName:       profile.coach_name,
        coachAnalysis:   reportResult.coach_analysis,
        stats,
        nextWeekProgram: reportResult.next_week_program,
        weekNumber,
        daysLeft:        getDaysLeft(),
        nextWeekStart,
        magicLink,
      })

      // Upsert weekly report
      const { data: reportRow } = await supabase
        .from('weekly_reports')
        .upsert({
          user_id: profile.user_id,
          week_start: weekStart,
          week_number: weekNumber,
          coach_analysis: reportResult.coach_analysis,
          email_body: htmlContent,
          stats,
          next_week_program: reportResult.next_week_program,
          coach_tips: reportResult.coach_tips,
        }, { onConflict: 'user_id,week_start' })
        .select()
        .single()

      // Upsert next week program if Claude returned an adaptation
      if (reportResult.next_week_program?.length > 0) {
        await supabase.from('training_programs').upsert({
          user_id: profile.user_id,
          week_start: nextWeekStart,
          week_number: nextWeekNumber,
          sessions: reportResult.next_week_program,
        }, { onConflict: 'user_id,week_start' })
      }

      // Send email or log in test mode
      const senderVerified = process.env.BREVO_SENDER_VERIFIED === 'true'
      if (userEmail) {
        if (senderVerified) {
          await sendWeeklyEmail({
            to: userEmail,
            toName: profile.first_name,
            coachName: profile.coach_name,
            htmlContent,
            weekNumber,
          })

          if (reportRow) {
            await supabase
              .from('weekly_reports')
              .update({ email_sent_at: new Date().toISOString() })
              .eq('id', reportRow.id)
          }
        } else {
          console.log(`[TEST MODE] Email HTML for ${profile.first_name}:\n${htmlContent}`)
          console.log(`[TEST MODE] Magic link: ${magicLink}`)
        }
      }

      processed.push(profile.first_name)
    } catch (err) {
      console.error(`Error processing ${profile.first_name}:`, err)
      errors.push({ user: profile.first_name, error: String(err) })
    }
  }

  return NextResponse.json({
    success: true,
    processed: processed.length,
    skipped: skipped.length,
    errors,
  })
}
