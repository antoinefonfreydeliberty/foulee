# Suivi - Semaine finale (email J-1, bilan course, email de cloture)

Derniere mise a jour : 2026-09-05 (creation du fichier de suivi)

## Chantier 1 - Email J-1 (samedi 12)
- [x] Migration `race_day_email_sent_at` sur `profiles` - FICHIER CREE + APPLIQUE EN BASE le 05/09 (via API Management Supabase, token lu depuis process.env). Verifie : colonne timestamptz nullable, 4 profils a null.
- [x] `lib/data/race-course.ts` cree (export `RACE_COURSE_INFO`, texte accentue conserve, aucun tiret cadratin)
- [x] `buildRaceDayEmailPrompt` cree (dans `lib/claude/race-day-prompt.ts` + types `RaceDayStats`/`RaceDayContent`)
- [x] `buildRaceDayEmailHtml` cree (dans `lib/brevo/race-day-email.ts`, fichier dedie, design Studio.Jour reutilise, helpers escapeHtml/sanitizeDashes locaux pour ne pas toucher email-builder.ts)
- [x] Route `app/api/cron/race-day-email/route.ts` creee (auth `RACE_DAY_CRON_SECRET`, `?dryRun=true`, Promise.allSettled, idempotence via `profiles.race_day_email_sent_at`)
- [x] `sendRaceDayEmail` ajoute a `lib/brevo/client.ts`
- [x] Type `Profile.race_day_email_sent_at?` ajoute (OPTIONNEL : sinon casse les inserts onboarding, root type-check aussi foulee_pro)
- [x] Script `scripts/setup-race-day-cronjob.mjs` ecrit (--dry-run defaut, --create reel ; secret masque en dry-run ; jobId logge)
- [x] `npx tsc --noEmit` : exit 0 ; script dry-run OK (secret masque)
- [x] Test dry-run sur les 4 utilisateurs (contenu verifie manuellement) - via harnais temporaire `scripts/_tmp-race-day-dryrun.mts` (SERVICE_ROLE_KEY de .env.local, rejoue la logique de la route, aucun envoi, aucune ecriture). Resultats : Antoine 215,4km/21 62% cible 5'41" | Remi 153,2km/24 28% | Hugo 207,3km/19 28% cible 5'13" | Alix 126km/15 42% cible 5'13". Aucun tiret cadratin dans les 4 HTML complets. Alix (genoux) : descentes gerees avec prudence, sans conseil medical. Rendu design Studio.Jour verifie visuellement (hero J-1, parcours, estimation, strategie+allure cible+points cles, alimentation, mot du coach). 4 HTML envoyes a Antoine pour revue. Harnais conserve jusqu'a validation (a supprimer ensuite).
- [x] Test idempotence (2e appel = skip) - VALIDE le 05/09 via la vraie route HTTP (next dev, secret lu via process.env) : sans auth->401, mauvais secret->401, dryRun->200 4 previews, puis 4 flags poses->appel non-dryRun->4 skipped/0 processed/0 envoi, flags remis a null. BREVO_SENDER_VERIFIED=true en local : jamais d'appel non-dryRun sans flags poses (garde-fou anti-envoi).
- [x] Contenu + heure de midi VALIDES par Antoine (05/09)
- [x] Build prod OK (`npm run build`, route `/api/cron/race-day-email` presente)
- [x] Commit cree en local (`4ae96c1`) - fichiers du chantier uniquement (foulee-paris/foulee_pro exclus)
- [x] PUSH fait par Antoine via l'UI VS Code (le CLI local est `fonfreydeantoine` sans droits ; VS Code authentifie sur `antoinefonfreydeliberty`). origin/main = commit `4ae96c1`, ecart 0.
- [x] Deploiement Vercel effectif (auto-deploy depuis main) : route en prod (401 sans auth).
- [x] RACE_DAY_CRON_SECRET Vercel == .env.local : VERIFIE via dryRun prod authentifie (HTTP 200, 4 previews). Le job cron-job.org s'authentifiera correctement.
- [x] Job cron-job.org cree via `--create` : jobId **8389979**, midi (12:00) Europe/Paris le 12/09, url prod, enabled, expiresAt 20260913000000. Verifie via GET /jobs.
- [x] CHANTIER 1 LIVE le 05/09.
- [x] VALIDE par Antoine le 05/09 (mise en ligne complete). CHANTIER 1 CLOS.

### A faire par Antoine (post-mise en ligne)
- REGENERER la cle cron-job.org (CRONJOB_ORG_API_KEY) : elle a transite en clair dans le chat. Une fois regeneree, mettre a jour .env.local (le job existant garde son propre header, pas besoin de le recreer).
- Optionnel : supprimer manuellement le job 8389979 apres le 12/09 (redondant avec expiresAt + idempotence race_day_email_sent_at).
- Le 12/09 apres midi : verifier en base que profiles.race_day_email_sent_at est rempli pour les 4 (preuve d'envoi), et la reception des emails.

### Notes techniques mise en ligne (05/09)
- Migration prod appliquee via API Management Supabase (POST /v1/projects/{ref}/database/query) avec SUPABASE_ACCESS_TOKEN lu depuis .env.local (jamais affiche). La MCP Supabase elle-meme reste sans token cote serveur.
- Push git en CLI impossible (compte fonfreydeantoine sans droits sur antoinefonfreydeliberty/foulee) -> passer par l'UI VS Code, ou ajouter fonfreydeantoine en collaborateur.
- VS Code etait bloque par une MAJ figee (mutex vscode-updating) + terminal casse (profil pwsh7 absent). Corrige : update.mode=none + defaultProfile.windows="Command Prompt" dans settings.json, process CodeSetup tues.

### Ajustements demandes le 05/09 (Antoine)
- Heure d'envoi : MIDI (12:00) Europe/Paris le 12/09 (schedule cron-job.org mis a jour : hours [12], minutes [0]).
- Rappel explicite de l'objectif renseigne (goal_time) ajoute dans l'email (bloc "Tes chances sur ton objectif").
- Description du parcours (prose RACE_COURSE_INFO.description) ajoutee sous le bloc stats parcours.
- Prompt target_pace fiabilise : allure cible TOUJOURS deduite si l'objectif evoque un temps.
- Donnees Foulee "les plus recentes" : deja garanti (la route lit training_logs en direct au moment de l'envoi).
- 2e dry-run verifie : Antoine 62% 5'41" | Remi 22% 5'41" | Hugo 28% 5'13" | Alix 42% 5'13". Objectif + description + allure cible rendus OK, zero tiret cadratin.
- CRONJOB_ORG_API_KEY fournie par Antoine dans le chat -> NON stockee par Claude (regle 6). Antoine doit la poser dans .env.local. Cle exposee en clair dans le chat : a regenerer apres usage.

### Sequence de mise en ligne (avant --create)
1. Validation contenu par Antoine.
2. Commit + deploiement Vercel de la route (validation explicite requise).
3. RACE_DAY_CRON_SECRET pose sur Vercel (prod) et dans .env.local (test).
4. Migration race_day_email_sent_at appliquee en base.
5. Test route reelle + idempotence (2e appel = skip).
6. --create du job cron-job.org (CRONJOB_ORG_API_KEY dans .env.local).

### Notes Chantier 1
- MCP Supabase : autorisee en session mais serveur MCP sans SUPABASE_ACCESS_TOKEN configure -> execute_sql renvoie Unauthorized. A configurer cote serveur MCP si besoin.
- `RACE_DAY_CRON_SECRET` et `CRONJOB_ORG_API_KEY` absents de `.env.local` (geres par Antoine). Le test dry-run via curl sur la route reste a faire une fois `RACE_DAY_CRON_SECRET` pose localement.
- Prompt output JSON : 5 blocs -> `preparation_analysis`, `success_percentage`+`success_message`, `race_strategy`+`target_pace`, `nutrition`, `motivation`.

## Chantier 2 - Bilan course (13 septembre)
- [x] Composant carte "Bilan course" cree : `components/dashboard/RaceDayBilanCard.tsx` (client component). Reutilise l'endpoint EXISTANT `POST /api/training-log` (aucune nouvelle route), `calcPace`, meme pattern duree min+sec / ressenti 1-5 que `LogForm`. Champs : date (RACE_DATE, non modifiable, affichee en clair), distance_km (pre-remplie 21.1, modifiable), duree (min+sec), feeling, pain_notes + notes optionnels (placeholder "Comment s'est passee la course ?"). Variables/couleurs du design Studio.Jour, aucun tiret cadratin, aucune mention hardcodee du coach. Sur succes : `done=true` -> `return null` (carte disparait, etat local) + `router.refresh()`.
- [x] Requete de detection integree a `app/dashboard/page.tsx` (server component) : ajout d'une 4e requete legere dans le `Promise.all` (`training_logs` select id, eq date=RACE_DATE, maybeSingle). `RACE_DATE` relue depuis `process.env.RACE_DATE` (dates.ts hardcode sa propre valeur pour getDaysLeft ; on la relit ici pour rendre l'override de test effectif). Condition d'affichage `showRaceDayCard = todayParis >= raceDate && !raceDayLog`, avec `todayParis` = date du jour Europe/Paris (`Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })`). Carte inseree en haut du contenu, juste sous le header, avant la bulle coach. Reste affichee indefiniment tant qu'aucune seance n'existe a cette date. `npx tsc --noEmit` = exit 0.
- [x] Teste E2E le 06/09 (login OTP reel sur le compte Antoine, code fourni par Antoine ; lecture Gmail et fabrication d'OTP bloquees par le classifieur, donc code demande a Antoine). Simulation via `.env.local` RACE_DATE=2026-09-06 (aujourd'hui), remis a 2026-09-13 ensuite. Verifie : (1) carte affichee en haut du Dashboard pour un user sans seance a cette date ; (2) soumission (21.1 km, 105:30, ressenti Bien, note) -> insert correct dans training_logs (distance 21.1, duration_minutes 106 = 105 + 30s arrondi, pace 5'00", feeling 4, notes OK) ; (3) carte disparait (immediat cote client, et absente au rechargement serveur tant que le log existe) ; (4) seance presente en tete du Journal (compteur 21 -> 22, detail complet correct) ; (5) nettoyage DELETE cible de l'unique ligne test + SELECT count=0 ; (6) RACE_DATE de prod restauree -> carte non affichee aujourd'hui (06/09 < 13/09).
- [ ] Valide par Antoine

### Ajustement demande le 06/09 (Antoine) : modale bloquante le jour J
- Choix produit : le JOUR DE LA COURSE (todayParis === RACE_DATE), le bilan est presente en **modale bloquante** (overlay plein ecran, backdrop sombre, scroll de la page verrouille), avec fermeture explicite possible (croix + bouton "Plus tard") pour ne pas culpabiliser si la course s'est mal passee (ton Foulee). Les JOURS SUIVANTS (todayParis > RACE_DATE) : plus de modale, la **carte inline** non bloquante reste en haut du Dashboard jusqu'a enregistrement (evite de perdre le bilan si l'app n'est pas ouverte le 13).
- Implementation : meme formulaire unique (etat partage), presente en modale OU en carte inline selon la prop `blocking`. `page.tsx` passe `blocking={isRaceDay}` (`isRaceDay = todayParis === raceDate`). Dans le composant : `asModal = blocking && !dismissed`. "Plus tard"/croix -> `dismissed=true` -> bascule en carte inline le meme jour. Le scroll body est verrouille via `useEffect` uniquement pendant la modale. L'etat "ferme" est local a la session : un rechargement le 13/09 re-presente la modale (comportement "difficile a rater" voulu).
- Teste le 06/09 (session reutilisee, sans nouvel OTP) avec RACE_DATE=2026-09-06 : (1) modale bloquante affichee au chargement, dashboard grise derriere, scroll verrouille, "7j avant Vannes" ; (2) "Plus tard" -> modale fermee, backdrop disparu, scroll restaure, carte inline affichee a la place le meme jour (sans croix/"Plus tard") ; (3) RACE_DATE remis a 2026-09-13 -> ni modale ni carte aujourd'hui. La logique de soumission est inchangee (deja validee end-to-end plus haut). `npx tsc --noEmit` = exit 0.

### Notes Chantier 2 (06/09)
- Perimetre respecte : seuls `components/dashboard/RaceDayBilanCard.tsx` (nouveau) et `app/dashboard/page.tsx` (edite) touches. Aucun fichier `foulee-paris/` ni `foulee_pro/`.
- MCP Supabase toujours Unauthorized -> detection/insert-test/DELETE/verif via API Management (SUPABASE_ACCESS_TOKEN lu depuis .env.local via process.env, jamais affiche). Voir [[foulee-deploy-access]].
- Observation hors perimetre (a garder pour le Chantier 3) : les stats live "km cette sem." du Dashboard (`weekLogs` via `getWeekStart`) n'ont pas inclus la seance du dimanche 06/09 (la fenetre semble exclure le dimanche). Comportement PREEXISTANT non modifie par le Chantier 2 ; potentiellement pertinent pour l'affichage du jour J (course = dimanche 13/09).
- VALIDE par Antoine le 06/09. Commit local **b549e78** cree (4 fichiers : page.tsx, RaceDayBilanCard.tsx, Foulee.md, FINAL_UPDATES.md ; foulee-paris/foulee_pro exclus). Docs mises a jour (ligne de decision 06/09 dans Foulee.md + section Dashboard).
- PUSH : tente en CLI par Claude a la demande d'Antoine -> **403** (le credential CLI et `gh` sont tous deux `fonfreydeantoine`, sans droits sur `antoinefonfreydeliberty/foulee`). Claude ne peut pas pousser comme `antoinefonfreydeliberty` (credential present uniquement dans VS Code ; ne pas manipuler les identifiants GitHub d'Antoine). `main` en avance de 1 sur `origin/main`. Deploiement Vercel = auto-deploy depuis `main`, donc conditionne au push.
- A FAIRE (Antoine, au choix, une seule fois) : soit **pousser via l'UI VS Code** (Source Control -> Sync) pour ce commit ; soit **ajouter `fonfreydeantoine` en collaborateur** du repo pour que Claude puisse pousser en CLI de facon autonome ensuite (aligne avec la preference d'autonomie). Cf. [[foulee-deploy-access]].

## Chantier 3 - Email de cloture (dimanche 13, cron habituel)
- [ ] `isFinalWeek` + `TOTAL_PROGRAM_WEEKS` integres dans la route cron existante
- [ ] Garde-fou anti-envoi post-programme (semaine > 14 = no-op complet) teste
- [ ] `buildWeeklyReportPrompt` adapte (bilan global 14 semaines, resultat du jour J mis en avant, pas de programme semaine suivante)
- [ ] `buildEmailHtml` adapte (bloc hero resultat du jour, variante cloture, variante "bilan course pas encore logge")
- [ ] Podium de cloture base sur le temps de course (pas le volume de la semaine), coureurs sans resultat geres proprement
- [ ] Classement km des semaines 1-13 verifie inchange (non-regression)
- [ ] Test sur un jeu de donnees simulant la semaine 14 (avec/sans resultat logge) et un run simule semaine 15+ (garde-fou)
- [ ] Valide par Antoine

## Fusion finale
- [ ] Les 3 chantiers valides
- [ ] Decisions ajoutees a la table de `Foulée.md`
- [ ] Confirmation Antoine avant suppression de ce fichier

---

## Notes de session

### 2026-09-05
- Lecture complete de `Foulée.md`.
- Creation de `FINAL_UPDATES.md` (Chantier 0).
- Regle 7 (anti tirets cadratins/demi-cadratins) : appliquee des ce fichier de suivi (tirets simples uniquement).
- A faire ensuite : lire en entier les fichiers concernes par le Chantier 1 avant toute modification.

### 2026-09-06
- Chantier 2 (carte "Bilan course" du Dashboard) IMPLEMENTE et TESTE E2E. Detail et cases cochees ci-dessus.
- En attente de validation Antoine avant de passer au Chantier 3 (email de cloture). Ne pas enchainer.
