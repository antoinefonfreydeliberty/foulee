import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

const CATEGORY_ICONS: Record<string, string> = {
  Nutrition: '🥗',
  Récupération: '😴',
  Mental: '🧠',
}

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

  const tips = (report?.coach_tips as { category: string; tip: string }[] | null) ?? DEFAULT_TIPS
  const isDefault = !report?.coach_tips

  const generatedDate = report?.generated_at
    ? new Date(report.generated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : null

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#3D2314' }}>
          Conseils de {profile.coach_name}
        </h1>
        <p style={{ fontSize: 13, color: '#A07860', marginTop: 4 }}>
          {isDefault
            ? 'Conseils généraux · Tes conseils personnalisés arriveront après ton premier bilan.'
            : `Semaine ${report!.week_number}${generatedDate ? ` · ${generatedDate}` : ''}`}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tips.map(tip => (
          <div key={tip.category} style={{
            background: 'white',
            border: '0.5px solid #EEE0D0',
            borderRadius: 12,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[tip.category] ?? '💡'}</span>
              <span style={{ fontWeight: 600, color: '#3D2314', fontSize: 14 }}>
                {tip.category}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#3D2314', lineHeight: 1.6 }}>
              {tip.tip}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: '#C1532B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
        }}>
          {profile.coach_name.charAt(0)}
        </div>
        <span style={{ fontSize: 13, color: '#A07860' }}>
          {profile.coach_name} · Coach Foulée
        </span>
      </div>

    </div>
  )
}
