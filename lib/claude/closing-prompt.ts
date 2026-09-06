import type { Profile } from '@/types'

// ---------------------------------------------------------------------------
// Prompt de l'email de CLOTURE (dimanche de la course, semaine 14/14).
// Fichier dédié pour ne pas alourdir buildWeeklyReportPrompt (semaines 1-13,
// non-régression). Bilan global des 14 semaines + résultat du jour J mis en
// avant ; AUCUN programme de semaine suivante (le programme est terminé).
// ---------------------------------------------------------------------------

// Stats cumulées réelles sur tout le programme, PRE-CALCULEES en code (jamais
// recalculées par Claude), même méthode que la page Rapports / l'email J-1.
export interface ClosingStats {
  totalKm: number          // somme des km sur les 14 semaines
  sessions: number         // nombre total de séances loggées
  longestRunKm: number     // plus longue sortie (km)
  avgPace: string          // allure moyenne globale (calcPace), ex 5'42"
  weeksTrained: number     // nb de semaines distinctes (sur 14) avec au moins une sortie
}

// Résultat de course du jour J (séance loggée à RACE_DATE), null si pas encore
// enregistré au moment de l'envoi.
export interface RaceResult {
  distanceKm: number
  durationLabel: string    // ex "1 h 52"
  pace: string | null      // ex 5'18"/km
  feeling: number | null   // 1-5
}

// Une entrée du podium final (classé par temps de course). hasResult=false pour
// un coureur qui n'a pas encore enregistré son résultat.
export interface ClosingPodiumEntry {
  rang: number | null      // null si pas de résultat
  prenom: string
  timeLabel: string | null // ex "1 h 52", null si pas de résultat
  hasResult: boolean
}

// Structure JSON attendue en retour de Claude (bilan + conseils post-course).
export interface ClosingContent {
  coach_analysis: string
  coach_tips: { category: string; tip: string }[]
}

export const buildClosingReportPrompt = (params: {
  profile: Profile
  stats: ClosingStats
  raceResult: RaceResult | null
  goalTime: string | null
  podium: ClosingPodiumEntry[]
}): string => {
  const { profile, stats, raceResult, goalTime, podium } = params

  const raceBlock = raceResult
    ? `RESULTAT DU JOUR J (séance enregistrée aujourd'hui, jour de la course, utilise ces chiffres, ne recalcule pas) :
- Distance : ${raceResult.distanceKm.toFixed(1).replace('.', ',')} km
- Temps : ${raceResult.durationLabel}
- Allure moyenne : ${raceResult.pace ?? 'non calculée'}
- Ressenti déclaré : ${raceResult.feeling ? `${raceResult.feeling}/5` : 'non renseigné'}`
    : `RESULTAT DU JOUR J : ${profile.first_name} n'a PAS encore enregistré sa course dans l'app au moment de cet envoi. Ne suppose rien sur son résultat ni sur le fait qu'il ait couru ou non. Invite-le simplement, sans jamais culpabiliser, à enregistrer sa course sur le dashboard pour compléter son bilan (un bouton est présent dans l'email). Reste chaleureux : c'est un jour de fête, pas un rappel administratif.`

  // Podium factuel (temps de course). Le coach peut le mentionner brièvement mais
  // ne doit jamais inventer un chiffre ; l'email l'affiche déjà de façon statique.
  const podiumJson = JSON.stringify(
    podium.map((e) => ({ rang: e.rang, prenom: e.prenom, temps: e.timeLabel, resultat_enregistre: e.hasResult })),
  )

  return `C'est le jour du semi-marathon Auray-Vannes de ${profile.first_name} : la course a eu lieu aujourd'hui, 13 septembre 2026. C'est le dernier jour du programme de 14 semaines. Tu écris le BILAN DE CLOTURE : un email chaleureux qui clôt les 14 semaines et célèbre le chemin parcouru. Il n'y a PLUS de semaine suivante ni de programme à venir.

PROFIL DU COUREUR :
- Objectif initial (texte libre) : ${goalTime ?? 'non renseigné'}
- Niveau : ${profile.runner_level ?? 'non renseigné'}
- Historique de blessures : ${profile.injury_history ?? 'aucun'}

BILAN GLOBAL DES 14 SEMAINES (statistiques pré-calculées, utilise ces chiffres, ne recalcule jamais) :
- Volume total parcouru : ${stats.totalKm.toFixed(1)} km
- Nombre total de séances : ${stats.sessions}
- Plus longue sortie : ${stats.longestRunKm.toFixed(1)} km
- Allure moyenne globale : ${stats.avgPace}
- Semaines actives (sur 14) : ${stats.weeksTrained}

${raceBlock}

PODIUM DU GROUPE (classé par temps de course réel, donnée factuelle) : ${podiumJson}

Contraintes de ton (absolues) :
- Jamais culpabilisant, jamais militaire, quel que soit le résultat ou la régularité de la préparation.
- C'est un moment de célébration et de gratitude pour le travail accompli sur 14 semaines, pas une évaluation.
- Tu es ${profile.coach_name}. Tu t'adresses à ${profile.first_name} en le tutoyant.
- N'utilise JAMAIS de tiret cadratin (—) ni de tiret demi-cadratin (–) : remplace-les par des virgules, des parenthèses ou un tiret simple (-), et évite les tirets autant que possible.

Contenu attendu :
- coach_analysis : 3 à 4 paragraphes. L'email commence déjà par "Bonjour ${profile.first_name}," : ne répète pas cette salutation et ne commence pas par le prénom. Reviens sur le chemin des 14 semaines en t'appuyant UNIQUEMENT sur les statistiques pré-calculées (volume total, séances, plus longue sortie, semaines actives). ${raceResult ? "Mets en avant le résultat de la course d'aujourd'hui (temps, allure) avec fierté et chaleur, en le reliant à l'objectif initial sans en faire un jugement." : "Comme la course n'est pas encore enregistrée, célèbre le chemin parcouru et invite avec douceur à enregistrer le résultat pour compléter le bilan."} Termine par un mot de clôture chaleureux qui tourne la page de cette préparation. Ne parle jamais d'une "semaine prochaine" ni d'un "prochain programme".
- coach_tips : exactement 3 conseils courts et personnalisés orientés APRES-COURSE (récupération, célébration/repos, et la suite de manière ouverte, sans imposer un nouvel objectif).

Retourne UNIQUEMENT un JSON valide, sans markdown, sans backticks :
{
  "coach_analysis": "3 a 4 paragraphes de bilan de cloture",
  "coach_tips": [
    { "category": "Récupération", "tip": "Conseil court post-course." },
    { "category": "Célébration", "tip": "Conseil court." },
    { "category": "La suite", "tip": "Conseil court, ouvert, sans pression." }
  ]
}`
}
