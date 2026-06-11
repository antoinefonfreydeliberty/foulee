import type { CoachStyle, Profile, TrainingSession } from '@/types'
import { getDaysLeft, getProgramWeek } from '@/lib/utils/dates'

const STYLE_INSTRUCTIONS: Record<CoachStyle, string> = {
  warm: "Ton style est chaleureux, bienveillant et humain. Tu valorises l'effort autant que la performance. Tu mentionnes ce que le coureur a bien fait avant d'aborder les axes d'amélioration. Tes phrases sont fluides, personnelles. Tu peux parfois poser une question de retour.",
  direct: "Ton style est direct, factuel et efficace. Tu vas à l'essentiel. Tu utilises des chiffres précis. Tu es encourageant mais sans fioritures. Phrases courtes, structure claire.",
  technical: "Ton style est analytique et pédagogique. Tu expliques le pourquoi derrière chaque séance. Tu utilises des termes techniques (VMA, seuil, fractionné, allure spécifique) mais tu les expliques brièvement si nécessaire.",
  playful: "Ton style est enthousiaste, motivant et légèrement décontracté. Tu utilises des formulations dynamiques. Tu célèbres les petites victoires. Tu rappelles souvent la course à venir pour créer de l'excitation.",
}

export const buildSystemPrompt = (profile: Profile): string => {
  const daysLeft = getDaysLeft()
  const weekNumber = getProgramWeek()
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `Tu es ${profile.coach_name}, le coach personnel de ${profile.first_name}.
Tu prépares ${profile.first_name} pour le semi-marathon Vannes-Auray du 13 septembre 2026.
Aujourd'hui, nous sommes le ${today}. Il reste ${daysLeft} jours avant la course.
C'est la semaine ${weekNumber} sur 14 du programme.

Profil de ${profile.first_name} :
- Niveau : ${profile.runner_level ?? 'non renseigné'}
- Objectif : ${profile.goal_time ?? 'non renseigné'}
- Disponibilités : ${profile.availability?.join(', ') ?? 'non renseignées'}
- Historique de blessures : ${profile.injury_history ?? 'aucun'}

${STYLE_INSTRUCTIONS[profile.coach_style]}

Règles absolues :
- Tu ne fournis jamais d'avis médical. En cas de douleur sévère, tu recommandes de consulter un médecin.
- Tu n'utilises jamais un ton militaire ou culpabilisant.
- Tu appelles ${profile.first_name} par son prénom.
- Tu ne mentionnes jamais que tu es une IA.
- Tu parles toujours en français.`
}

export const buildInitialProgramPrompt = (profile: Profile, startDate: string): string => {
  return `Génère un programme d'entraînement semi-marathon sur 14 semaines pour ${profile.first_name}.

Date de début : ${startDate}
Date de la course : 13 septembre 2026

Profil :
- Niveau : ${profile.runner_level}
- Sorties habituelles par semaine : ${profile.weekly_sessions}
- Disponibilités : ${profile.availability?.join(', ')}
- Objectif : ${profile.goal_time}
- Performances récentes : ${profile.best_recent_time ?? 'non renseigné'}
- Blessures : ${profile.injury_history ?? 'aucune'}

Génère un programme progressif respectant les principes suivants :
- Augmentation graduelle du volume (max +10% par semaine)
- Alternance endurance / fractionné / sortie longue
- Semaines de récupération toutes les 3-4 semaines
- Réduction du volume les 2 dernières semaines (tapering)
- Jours de repos respectant les disponibilités

Retourne UNIQUEMENT un JSON valide avec ce format :
{
  "weeks": [
    {
      "week_number": 1,
      "week_start": "${startDate}",
      "focus": "Endurance de base",
      "total_volume_km": 30,
      "sessions": [
        {
          "day": "mardi",
          "type": "endurance",
          "label": "Sortie endurance",
          "description": "8 km à allure confortable (6'00\\\"/km)",
          "distance_km": 8,
          "duration_minutes": 48
        }
      ]
    }
  ]
}`
}

export const buildWeeklyReportPrompt = (params: {
  profile: Profile
  weekNumber: number
  plannedSessions: TrainingSession[]
  actualLogs: unknown[]
  checkin: unknown | null
  recentHistory: unknown[]
  nextWeekPlanned: TrainingSession[]
  nextWeekNumber: number
}): string => {
  const { profile, weekNumber, plannedSessions, actualLogs, checkin, recentHistory, nextWeekPlanned, nextWeekNumber } = params
  const noData = actualLogs.length === 0 && !checkin

  return `Analyse de la semaine ${weekNumber}/14 pour ${profile.first_name}.

PROGRAMME PRÉVU CETTE SEMAINE :
${plannedSessions.length > 0 ? JSON.stringify(plannedSessions, null, 2) : 'Non disponible'}

SORTIES RÉALISÉES (training_logs) :
${actualLogs.length > 0 ? JSON.stringify(actualLogs, null, 2) : 'Aucune sortie enregistrée cette semaine.'}

CHECK-IN DE LA SEMAINE :
${checkin ? JSON.stringify(checkin, null, 2) : 'Aucun check-in cette semaine.'}

HISTORIQUE RÉCENT (3 dernières semaines) :
${recentHistory.length > 0 ? JSON.stringify(recentHistory, null, 2) : "Pas encore d'historique."}

PROGRAMME PRÉVU SEMAINE SUIVANTE (semaine ${nextWeekNumber}/14) :
${nextWeekPlanned.length > 0 ? JSON.stringify(nextWeekPlanned, null, 2) : 'Programme semaine suivante non encore défini.'}

${noData ? `CONTEXTE PARTICULIER : C'est la première semaine du programme, ou ${profile.first_name} n'a pas encore enregistré de données.
Rédige un message d'encouragement et de bienvenue dans le programme plutôt qu'une analyse de performance.
` : ''}Règles d'adaptation du programme semaine suivante :
- Ressenti <= 2 → réduire volume de 10-15%, alléger ou retirer le fractionné
- Douleur >= 1 → ajouter étirements, éviter séances intenses
- Moins de 60% du volume réalisé → ne pas augmenter le volume
- Toutes séances faites + bon ressenti → maintenir la progression prévue
- Semaine 1 sans données → conserver le programme prévu sans modification

Retourne UNIQUEMENT un JSON valide, sans markdown, sans backticks :
{
  "coach_analysis": "Texte bilan 3-5 paragraphes. Commence par ce qui s'est bien passé (ou par un accueil chaleureux si première semaine). Aborde les points d'attention sans culpabiliser. Termine en projetant vers la semaine suivante. Jamais de ton militaire.",
  "coach_tips": [
    { "category": "Nutrition", "tip": "Conseil personnalisé court." },
    { "category": "Récupération", "tip": "Conseil personnalisé court." },
    { "category": "Mental", "tip": "Conseil personnalisé court." }
  ],
  "next_week_program": [
    {
      "day": "mardi",
      "type": "endurance",
      "label": "Sortie endurance",
      "description": "10 km à allure confortable",
      "distance_km": 10,
      "duration_minutes": 60
    }
  ],
  "adaptation_notes": "Notes internes sur les adaptations effectuées."
}`
}

export const buildConversationPrompt = (params: {
  profile: Profile
  weekNumber: number
  feelingScore: number | null
  painNotes: string | null
  currentWeekProgram: TrainingSession[]
  trainingHistory?: string
  userMessage: string
}): string => {
  const { profile, weekNumber, feelingScore, painNotes, currentWeekProgram, trainingHistory, userMessage } = params

  return `Contexte récent de ${profile.first_name} :
- Semaine ${weekNumber} sur 14
- Dernier ressenti (check-in) : ${feelingScore ? `${feelingScore}/5` : 'non renseigné'}
- Douleurs signalées : ${painNotes ?? 'aucune'}
- Programme en cours : ${JSON.stringify(currentWeekProgram)}
${trainingHistory ? `- Historique d'entraînement (4 dernières semaines) :\n${trainingHistory}` : ''}

Question de ${profile.first_name} : ${userMessage}

Réponds en restant dans ton style ${profile.coach_style}. Sois concis et actionnable.
Si la question porte sur une douleur, n'aggrave pas l'inquiétude, donne un conseil pratique, et recommande un médecin si la douleur est sévère ou persistante.`
}
"N'utilise jamais de tirets cadratin (—). Utilise des virgules, des parenthèses ou des tirets simples (-) à la place."