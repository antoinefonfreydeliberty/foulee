# Changelog Foulée

Fichier de changelog évolutif de l'application **Foulée** (scope : foulée actuel, hors `foulee_pro/`).
À compléter à chaque modification. Entrée la plus récente en haut.

---

## 2026-07-15 (suite 2) — Absence prolongée : vision longue + bouton check-in

- **Schéma `weekly_checkins` réaligné dans Foulée.md** sur le réel (`sessions_count`, `total_distance_km`, `feeling_score`, `pain_level`, `pain_notes`, `free_word`, `week_start`, `submitted_at` ; pas de `week_number` ni `energy_level`/`motivation_level`/`physical_tags`/`program_followed`/`free_comment`).
- **Vision longue sur l'absence de sorties (`buildWeeklyReportPrompt` + cron) :**
  - Le cron calcule `noSessionStreak` = nombre de semaines consécutives (dont la courante) sans aucune sortie enregistrée, à partir de tous les `training_logs` depuis le début du programme.
  - Quand ce streak ≥ 2, le coach reçoit la consigne d'évoquer explicitement l'absence prolongée (en nommant le nombre de semaines et la plage), avec recul et bienveillance, et de chercher à comprendre sur la durée (blessure, fatigue, motivation, ou sorties non notées).
- **Bouton check-in dans l'email (`buildEmailHtml`) :** quand aucune séance n'est enregistrée pour la semaine, le CTA principal devient « Faire mon check-in » (→ `/dashboard/checkin`), avec un lien secondaire vers le dashboard. En semaine normale, le CTA reste « Ouvrir mon dashboard ». Nouveau param `checkinLink` (optionnel, fallback `magicLink`).
- **Note technique :** `noSessionStreak` et `checkinLink` rendus **optionnels** volontairement — le build racine type-check aussi `foulee_pro/` (via `include: **/*.ts` + alias `@/*` → racine), donc une signature requise aurait cassé la compilation de `foulee_pro`. Params optionnels = rétrocompatible, sans toucher `foulee_pro/`.
- **Vérif :** `npm run build` OK ; rendu email simulé (bouton check-in présent uniquement sans séance, dashboard sinon).

---

## 2026-07-15 (suite) — Semaine sans sortie : le coach demande les séances non notées

- **Contexte :** vérification en base — la table `weekly_checkins` est vide pour les 4 coureurs (fonctionnalité jamais utilisée, aucune donnée perdue). Le ressenti/douleurs cités dans les emails viennent du **Journal** (`training_logs`), pas des check-ins.
- **Cause racine du texte à améliorer :** dans `buildWeeklyReportPrompt`, la condition `noData` (aucune sortie loggée) déclenchait un message d'accueil « première semaine / bienvenue » quelle que soit la semaine, et supposait implicitement une semaine blanche.
- **Fix appliqué (`lib/claude/prompts.ts`) :** remplacement de `noData` par deux cas explicites :
  - `isFirstWeekWelcome` (semaine 1 sans données) → message d'accueil chaleureux, inchangé.
  - `noSessionsLogged` en semaine > 1 → nouvelle consigne : le coach ne suppose pas l'absence de course, demande explicitement (sans culpabiliser) s'il y a eu des sorties non notées, et invite à les ajouter dans le Journal ou via le check-in ; interdiction de parler de « programme qui démarre ».
- **Portée :** rapport hebdomadaire uniquement (chat coach non modifié, décision produit).
- **Vérif :** `npm run build` OK.

---

## 2026-07-15 — Corrections email hebdomadaire (retour Antoine, semaine 5)

Trois bugs remontés sur l'email hebdomadaire du dimanche.

### Bug 1 — Tirets cadratins / demi-cadratins dans les textes

- **Constat :** « Vannes–Auray » s'affichait avec un tiret demi-cadratin (`–`) au lieu d'un tiret normal, ainsi que d'autres séparateurs.
- **Cause racine :** texte hardcodé encodé avec l'entité HTML `&#8211;` (demi-cadratin) dans le hero et le `<title>` de l'email, et tirets `–`/`—` littéraux dans plusieurs chaînes (plage de dates, objet de l'email, email d'invitation). Côté IA, le prompt n'interdisait que le cadratin (`—`), pas le demi-cadratin (`–`).
- **Fix appliqué :**
  - `lib/brevo/email-builder.ts` : `Vannes&#8211;Auray` → `Vannes-Auray` (hero), séparateurs du `<title>` et de la plage de dates de la semaine suivante corrigés en `-`.
  - `lib/utils/dates.ts` (`formatWeekRange`), `lib/brevo/client.ts` (objet de l'email), `lib/brevo/invitation-email.ts` : tirets `–`/`—` → `-`.
  - Prompts `buildWeeklyReportPrompt` et `buildConversationPrompt` (`lib/claude/prompts.ts`) : règle renforcée interdisant explicitement le cadratin **et** le demi-cadratin, avec consigne d'éviter les tirets autant que possible.
  - **Filet de sécurité :** nouvelle fonction `sanitizeDashes()` dans `email-builder.ts`, appliquée au texte généré par l'IA (`coachAnalysis`) avant insertion dans le template — remplace `–`, `—` et leurs entités par `-`.
  - Commentaires de code résiduels nettoyés.

### Bug 2 — Répétition rapprochée du prénom

- **Constat :** « Bonjour Antoine, […] Antoine » à quelques mots d'intervalle, effet artificiel.
- **Cause racine :** le template hardcode déjà la salutation `Bonjour {prénom},`, puis insère le texte `coach_analysis` généré par l'IA, qui recommençait souvent lui aussi par le prénom.
- **Fix appliqué :** consigne ajoutée dans le prompt `coach_analysis` (`buildWeeklyReportPrompt`) : ne pas répéter la salutation ni commencer par le prénom, l'écrire au maximum une fois dans les deux premiers paragraphes et jamais à moins de ~50 mots d'intervalle.

### Bug 3 — Faux message « programme démarre aujourd'hui » sur une semaine blanche hors semaine 1

- **Constat :** en semaine 5, avec 0 séance loggée cette semaine mais un historique actif, l'email affichait « Ton programme démarre aujourd'hui » (hero) et « le programme commence maintenant… » (stats).
- **Cause racine :** ces textes d'onboarding se déclenchaient sur la seule condition `stats.sessions === 0` (`hasStats`), sans lien avec `week_number`.
- **Fix appliqué :** dans `buildEmailHtml`, nouvelle condition `isWelcomeWeek = !hasStats && weekNumber === 1`.
  - Semaine 1 réelle sans données → texte d'accueil d'origine **préservé**.
  - Semaine > 1 sans séance → sous-titre neutre (première phrase de l'analyse du coach) et bloc stats « Aucune sortie enregistrée cette semaine. » ; le preheader ne mentionne plus « Ton programme démarre ».

### Vérifications

- `npm run build` : OK (0 erreur TypeScript).
- Rendu simulé de `buildEmailHtml` pour semaine 1 (texte d'origine conservé) et semaine 5 sans séance (nouveau texte neutre) : conforme.
- Aucun tiret cadratin/demi-cadratin (littéral ou entité) dans le HTML généré des cas testés ; le filet `sanitizeDashes` nettoie bien un `–`/`—` injecté par l'IA.

### Fichiers modifiés

- `lib/brevo/email-builder.ts`
- `lib/claude/prompts.ts`
- `lib/utils/dates.ts`
- `lib/brevo/client.ts`
- `lib/brevo/invitation-email.ts`
- `app/api/onboarding/route.ts`, `lib/supabase/server.ts`, `components/checkin/CheckinStepper.tsx` (commentaires nettoyés)
