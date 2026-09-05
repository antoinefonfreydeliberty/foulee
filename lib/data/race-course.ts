// Infos parcours du semi-marathon Auray-Vannes (statiques, identiques pour les 4
// coureurs). Données officielles disponibles : distance, D+/D-, min/max altitude,
// et les 4 zones de relief décrites. Ne pas fabriquer de découpage altimétrique
// km par km au-delà des keyPoints ci-dessous.
export const RACE_COURSE_INFO = {
  distanceKm: 21.110,
  elevationGainM: 156,
  elevationLossM: 152,
  minAltitudeM: 6,
  maxAltitudeM: 49,
  description: `Semi-marathon Auray-Vannes, créé en 1975, dernière version du circuit en 2015, mesuré officiellement.
Le départ se situe à Pluneret avec une belle ligne droite et un premier kilomètre en léger faux plat.
L'arrivée se déroule sur le stade de Kercado à Vannes, avec près de 300 m à courir sur la piste d'athlétisme.
La première montée significative se situe à Baden (km 7,8) sur 600 m pour rejoindre le bourg.
La seconde montée démarre dans le bourg du Moustoir (km 12) sur 350 m, puis une partie faux plat sur près d'1 km jusqu'au rond-point de Locqueltas.
Ensuite, un profil descendant permet de récupérer du 15e kilomètre jusqu'au pied de la côte du Vincin (km 17,5).
De nombreux spectateurs sont massés dans cette côte de 250 m.
Le plus dur est fait : il reste 3 km à courir dans les rues de Vannes jusqu'à l'arrivée.`,
  keyPoints: [
    { km: 0, label: "Départ Pluneret", note: "ligne droite, léger faux plat" },
    { km: 5, label: "Ravitaillement" },
    { km: 7.8, label: "Montée de Baden", note: "600 m pour rejoindre le bourg" },
    { km: 10, label: "Ravitaillement" },
    { km: 12, label: "Montée du Moustoir", note: "350 m, puis faux plat ~1 km jusqu'à Locqueltas" },
    { km: 15, label: "Ravitaillement, début de descente" },
    { km: 17.5, label: "Côte du Vincin", note: "250 m, très fréquentée par le public" },
    { km: 21.1, label: "Arrivée stade de Kercado, Vannes", note: "300 m sur piste d'athlétisme" }
  ]
} as const
