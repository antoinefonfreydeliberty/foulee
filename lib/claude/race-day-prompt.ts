import type { Profile } from '@/types'
import { RACE_COURSE_INFO } from '@/lib/data/race-course'

// Stats cumulées réelles depuis le début du programme, PRÉ-CALCULÉES en code
// (jamais recalculées par Claude), même méthode que la page Rapports.
export interface RaceDayStats {
  totalKm: number          // somme des km sur tout le programme
  sessions: number         // nombre total de séances loggées
  longestRunKm: number     // plus longue sortie (km)
  avgPace: string          // allure moyenne globale (calcPace), ex 5'42"
  weeksTrained: number     // nb de semaines distinctes avec au moins une sortie
}

// Structure JSON attendue en retour de Claude (5 blocs).
export interface RaceDayContent {
  preparation_analysis: string   // bloc 1
  success_percentage: number     // bloc 2 (0-100)
  success_message: string        // bloc 2 (formulation bienveillante)
  race_strategy: string          // bloc 3
  target_pace: string | null     // bloc 3 (allure cible déduite du goal_time, null si indéterminable)
  nutrition: string              // bloc 4
  motivation: string             // bloc 5 (mot signé du coach)
}

export const buildRaceDayEmailPrompt = (params: {
  profile: Profile
  stats: RaceDayStats
}): string => {
  const { profile, stats } = params
  const course = RACE_COURSE_INFO

  const keyPointsText = course.keyPoints
    .map((p) => `- km ${String(p.km).replace('.', ',')} : ${p.label}${'note' in p && p.note ? ` (${p.note})` : ''}`)
    .join('\n')

  return `Nous sommes la veille du semi-marathon Auray-Vannes de ${profile.first_name}. La course a lieu demain, le 13 septembre 2026. Tu écris le contenu d'un email personnalisé "J-1" pour préparer ${profile.first_name} au mieux.

PROFIL DU COUREUR :
- Objectif (texte libre du coureur) : ${profile.goal_time ?? 'non renseigné'}
- Meilleur temps récent : ${profile.best_recent_time ?? 'non renseigné'}
- Niveau : ${profile.runner_level ?? 'non renseigné'}
- Historique de blessures : ${profile.injury_history ?? 'aucun'}

PRÉPARATION RÉELLE (statistiques pré-calculées sur tout le programme, utilise ces chiffres, ne recalcule jamais) :
- Volume total parcouru : ${stats.totalKm.toFixed(1)} km
- Nombre de séances enregistrées : ${stats.sessions}
- Plus longue sortie : ${stats.longestRunKm.toFixed(1)} km
- Allure moyenne globale : ${stats.avgPace}
- Nombre de semaines (sur 14) avec au moins une sortie : ${stats.weeksTrained}

PARCOURS DE LA COURSE (données officielles, ne rien inventer au-delà) :
- Distance : ${course.distanceKm.toFixed(3).replace('.', ',')} km
- Dénivelé positif : ${course.elevationGainM} m | Dénivelé négatif : ${course.elevationLossM} m
- Altitude min : ${course.minAltitudeM} m | Altitude max : ${course.maxAltitudeM} m
- Description : ${course.description}
- Points clés du parcours :
${keyPointsText}

Zones de relief à gérer (les 3 côtes) : Baden (km 7,8), Moustoir (km 12), Vincin (km 17,5). Descente de récupération après Locqueltas, du 15e km jusqu'au pied du Vincin.

Produis le contenu de l'email en 5 blocs. Contraintes de ton (absolues) :
- Jamais culpabilisant, jamais militaire, même si la préparation a été légère ou l'objectif ambitieux.
- Le pourcentage de réussite n'est JAMAIS une prédiction certaine ni une pression : c'est une estimation bienveillante. Si le pourcentage est bas, formule autour de ce qui reste possible et de comment aborder la course, pas autour de ce qui a manqué.
${profile.injury_history ? `- Historique de blessures renseigné ("${profile.injury_history}") : évoque-le avec prudence dans la stratégie (ex. gérer une côte si les genoux sont sensibles), sans dramatiser et sans donner de conseil médical précis.\n` : ''}- Tu es ${profile.coach_name}, tu signes le mot de motivation de ton prénom.
- N'utilise JAMAIS de tiret cadratin (—) ni de tiret demi-cadratin (–) : remplace-les par des virgules, des parenthèses ou un tiret simple (-).

Détail des 5 blocs :
1. preparation_analysis : mets en relation l'objectif initial et l'entraînement réellement effectué (volume, régularité), en t'appuyant sur les statistiques pré-calculées. 2 à 3 paragraphes. L'email commence déjà par "Bonjour ${profile.first_name}," : ne répète pas cette salutation.
2. success_percentage (nombre entier 0-100) + success_message : estimation bienveillante des chances d'atteindre l'objectif, présentée avec douceur.
3. race_strategy + target_pace : déduis une allure cible du texte libre de l'objectif ("${profile.goal_time ?? 'non renseigné'}") et mets-la en relation avec le profil du parcours (garder de la réserve avant Baden, Moustoir et le Vincin, viser la récupération dans la descente post-Locqueltas). Dès que l'objectif mentionne un temps ou une notion de vitesse, même formulé simplement (ex. "sous 2h", "finir en 1h50", "battre mon record"), tu DOIS déduire une allure cible sur 21,1 km (ex. "sous 2h" -> environ 5'41"/km). Ne mets target_pace à null que si l'objectif ne parle pas du tout de temps ni de vitesse (ex. "juste terminer", "prendre du plaisir"). Format "m'ss\"/km" (ex. "5'40\\"/km").
4. nutrition : conseils concrets pour la veille (dîner, hydratation, sommeil) et le matin de la course (petit-déjeuner, horaire, dernier ravitaillement avant le départ), en mentionnant les ravitaillements du parcours (km 5, 10, 15) si pertinent.
5. motivation : mot de motivation chaleureux, dans ton style, signé de ton prénom (${profile.coach_name}).

Retourne UNIQUEMENT un JSON valide, sans markdown, sans backticks :
{
  "preparation_analysis": "2 a 3 paragraphes",
  "success_percentage": 65,
  "success_message": "formulation bienveillante autour de l'objectif",
  "race_strategy": "strategie de course en 1 a 2 paragraphes",
  "target_pace": "5'40\\"/km",
  "nutrition": "veille + matin de course",
  "motivation": "mot de motivation signe ${profile.coach_name}"
}`
}
