import type { ClassementEntry, CoachStyle, Profile, TrainingSession } from '@/types'
import { getDaysLeft, getProgramWeek } from '@/lib/utils/dates'

const STYLE_INSTRUCTIONS: Record<CoachStyle, string> = {
  warm: "Ton style est chaleureux, bienveillant et humain. Tu valorises l'effort autant que la performance. Tu mentionnes ce que le coureur a bien fait avant d'aborder les axes d'amélioration. Tes phrases sont fluides, personnelles. Tu peux parfois poser une question de retour.",
  direct: "Ton style est direct, factuel et efficace. Tu vas à l'essentiel. Tu utilises des chiffres précis. Tu es encourageant mais sans fioritures. Phrases courtes, structure claire.",
  technical: "Ton style est analytique et pédagogique. Tu expliques le pourquoi derrière chaque séance. Tu utilises des termes techniques (VMA, seuil, fractionné, allure spécifique) mais tu les expliques brièvement si nécessaire.",
  playful: "Ton style est enthousiaste, motivant et légèrement décontracté. Tu utilises des formulations dynamiques. Tu célèbres les petites victoires. Tu rappelles souvent la course à venir pour créer de l'excitation.",
}

export const buildSystemPrompt = (profile: Profile, startDate?: string): string => {
  const daysLeft = getDaysLeft()
  const weekNumber = getProgramWeek(startDate ?? process.env.PROGRAM_START_DATE)
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
  noSessionStreak?: number   // nb de semaines consécutives (dont la courante) sans aucune sortie enregistrée
  classement?: ClassementEntry[]   // classement nominatif de la semaine (groupe des 4 coureurs)
}): string => {
  const { profile, weekNumber, plannedSessions, actualLogs, checkin, recentHistory, nextWeekPlanned, nextWeekNumber, noSessionStreak = 0, classement = [] } = params
  const noSessionsLogged = actualLogs.length === 0
  const isFirstWeekWelcome = weekNumber === 1 && noSessionsLogged && !checkin
  const prolongedAbsence = noSessionStreak >= 2
  const streakFirstWeek = weekNumber - noSessionStreak + 1   // 1re semaine de la série sans sortie

  const totalActualKm = (actualLogs as Array<{ distance_km?: number }>)
    .reduce((s, l) => s + (l.distance_km ?? 0), 0)
  const totalPlannedKm = plannedSessions
    .reduce((s, sess) => s + (sess.distance_km ?? 0), 0)
  const ecartKm = totalActualKm - totalPlannedKm
  const ecartLabel = ecartKm >= 0
    ? `+${ecartKm.toFixed(1)} km (au-dessus du programme)`
    : `${ecartKm.toFixed(1)} km (en dessous du programme)`
  const comparisonLine = totalPlannedKm > 0
    ? `Volume planifie : ${totalPlannedKm} km | Volume realise : ${totalActualKm.toFixed(1)} km | Ecart : ${ecartLabel}`
    : 'Pas de programme defini pour cette semaine.'

  // Classement de la semaine, structuré pour distinguer le destinataire (toi) des
  // autres participants. Le coach doit pouvoir commenter n'importe quelle position.
  const moi = classement.find((c) => c.userId === profile.user_id)
  const autres = classement
    .filter((c) => c.userId !== profile.user_id)
    .map((c) => ({ prenom: c.prenom, rang: c.rang, km: Number(c.km.toFixed(1)), sorties: c.sorties }))
  const classementBlock = moi ? `
CLASSEMENT DE LA SEMAINE (donnees reelles du groupe, classe par km parcourus cette semaine, ${classement.length} coureurs) :
toi: ${JSON.stringify({ rang: moi.rang, km: Number(moi.km.toFixed(1)), sorties: moi.sorties })}
autres: ${JSON.stringify(autres)}
CONSIGNE CLASSEMENT (obligatoire, independante de ton style) : integre dans coach_analysis une evocation courte et naturelle de ce classement, glissee dans un paragraphe existant, PAS dans une section separee. Regle de designation stricte : le destinataire (toi) est TOUJOURS designe par "tu"/"toi", JAMAIS par son prenom (${profile.first_name}) a la troisieme personne. Les autres participants sont designes par leur prenom reel, a la troisieme personne (ex : "Hugo est en tete avec 32 km en 4 sorties, toi tu es deuxieme avec 27 km en 3 sorties"). Tu peux commenter factuellement la performance de n'importe quel participant. Reste sur des faits reels (km, sorties, rang) : n'invente jamais un chiffre. Ton taquin ou piquant autorise mais non obligatoire. Aucun tiret cadratin (—) ni demi-cadratin (–).
` : ''

  return `Analyse de la semaine ${weekNumber}/14 pour ${profile.first_name}.

PROGRAMME PRÉVU CETTE SEMAINE :
${plannedSessions.length > 0 ? JSON.stringify(plannedSessions, null, 2) : 'Non disponible'}

STATISTIQUES DE LA SEMAINE (pre-calcule, utilise ces chiffres, ne recalcule pas) :
${comparisonLine}
Sorties planifiees : ${plannedSessions.length} | Sorties realisees : ${(actualLogs as unknown[]).length}

SORTIES RÉALISÉES (training_logs) :
${actualLogs.length > 0 ? JSON.stringify(actualLogs, null, 2) : 'Aucune sortie enregistrée cette semaine.'}

CHECK-IN DE LA SEMAINE :
${checkin ? JSON.stringify(checkin, null, 2) : 'Aucun check-in cette semaine.'}

HISTORIQUE RÉCENT (3 dernières semaines) :
${recentHistory.length > 0 ? JSON.stringify(recentHistory, null, 2) : "Pas encore d'historique."}

PROGRAMME PRÉVU SEMAINE SUIVANTE (semaine ${nextWeekNumber}/14) :
${nextWeekPlanned.length > 0 ? JSON.stringify(nextWeekPlanned, null, 2) : 'Programme semaine suivante non encore défini.'}
${classementBlock}
${isFirstWeekWelcome ? `CONTEXTE PARTICULIER - SEMAINE 1 SANS DONNÉES : c'est le tout début du programme. Rédige un message d'accueil chaleureux et de bienvenue plutôt qu'une analyse de performance. Ne reproche rien.
` : noSessionsLogged ? `CONTEXTE PARTICULIER - AUCUNE SORTIE ENREGISTRÉE CETTE SEMAINE (nous sommes en semaine ${weekNumber}, pas au démarrage du programme) :
${prolongedAbsence ? `C'est la ${noSessionStreak}e semaine CONSÉCUTIVE sans aucune sortie enregistrée (semaines ${streakFirstWeek} à ${weekNumber}). Tu dois montrer que tu as une vision d'ensemble sur ces dernières semaines : évoque explicitement et sans détour cette absence prolongée (nomme le nombre de semaines), avec bienveillance et sans dramatiser ni culpabiliser. Cherche à comprendre ce qui se passe sur la durée (blessure, fatigue persistante, perte de motivation, ou simplement des sorties faites mais jamais notées ?). Cette prise de recul est le coeur de ton message cette semaine.
` : ''}Ne suppose PAS que ${profile.first_name} n'a pas couru : il a peut-être fait des sorties sans les enregistrer dans l'app, ou vécu une période off pour une raison légitime.
Dans ton analyse, demande-lui explicitement, mais sans jamais culpabiliser, s'il a couru sans noter ses séances. Invite-le clairement à faire le point via le check-in hebdomadaire (un bouton "Faire mon check-in" est présent dans cet email) : cela te permet de savoir s'il a couru, comment il se sent, s'il a des douleurs, et d'adapter la suite. Le but est de récupérer l'information et de renouer le contact, pas de faire un reproche. Ne parle jamais de "programme qui démarre" ni de "premières données" : le programme est déjà en cours. Reste bienveillant et garde une porte ouverte pour la suite.
` : ''}Règles d'adaptation du programme semaine suivante :
- Ressenti <= 2 → réduire volume de 10-15%, alléger ou retirer le fractionné
- Douleur >= 1 → ajouter étirements, éviter séances intenses
- Moins de 60% du volume réalisé → ne pas augmenter le volume
- Toutes séances faites + bon ressenti → maintenir la progression prévue
- Semaine 1 sans données → conserver le programme prévu sans modification

Retourne UNIQUEMENT un JSON valide, sans markdown, sans backticks :
{
  "coach_analysis": "Texte bilan 3-5 paragraphes. Utilise UNIQUEMENT les statistiques pre-calculees fournies dans le contexte (volume planifie, volume realise, ecart). Ne recalcule jamais les totaux toi-meme. L'email commence deja par une salutation 'Bonjour ${profile.first_name},' : ne repete PAS cette salutation et ne commence pas ton texte par le prenom. N'ecris le prenom '${profile.first_name}' qu'une seule fois au maximum dans les deux premiers paragraphes, et jamais deux fois a moins de ~50 mots d'intervalle ; ne le reutilise ensuite que si le contexte l'exige vraiment (rare). Commence par ce qui s'est bien passe (ou par un accueil chaleureux si premiere semaine). Aborde les points d'attention sans culpabiliser. Termine en projetant vers la semaine suivante. Jamais de ton militaire. N'utilise JAMAIS de tiret cadratin (—) ni de tiret demi-cadratin (–) : remplace-les par des virgules, des parentheses ou un tiret simple (-), et evite les tirets autant que possible.",
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
Si la question porte sur une douleur, n'aggrave pas l'inquiétude, donne un conseil pratique, et recommande un médecin si la douleur est sévère ou persistante.
Regle de style : n'utilise JAMAIS de tiret cadratin (—) ni de tiret demi-cadratin (–). Remplace-les par des virgules, des parentheses ou un tiret simple (-), et evite les tirets autant que possible.`
}