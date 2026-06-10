import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CoachMessage } from '@/components/coach/CoachMessage'
import ConseilsClient from '@/components/conseils/ConseilsClient'

const DEFAULT_TIPS = [
  {
    category: 'Nutrition',
    tip: "Hydrate-toi régulièrement, même en dehors des entraînements. Un coureur bien hydraté récupère mieux et performe mieux. Vise 1,5 à 2L d'eau par jour.",
  },
  {
    category: 'Récupération',
    tip: "Le sommeil est ton meilleur allié. 7 à 9h par nuit permettent à tes muscles de se reconstruire. Évite les écrans 30 minutes avant de dormir.",
  },
  {
    category: 'Mental',
    tip: "La régularité prime sur l'intensité. Une sortie moyenne mais faite vaut mieux qu'une sortie parfaite annulée. Chaque entraînement compte, même les petits.",
  },
]

export default async function ConseilsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: report }] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, coach_name, coach_style')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('weekly_reports')
      .select('coach_tips, week_number, generated_at')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!profile) redirect('/onboarding')

  const tips       = (report?.coach_tips as { category: string; tip: string }[] | null) ?? DEFAULT_TIPS
  const isDefault  = !report?.coach_tips
  const weekLabel  = report?.week_number != null
    ? `Semaine ${report.week_number}`
    : null

  const coachBubbleMsg = isDefault
    ? `Conseils généraux pour bien démarrer. Tes conseils personnalisés arriveront après ton premier bilan 📚`
    : `${tips.length} conseil${tips.length > 1 ? 's' : ''} pour cette semaine, adaptés à ta progression 📚`

  return (
    <div style={{ background: '#F4F0EA', minHeight: '100%', paddingTop: 2 }}>

      {/* Header */}
      <div style={{ padding: '2px 18px 12px' }}>
        <h1 style={{ color: '#160E08', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.8 }}>
          Conseils
        </h1>
        {weekLabel && (
          <p style={{ color: '#6E5E55', fontSize: 11, margin: '2px 0 0', fontWeight: 500 }}>{weekLabel}</p>
        )}
      </div>

      {/* Coach Bubble */}
      <CoachMessage coachName={profile.coach_name} content={coachBubbleMsg} />

      {/* Filtres + Cards (client) */}
      <ConseilsClient tips={tips} coachName={profile.coach_name} weekLabel={weekLabel} />

    </div>
  )
}
