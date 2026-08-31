# Changelog Foulée

Fichier de changelog évolutif de l'application **Foulée** (scope : foulée actuel, hors `foulee_pro/`).
À compléter à chaque modification. Entrée la plus récente en haut.

---

## 2026-08-31 (suite 2) — Foulée Paris « Semi Ca$h » : moteur de cotes + mise & règlement + pages (blocs 3‑4)

Scope : sous-dossier autonome `foulee-paris/` (hors app Foulée, hors `foulee_pro/`). Détail exhaustif et prompt de reprise : `foulee-paris/foulee-paris.md`. **Non commité, non déployé** (attente validation Antoine).

- **Bloc 3 — moteur de cotes** (`lib/odds/`, fonctions **pures** + orchestration) : fetch `runner-stats` → temps de référence (meilleure sortie longue sur 3 sem. glissantes, élargi 4/6) → Riegel (exp. 1,06 → 21,1 km) → facteurs de forme (tendance d'allure 6 sem., assiduité 4 sem., douleurs) → écart-type (plancher 3 %) → **Monte Carlo 20 000 tirages** (PRNG graine, normale tronquée) → `cote = round(1/(p·1,07),2)`, plancher 1,05. Écriture `odds` en **ajout seul** + `runner_stats_snapshots`. Catalogue **idempotent** créé (15 marchés / 68 sélections) : vainqueur, classement complet (24), 6 face-à-face, 4 temps d'arrivée, 3 déterministes (progression/assiduité/moins de douleurs) ; marchés « battra son objectif » auto-créés dès qu'un objectif est saisi. Routes `POST /api/admin/recompute-odds` (bouton admin) et `GET|POST /api/cron/recompute-odds` (protégé `ODDS_CRON_SECRET`, ferme les marchés au 12/09 minuit Europe/Paris).
- **Bloc 4 — mise & règlement + pages** : fonctions Postgres `place_wager` (mise **atomique**, verrou `FOR UPDATE`, cote figée côté serveur, solde jamais négatif) et `settle_market` (**idempotent**, `settlements.market_id` unique = anti double-crédit) + vue `current_odds`. Route `POST /api/wagers` (paris **simples**). Règlement admin `POST /api/admin/settle` (temps officiels + DNF → sélections gagnantes → paiements). Pages `/paris` (marchés + `OddsTile` + ticket de mise), `/mon-compte` (solde + historique), `/classement` (gains cumulés), formulaires admin Cotes + Règlement.
- **Vérifié en live** : (a) proba→cote **à la main** sur vraies données Foulée (endpoint lancé en local — voir ci-dessous) conforme à la formule ; (b) écriture DB end-to-end + **idempotence** du recalcul ; (c) UI `/paris`→ticket→mise 10 J @1,09 → solde 100→90 J, `/mon-compte`, `/classement`, `/admin` rendus fidèles aux maquettes ; (d) **test RPC isolé** : mise > solde rejetée (solde intact), règlement crédite une seule fois, rejeu = no-op, **solde jamais négatif**. Objets de test supprimés, base propre. `tsc --noEmit` racine + `foulee-paris` OK.
- **⚠ Point signalé :** l'endpoint `GET /api/betting/runner-stats` est **non commité / non déployé** côté Foulée → `www.foulee.run` renvoie 404. Vérification faite contre Foulée `next dev` local (secret injecté via l'env, jamais écrit ni logué). **Pour la prod : commiter + déployer cet endpoint côté Foulée (Vercel).**
- **Garde-fous hors spec, à valider par Antoine :** `MAX_ODDS = 100` (plafond de cote), sensibilité pente d'allure `0,3`, cotes fixes déterministes (ladder `1,6/2,75/4,5/8`). Modèle actuel très tranché (Antoine ~87 % vainqueur) → beaucoup de cotes au plafond ; fidèle à la spec, ajustable.
- **Secrets :** `BETTING_API_SECRET` + `ODDS_CRON_SECRET` posés dans `foulee-paris/.env.local` (gitignoré, jamais logués). **Reste : bloc 5 (Cloudflare, cron + déploiement)**, token Cloudflare à demander au moment M.

### Fichiers créés / modifiés (bloc 3‑4)

- `foulee-paris/lib/odds/` : `foulee.ts`, `engine.ts`, `catalog.ts`, `recompute.ts`, `settle.ts` (nouveaux)
- `foulee-paris/lib/markets.ts`, `foulee-paris/lib/account.ts` (nouveaux)
- `foulee-paris/components/OddsTile.tsx` (nouveau)
- `foulee-paris/app/api/wagers/route.ts`, `.../api/admin/recompute-odds/route.ts`, `.../api/admin/settle/route.ts`, `.../api/cron/recompute-odds/route.ts` (nouveaux)
- `foulee-paris/app/paris/{page.tsx,ParisClient.tsx}`, `.../mon-compte/page.tsx`, `.../classement/page.tsx` (paris réécrit, autres nouveaux)
- `foulee-paris/app/admin/AdminClient.tsx` (sections Cotes + Règlement)
- Base `foulee_paris` : migrations `place_wager_and_settle_market_functions`, `current_odds_view` ; catalogue de marchés seedé
- `foulee-paris/foulee-paris.md`, `Foulée.md`, `MAJ_foulee.md` (docs)

---

## 2026-08-31 (suite) — Foulée Paris « Semi Ca$h » : base Supabase + auth PIN + panneau admin

Scope : sous-dossier autonome `foulee-paris/` (hors app Foulée, hors `foulee_pro/`). Détail exhaustif et prompt de reprise : `foulee-paris/foulee-paris.md`.

- **Base Supabase dédiée** `foulee_paris` (ref `vmfflhlizqtmrnyijrwa`, eu-west-3, même org que Foulée) : schéma complet (bettors, runners, runner_stats_snapshots, markets, selections, odds, wagers, transactions, settlements) + index + **RLS deny-all** (service-role only) + 4 runners seedés. Monnaie en centièmes de jeton (entiers), départ 100 J.
- **Projet Next.js autonome** : design « Semi Ca$h » repris des maquettes (`foulee-paris/design/`), fonts Space Grotesk/Inter, accueil. **Isolation build** : `foulee-paris` exclu du `tsconfig.json` racine + `turbopack.root` épinglé → build racine de Foulée non impacté (`tsc --noEmit` racine OK, `foulee_pro/` intact).
- **Auth PIN + admin** : login email + PIN (bcrypt), session JWT `jose` cookie httpOnly ; routes `/api/auth/login|logout`, `/api/admin/bettors` (création → PIN affiché 1× + crédit 100 J + transaction `grant_initial`), `/api/admin/runners` (objectifs). Pages `/login`, `/admin`. Admin Antoine amorcé via pgcrypto.
- **Vérifié en live** (dev + vraie base) : mauvais PIN→401, login admin→200, création parieur→PIN 1×/100 J, login parieur→200, non-admin sur route admin→401 ; rendus fidèles aux maquettes. Parieur de test supprimé (base propre).
- **Non commité, non déployé.** En attente : `BETTING_API_SECRET` côté `foulee-paris` (bloc 3) ; token Cloudflare (déploiement).

---

## 2026-08-31 — Endpoint paris `runner-stats` + démarrage plateforme Foulée Paris

- **Origine :** nouveau chantier (instructions dédiées). Deux livrables dans le même dépôt ; `foulee_pro/` strictement hors périmètre.
- **(1) Correction doc `Foulée.md` (section « Table profiles ») :** réalignée sur le schéma réel vérifié en base le 31/08 — colonnes réelles `runner_level`, `weekly_sessions`, `best_recent_time`, `goal_time`, `availability`, `injury_history`, `age`, `weight_kg` ; suppression des colonnes fictives `level`/`target_time`/`available_days`/`max_hr`/`resting_hr`.
- **(2) Nouvel endpoint `GET /api/betting/runner-stats` (additif, aucun fichier existant modifié hors doc) :** auth `Bearer BETTING_API_SECRET` (fail-closed), `createAdminClient` lecture seule, `force-dynamic`. Par profil : champs bruts + `weekly_stats` par semaine de programme (distance, sorties, plus longue sortie, allure pondérée `sum(min)/sum(km)`, séances avec douleur, séances/sortie longue prévues) + `current_program_week` + `days_until_race`.
- **Vérification (dev server local, secret éphémère injecté via l'env, jamais écrit dans un fichier) :** totaux cumulés === base, **tolérance zéro** (Alix 14 / 118,54 / 20,26 · Antoine 19 / 201,4 / 20 · Hugo 18 / 199 / 15,23 · Rémi 24 / 153,2 / 8,5) ; 401 sans header et avec mauvais secret ; 200 avec le bon.
- **Point de donnée signalé :** `training_programs.sessions[].type` contient DEUX variantes de sortie longue en base (`sortie_longue` × 38, `sortie longue` × 13). Le matching couvre les deux — le spec littéral (`=== 'sortie_longue'`) aurait mis 13 semaines à `null`.
- **Sécurité :** `BETTING_API_SECRET` à poser par Antoine (`.env.local` + Vercel), jamais généré/affiché/committé. **Token Cloudflare transmis en clair dans le brief → à révoquer** (non utilisé, non écrit).
- **Phase 2 (`foulee-paris/`) :** non démarrée — en attente base Supabase dédiée + secret + token Cloudflare. Maquettes Claude Design déjà présentes dans `foulee-paris/design/`.

### Fichiers créés / modifiés

- `app/api/betting/runner-stats/route.ts` (nouveau)
- `Foulée.md` (section profiles corrigée ; nouvelles sections « Intégrations externes » et « Plateforme Foulée Paris » ; ligne décision 31/08)
- `MAJ_foulee.md` (cette entrée)

---

## 2026-08-10 (suite) — Rapports : suppression des onglets, chiffres live, barres cliquables

- **Origine :** retour d'Antoine. Remplace la demande précédente (`instructions_claude_code_bugs_rapports.md`) qui voulait réparer les onglets Sem./Mois/Saison : décision changée, ces boutons sont **supprimés**, pas réparés. Le bug des chiffres figés (jamais corrigé lors de la 1re tentative) est traité ici.
- **(1) Suppression des onglets (`RapportsClient.tsx`) :** les 3 boutons Sem./Mois/Saison retirés du header. Aucun état de sélection de période conservé ni affiché ailleurs.
- **(2) Chiffres recalculés en direct depuis `training_logs` (`app/dashboard/rapports/page.tsx`) :** plus aucun nombre lu depuis `weekly_reports.stats`.
  - **Hero « Distance totale »** = somme de tous les `training_logs` de l'utilisateur depuis le début du programme (équivalent au total du Journal). Le badge « X semaines de programme » reste basé sur la semaine courante (`getProgramWeek`).
  - **Graphique + cartes** = uniquement les semaines ayant déjà une ligne `weekly_reports`. Pour chacune, distance / nb sorties / allure recalculés depuis `training_logs` sur la fenêtre `[week_start, week_start + 7j[` — **strictement identique** à celle du cron. Allure via `calcPace(totalKm, totalMin)`, **même formule que le cron** (non réinventée). Semaine à 0 sortie → `--` (et allure `--'--"` conservée comme avant).
  - Le texte qualitatif (`coach_analysis`) reste lu depuis `weekly_reports`. **Aucun appel Claude.**
  - Une seule requête `training_logs` (tous les logs depuis le début du programme), agrégée en JS pour le hero et par semaine.
- **(3) Barres du graphique cliquables :** tap sur une barre → ouvre et scrolle vers la carte de la semaine correspondante. L'état d'ouverture de l'accordéon est **remonté** de `RapportItem` (rendu contrôlé via props `open`/`onToggle`, + `id` d'ancrage) vers `RapportsClient`, qui détient une source unique partagée par les cartes et le graphique (pas de logique dupliquée). Barre sans carte (semaine courante sans rapport, semaine future) → aucune barre générée, donc aucune action.
- **Architecture :** `page.tsx` devient un pur server component (fetch + calcul des stats live) qui passe des props sérialisables à un nouveau composant client `RapportsClient` (rendu + interactivité).
- **Vérification chiffrée en base (SQL read-only, avant/après) :**
  - **Hugo** — total **88,3 km / 9 sorties** (au lieu de 64,2 / 7 figé) ; **S8 (27/07-02/08) 19,5 km / 2 sorties** (au lieu de 8,0 / 1) ; S7 24,1 / 3 et S9 32,1 / 3 inchangés. (Écart hero vs cartes = 1 sortie de 12,6 km en semaine 10 courante, sans rapport → comptée au total, pas en carte.)
  - **Antoine (témoin)** — total **130,4 km / 13 sorties** inchangé ; live === `stats` figé sur **toutes** ses semaines → aucune carte ne bouge.
- **Vérif technique :** `npx tsc --noEmit` OK. Preview visuelle (données Hugo) : onglets absents, chiffres corrects, clic barre S8 → carte S8 dépliée avec `coach_analysis`.

### Fichiers modifiés

- `app/dashboard/rapports/page.tsx` (réécrit : server component, calcul live)
- `app/dashboard/rapports/RapportsClient.tsx` (nouveau : rendu + interactivité, état d'ouverture partagé)
- `app/dashboard/rapports/RapportItem.tsx` (accordéon rendu contrôlé + id d'ancrage)

---

## 2026-08-10 — Journal : détail d'une séance en lecture seule (accordéon)

- **Origine :** retour de Hugo, impossible de revoir le détail d'une séance déjà enregistrée dans le Journal. Deux champs capturés à la saisie n'étaient visibles nulle part dans la liste : la durée (`duration_minutes`) et les notes libres (`notes`).
- **Fix (`components/training/LogForm.tsx`) :** chaque carte de l'historique des sorties devient un accordéon dépliable en place, en **réutilisant le même pattern visuel que « Bilans hebdomadaires »** (`RapportItem`) : bouton cliquable, chevron dans un cercle qui pivote, section de détail avec `borderTop`. Nouveau sous-composant `LogHistoryCard` (état `open` local, comme `RapportItem`) + helpers `formatDuration` et `formatDistance`.
- **Détail affiché (lecture seule) :** date complète, distance, durée (décomposée min + sec), allure, ressenti (emoji + libellé + niveau), douleur ou gêne (`pain_notes`), notes libres (`notes`, uniquement si renseignées). En-tête replié : date + distance + allure + emoji de ressenti + chevron (les douleurs, avant affichées dans l'en-tête, passent dans le détail déplié pour garder l'en-tête sobre, cohérent avec `RapportItem`).
- **Durée :** `duration_minutes` est toujours stocké en **minutes entières** (Journal `Math.round`, check-in `parseInt`). `formatDuration` décompose quand même en min + sec et n'affiche jamais un « 0 s » trompeur (respect de la convention « jamais de faux zéro »).
- **Chargement des données (`app/dashboard/log/page.tsx`) :** ajout de `notes` au `select` existant (`duration_minutes` y était déjà). **Aucune nouvelle route API, aucun nouvel appel Supabase, aucun bouton de modification/suppression** — lecture seule stricte.
- **Conventions respectées :** donnée absente affichée en `--` (jamais `0 km` ni `0 min`) ; aucun tiret cadratin/demi-cadratin dans les textes (usage du point médian `·`) ; style aligné sur l'existant du fichier (hex en dur, comme `RapportItem`/`LogForm`).
- **Vérif :** `npx tsc --noEmit` OK (y compris `foulee_pro/`, non modifié).

### Fichiers modifiés

- `components/training/LogForm.tsx`
- `app/dashboard/log/page.tsx`

---

## 2026-07-18 — Classement nominatif de la semaine dans l'email hebdomadaire

- **Objectif :** ajouter en fin d'email (juste avant le pied de page, après le programme de la semaine suivante) un tableau de classement des 4 coureurs par km parcourus sur la semaine, identique dans les 4 emails, plus une évocation personnelle du coach sur la position du destinataire, intégrée à `coach_analysis`.
- **Contrainte clé (validée avec Antoine) : aucun nouvel appel Claude.** Le tableau est calculé de façon **déterministe en code** ; seule l'évocation personnelle passe par Claude, en enrichissant le prompt `coach_analysis` déjà existant.
- **Calcul du classement (`app/api/cron/weekly-report/route.ts`) :**
  - Calculé **une seule fois par run**, avant la boucle par utilisateur (jamais recalculé par destinataire).
  - **Une seule requête Supabase supplémentaire** sur `training_logs` (`createAdminClient`), filtrée `date >= weekStart` et `date < nextWeekStart` pour les user_ids du groupe. Fenêtre de dates **strictement identique** à celle du rapport individuel existant (via `getProgramWeekStart`, pas `getWeekStart`).
  - Agrégation en code par `user_id` (somme `distance_km` + comptage des sorties), chaque coureur pré-initialisé à `0/0`. Tri : km décroissant, puis sorties décroissant, puis prénom alphabétique (ordre strict, groupe fermé de 4).
  - Un coureur à 0 km / 0 sortie reste affiché avec ces valeurs réelles (la règle « jamais 0 km » ne s'applique pas à cette donnée agrégée de groupe).
  - Nouveau type `ClassementEntry` (`types/index.ts`) : `{ rang, userId, prenom, km, sorties }`.
- **Rendu du podium (`lib/brevo/email-builder.ts`) :** nouvelle fonction `renderClassement()` — médailles 🥇🥈🥉 pour les rangs 1-3, « 4. » (texte) pour le rang 4, colonnes prénom / km (une décimale, virgule) / nombre de sorties. Titre « Le classement de la semaine ». Bloc inséré avant le diviseur+footer, affiché **dans tous les cas** (accueil, semaine blanche, semaine normale), indépendant de `isWelcomeWeek`/`noSessionsLogged`. HTML statique : aucun tiret cadratin/demi-cadratin (vigilance manuelle, `sanitizeDashes` ne couvre que le texte IA). Nouveau param `classement?` dans `EmailParams`.
- **Évocation personnelle (`lib/claude/prompts.ts`) :** nouveau param `classement?` dans `buildWeeklyReportPrompt`. Le contexte injecté sépare explicitement le destinataire (`toi: { rang, km, sorties }`) des `autres: [{ prenom, rang, km, sorties }]`. Consigne grammaticale dédiée (indépendante du ton) : le destinataire est TOUJOURS désigné par « tu »/« toi », jamais par son prénom à la 3e personne ; les autres sont nommés par leur prénom réel à la 3e personne. Faits réels uniquement, aucune invention, pas de tiret cadratin/demi-cadratin. Commentaire glissé dans `coach_analysis`, pas de bloc séparé.
- **Vérif :** `npx tsc --noEmit` OK (y compris `foulee_pro/`). **Vraie génération de test** `claude-sonnet-4-6` pour 2 profils (1er et dernier du classement) : règle « tu/toi » respectée pour le destinataire, autres participants correctement nommés, 0 tiret cadratin/demi-cadratin. Rendu HTML du podium vérifié (0,0 km / 0 sortie affiché pour un coureur sans séance).

### Fichiers modifiés

- `app/api/cron/weekly-report/route.ts`
- `lib/brevo/email-builder.ts`
- `lib/claude/prompts.ts`
- `types/index.ts`

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
