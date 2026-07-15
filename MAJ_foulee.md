# Changelog Foulée

Fichier de changelog évolutif de l'application **Foulée** (scope : foulée actuel, hors `foulee_pro/`).
À compléter à chaque modification. Entrée la plus récente en haut.

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
