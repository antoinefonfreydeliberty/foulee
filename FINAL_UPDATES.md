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
- [ ] Job cron-job.org cree via `--create` une fois `CRONJOB_ORG_API_KEY` posee dans .env.local par Antoine (jobId note) - A FAIRE APRES deploiement route + secrets Vercel
- [ ] Valide par Antoine

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
- [ ] Composant carte "Bilan course" cree
- [ ] Requete de detection (training_log existant a RACE_DATE) integree a `app/dashboard/page.tsx`
- [ ] Soumission testee (POST /api/training-log, carte disparait)
- [ ] Valide par Antoine

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
