# Foulée Paris — « Semi Ca$h »

*Créé le 31 août 2026*

Document de contexte et de suivi **exhaustif** de la plateforme de paris fictifs
`foulee-paris/`. Pensé pour être lu et repris à tout moment par Claude Code dans une
nouvelle session, sans autre contexte. À compléter à chaque modification.

> **Règle d'or : ne jamais toucher `foulee_pro/` ni le projet Orée.** Et ne jamais
> écrire de secret en clair dans ce fichier (clés, tokens, PIN) — noms de variables
> uniquement.

---

## Résumé rapide

**Semi Ca$h** est une plateforme web de **paris 100 % fictifs** (aucune valeur réelle,
aucun argent réel) entre un groupe fermé de 4 potes — **Antoine, Hugo, Rémi, Alix** —
sur les résultats du **semi-marathon Vannes-Auray du 13 septembre 2026**. Chaque parieur
démarre avec **100 jetons** fictifs et mise sur les performances des 4 coureurs (vainqueur,
face-à-face, temps d'arrivée, etc.). Cotes calculées automatiquement à partir des données
d'entraînement réelles exposées par l'app **Foulée** (projet principal du dépôt).

- **Projet distinct et autonome** dans le monorepo `coach_semi`, sous-dossier `foulee-paris/`.
  Son propre `package.json`, ses propres `node_modules`, sa propre base Supabase. **Jamais**
  mélangé au code de l'app Foulée.
- **Dépendance unique avec Foulée :** un appel HTTP en lecture seule à
  `GET /api/betting/runner-stats` (côté Foulée). Semi Ca$h ne touche **jamais** la base
  Supabase de Foulée (`anxmkfhxjslyfayixgok`).
- **Déploiement cible :** Cloudflare (compte `fonfreyde.antoine@gmail.com`), séparé du
  déploiement Vercel de Foulée.
- **Fenêtre de paris :** ouverte dès la mise en ligne, **fermée le 12 septembre 2026 à
  minuit (Europe/Paris)**, veille de la course. Aucun pari live pendant la course.

---

## Statut actuel

**Niveau :** **EN LIGNE.** Blocs 1‑5 faits et vérifiés en live. Base + schéma + auth PIN + panneau
admin + moteur de cotes + pages paris/compte/classement + mise & règlement + **déploiement Cloudflare
Workers**. Commité (`e14b875` blocs 1‑4, `7dad5af` déploiement). **URL : https://semi-cash.fonfreyde-antoine.workers.dev**
**Évolution 02/09 : cotes plus réalistes** (incertitude modèle + extrapolation + lissage) — recalcul
live joué, nouvelles cotes en base, plafond 100 : 36→15. **Redéploiement Cloudflare à faire** pour
embarquer le nouveau moteur (le token n'était plus dispo en session au moment du commit).
Reste : (a) déployer l'endpoint `runner-stats` côté Foulée en prod (sinon le cron 404) ; (b) roter les secrets.

> **⚠ À signaler (31/08/26) :** l'endpoint Foulée `GET /api/betting/runner-stats` **n'est pas
> déployé en prod** (`www.foulee.run` → 404) : le fichier `app/api/betting/runner-stats/route.ts`
> est **non commité** côté Foulée. Le moteur a donc été vérifié contre l'endpoint **lancé en local**
> (Foulée `next dev` :3000, secret injecté via l'env, jamais écrit). **Pour la prod, il faudra
> commiter + déployer cet endpoint côté Foulée (Vercel)** avant que le cron Cloudflare de Semi Ca$h
> puisse recalculer les cotes en ligne.

### Fait (au 31/08/26)

- **Base Supabase dédiée créée :** projet `foulee_paris`, ref **`vmfflhlizqtmrnyijrwa`**,
  région `eu-west-3`, org `qlppejoriwdrrcgagyxi` (même compte que Foulée).
  URL : `https://vmfflhlizqtmrnyijrwa.supabase.co`.
- **Schéma complet appliqué** (migration `init_semi_cash_schema`) : 9 tables + index + RLS.
- **RLS deny-all** sur toutes les tables (aucune policy) → accès **service-role uniquement**.
  Advisors sécurité : seulement les 9 INFO `rls_enabled_no_policy` attendus (posture voulue).
- **4 `runners` seedés** (`first_name` = `foulee_first_name` = Antoine/Hugo/Rémi/Alix,
  `goal_time_seconds` = NULL, à saisir par l'admin).
- **Projet Next.js autonome scaffoldé** : `package.json`, `tsconfig.json`, `next.config.ts`,
  `.gitignore`, `.env.local.example`, design tokens (`app/globals.css`), `app/layout.tsx`
  (fonts Space Grotesk + Inter), **page d'accueil** (`app/page.tsx` : compte à rebours,
  pitch, 4 avatars, CTA, disclaimer), `components/Disclaimer.tsx`, `lib/money.ts`,
  `lib/supabase/admin.ts`, `lib/types.ts`.
- **Isolation build :** `foulee-paris` ajouté à `exclude` du `tsconfig.json` **racine**.
  `npx tsc --noEmit` racine → OK (le build Vercel de Foulée n'est pas impacté). `foulee_pro/`
  laissé strictement intact.

### Fait — Bloc 2 : auth PIN + panneau admin (31/08/26)

- **Dépendances installées** (`foulee-paris/node_modules`, 354 paquets). `next-env.d.ts`
  généré. `turbopack.root` épinglé à `foulee-paris/` dans `next.config.ts` (sinon Turbopack
  remontait au lockfile racine du monorepo et compilait `proxy.ts` de l'app Foulée).
- **Auth PIN** : `lib/auth/pin.ts` (génération PIN aléatoire, bcrypt hash/verify, hash factice
  anti-timing), `lib/auth/session.ts` (JWT HS256 signé `jose`, cookie httpOnly `semicash_session`,
  30 j), `lib/auth/current.ts` (`getSession`/`getCurrentBettor`/`requireBettor`/`requireAdmin`).
- **Routes** : `POST /api/auth/login` (email + PIN → cookie), `POST /api/auth/logout`,
  `GET|POST /api/admin/bettors` (liste + création parieur : PIN généré serveur, affiché **1×**,
  crédit initial 100 J + transaction `grant_initial`), `GET|PATCH /api/admin/runners`
  (liste + saisie `goal_time_seconds`).
- **Pages** : `/login` (email + 6 cases PIN, fidèle maquette), `/admin` (server `requireAdmin`
  + `AdminClient` : créer parieur, liste soldes, objectifs coureurs), `/paris` (placeholder
  authentifié avec solde + `BottomNav`), `components/BottomNav.tsx`, `components/LogoutButton.tsx`.
- **Admin bootstrap en base** : parieur **Antoine** (`fonfreyde.antoine@gmail.com`, `is_admin=true`,
  100 J), PIN hashé via `pgcrypto` (`crypt(..., gen_salt('bf',10))`, compatible bcryptjs).
- **Vérif typecheck** : `npx tsc --noEmit -p foulee-paris/tsconfig.json` → OK ; `npx tsc --noEmit`
  racine → OK.
- **Vérif LIVE (serveur de dev + vraie base, clé secrète posée)** : mauvais PIN → 401 ; login admin
  → 200 ; liste parieurs (Antoine 100 J) ; création parieur → PIN affiché 1× + solde 100 J +
  transaction `grant_initial` écrite ; login du nouveau parieur → 200 ; non-admin sur route admin
  → 401 ; pages accueil / `/login` / `/admin` rendues fidèlement aux maquettes. Parieur de test
  **supprimé** ensuite → base propre (admin Antoine + 4 runners).
- **Env** : `foulee-paris/.env.local` rempli — `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` (clé secrète `sb_secret_…`), `SESSION_SECRET` (généré local).
  `BETTING_API_SECRET` encore vide → **requis pour le bloc 3**.
- **Note requêtes locales** : sur cette machine, `Invoke-WebRequest` (PowerShell) se bloque sur
  localhost ; utiliser **`curl` via Bash** pour tester les routes HTTP.

### Fait — Bloc 3 : moteur de cotes (31/08/26)

- **Modules `lib/odds/`** : `foulee.ts` (client HTTP `runner-stats`, secret jamais logué),
  `engine.ts` (fonctions **pures** : temps de référence, Riegel, facteurs de forme, écart-type,
  Monte Carlo 20 000 tirages via PRNG mulberry32 **graine** = reproductible, normale tronquée
  Box–Muller, proba→cote), `catalog.ts` (blueprint des marchés + calcul des cotes),
  `recompute.ts` (orchestration : lecture runners → fetch → catalogue idempotent → cotes →
  écriture `odds` en **ajout seul** + `runner_stats_snapshots`), plus `betsClosed()` /
  `closeMarketsIfDue()`.
- **Routes** : `POST /api/admin/recompute-odds` (bouton admin), `GET|POST /api/cron/recompute-odds`
  (protégé `ODDS_CRON_SECRET`, fail-closed ; ferme les marchés si `BETS_CLOSE_AT` dépassé, sinon
  recalcule). Bouton **« Recalculer les cotes »** ajouté dans `/admin`.
- **Catalogue créé** (15 marchés, 68 sélections pour les 4 coureurs sans objectif saisi) :
  vainqueur (4), classement complet (24 permutations), 6 face-à-face, 4 temps d'arrivée (4 tranches),
  3 déterministes (progression d'allure, assiduité, moins de douleurs — libellé bienveillant).
  Les marchés **« battra son objectif »** apparaissent automatiquement dès qu'un `goal_time_seconds`
  est saisi (catalogue idempotent, re-vérifié à chaque recalcul).
- **Vérifié à la main sur vraies données** (endpoint Foulée local) : proba→cote conforme à
  `round(1/(p*1.07),2)` plancher 1,05 — ex. Vainqueur Antoine p=0,8674 → 1,08 ; Alix p=0,1324 →
  7,06 ; Temps Antoine 1h45–2h00 p=0,5602 → 1,67 ; Face-à-face p≈1 → plancher 1,05. Écriture DB
  end-to-end OK (68 cotes + 4 snapshots) ; **idempotence** confirmée (2ᵉ run : 0 marché/sélection
  créés, +68 cotes historisées). Coureur sans données géré (exclu des marchés Monte Carlo, pas de
  plantage — `skippedRunners`).
- **Garde-fou ajouté (hors spec, à valider) :** `MAX_ODDS = 100.0` plafonne les cotes des issues
  quasi impossibles (ex. permutations de classement jamais tirées) — la spec ne fixe qu'un plancher.
  Sans ça, certaines cotes atteindraient 5 chiffres. **Observation :** avec les données actuelles le
  modèle est très tranché (Antoine ~87 % vainqueur) → beaucoup de cotes au plafond 100 ; c'est fidèle
  à la spec (écarts de temps ≫ écart-type), ajustable plus tard (sd plus large, blend) si souhaité.
- **Constante documentée :** sensibilité pente d'allure `PACE_SLOPE_SENSITIVITY = 0.3` (la spec fixe
  les bornes 0,97/1,03 mais pas la pente qui les sature).

### Fait — Bloc 4 : mise, règlement, pages (31/08/26)

- **Fonctions Postgres** (migration `place_wager_and_settle_market_functions`) :
  - `place_wager(bettor, selection, stake_cents)` : **atomique**, verrou `FOR UPDATE` sur le parieur,
    cote figée **côté serveur** (dernière ligne `odds`), vérif marché ouvert (statut + `closes_at`),
    vérif solde, débit + insert `wagers` + transaction `stake`. Solde **jamais négatif** (garde
    applicative + CHECK `balance_cents >= 0`).
  - `settle_market(market, winning_ids[], official_results)` : **idempotent** — `settlements.market_id`
    unique = garde-fou anti double-crédit ; gagnants → `won` + payout + crédit + transaction `payout`,
    autres → `lost`, marché → `settled` ; **rejouable** (2ᵉ appel = `already_settled`, 0 crédit).
  - Vue `current_odds` (dernière cote par sélection).
- **Route de mise** `POST /api/wagers` (pari **simple** : 1 wager = 1 sélection) → `place_wager`,
  messages d'erreur mappés (SOLDE_INSUFFISANT→409, MARCHE_FERME→409, etc.).
- **Règlement admin** `POST /api/admin/settle` : saisie temps officiels + DNF → calcul des sélections
  gagnantes (`lib/odds/settle.ts`) pour les marchés Monte Carlo, + données finales Foulée pour les
  marchés déterministes → `settle_market` par marché. Formulaire **« Règlement (résultats officiels) »**
  dans `/admin` (temps par coureur + case DNF + confirmation).
- **Pages** (fidèles aux maquettes) : `/paris` (`ParisClient` : filtres, `OddsTile`, marché classement
  en liste, **ticket de mise** avec cote figée + gain potentiel + Valider ; bannière si paris fermés),
  `/mon-compte` (solde, compteurs gagnés/perdus/en cours, historique des mises avec net signé),
  `/classement` (gains cumulés réalisés, avatars, « Toi »). Composants `OddsTile.tsx`, libs
  `lib/markets.ts`, `lib/account.ts`.
- **Vérifié en live** (dev :3001, connecté admin) : `/paris` rend les 15 marchés + cotes réelles ;
  ticket → mise 10 J @1,09 → gain potentiel 10,9 J → solde 100→90 J ; `/mon-compte` liste la mise
  « En attente » ; `/classement` affiche le P&L réalisé (0 J tant que non réglé) ; `/admin` montre les
  sections Cotes + Règlement. **Test RPC isolé** : débit 10000→7000, mise > solde **rejetée** (solde
  intact), règlement crédite une fois (→13000), rejeu = no-op, **solde jamais négatif**. Objets de test
  supprimés, base rendue propre (Antoine 100 J, 0 pari).

### Fait — Bloc 5 : déploiement Cloudflare Workers (01/09/26)

- **Méthode : `@opennextjs/cloudflare`** (adaptateur mûr, runtime Node.js — vs `vinext`, la nouvelle
  reco Cloudflare mais expérimentale). A nécessité de **bumper Next 16.2.7 → 16.3.4** côté
  `foulee-paris` uniquement (l'adaptateur exige `>=16.3.3` ; root Foulée intact, `tsc` racine OK).
- **Config** : `open-next.config.ts` (bare), `wrangler.jsonc` (`vars` publiques uniquement + cron
  `0 */6 * * *`), **`cron-worker.ts`** = entrée custom qui délègue le `fetch` à OpenNext et ajoute
  un `scheduled` ré-invoquant `/api/cron/recompute-odds` (contexte Next.js + env réutilisés). Worker
  d'entrée exclu du `tsconfig` (globals Workers).
- **Secrets** posés via `wrangler secret put` (jamais commités, jamais dans `wrangler.jsonc`) :
  `SUPABASE_SERVICE_ROLE_KEY`, `BETTING_API_SECRET`, `SESSION_SECRET`, `ODDS_CRON_SECRET`.
- **Déployé** sur **https://semi-cash.fonfreyde-antoine.workers.dev** (compte
  `fonfreyde.antoine@gmail.com`, ID `014482fd…`), cron `0 */6 * * *` enregistré. Token Cloudflare
  fourni par Antoine, utilisé en variable d'env le temps du déploiement, jamais commité/logué.
- **Vérifié en live** : `/` → 200 ; login admin → `{ok:true,isAdmin:true}` (secrets OK) ; `/paris`
  authentifié → 200 + marchés/cotes rendus (lecture DB via service role OK) ; `/api/cron/recompute-odds`
  sans auth → **401** (fail-closed). `wrangler secret list` = 4 secrets (valeurs masquées).
- **Redéployer** après changement de code : `npm --prefix foulee-paris run … ` → `npx opennextjs-cloudflare deploy`
  (avec `CLOUDFLARE_API_TOKEN` en env). Les secrets/vars persistent entre déploiements.

### Fait — Évolution : cotes plus réalistes (02/09/26)

- **Problème signalé par Antoine :** beaucoup de cotes au plafond (Hugo/Rémi vainqueur à 100).
  **Cause :** modèle **surconfiant** — le `sd` de simulation (~4-5 %) ne modélisait que le bruit
  *jour-de-course*, en ignorant l'**incertitude d'estimation** (le temps semi est inféré d'une
  poignée de sorties longues extrapolées via Riegel). Les écarts entre coureurs ≫ `sd` → outsiders
  à proba ≈ 0 → cote plafonnée.
- **Correctif (3 leviers, `engine.ts` + `catalog.ts`) :**
  1. **Incertitude modèle** `MODEL_UNCERTAINTY = 0.06`, socle plat combiné en quadrature dans
     `computeSd` (`sd = projeté × √(frac_course² + frac_modèle²)`).
  2. **Terme d'extrapolation** `EXTRAPOLATION_SENSITIVITY = 0.06` : l'incertitude modèle CROÎT avec
     la distance d'extrapolation Riegel — `frac_modèle = 0.06 + 0.06 × max(0, 21.1/dist_réf − 1)`.
     Un coureur projeté depuis une sortie courte (Rémi, réf 8,5 km) est bien plus incertain qu'un
     coureur bien renseigné (Antoine, réf 20 km) → SD réelles : Antoine 7,6 % · Hugo 9,8 % ·
     Alix 12,7 % · Rémi 16,3 % (au lieu de ~7-9 % pour tous). Corrige la surévaluation des cotes
     d'outsider mal renseignés.
  3. **Lissage** `SHRINKAGE_LAMBDA = 0.05` (`shrinkProbs`, Laplace `p'=(1-λ)p+λ/K`) appliqué **par
     marché Monte Carlo** (vainqueur, classement, face-à-face, temps, objectif) avant conversion →
     plus de « mur » plat à `MAX_ODDS`, cotes d'outsiders variées.
- **Non touché :** `probToOdds` (formule + `MAX_ODDS=100` conservés comme garde-fou absolu),
  marchés déterministes (ladder fixe). Choix « Modéré » + terme d'extrapolation validés par Antoine.
  Les 3 constantes sont réglables (↑ = course plus ouverte).
- **Effet — RECALCUL LIVE joué sur vraies données Foulée** (Foulée `next dev` local :3000 → Semi
  Ca$h :3001 → route cron ; 68 cotes + 4 snapshots écrits, 0 warning). Marché vainqueur :

  | Coureur | Avant | Modéré (2 lev.) | + extrapolation |
  | --- | --- | --- | --- |
  | Antoine | 1.09 | 1.27 | 1.41 |
  | Alix | 6.65 | 3.94 | 3.18 |
  | Hugo | 100 | 54.93 | 37.04 |
  | Rémi | 100 | 74.48 | 45.63 |

  Sélections à la cote plafond 100 : **36 → 15** (les 15 restantes = permutations du « Classement
  complet », des ordres réellement quasi impossibles — plafond réaliste, laissé tel quel).
- **Base :** les cotes courantes en base `vmfflhlizqtmrnyijrwa` sont désormais celles du nouveau
  moteur (odds en ajout seul : l'historique est conservé). En prod, le prochain cron / le bouton
  admin recalcule pareil une fois l'endpoint Foulée déployé.
- **Vérif :** `npx tsc --noEmit -p foulee-paris/tsconfig.json` **+** `npx tsc --noEmit` racine → OK.

### Reste à faire

- [x] **Rejouer un recalcul** (fait le 02/09, route cron sur Foulée local) : nouvelles cotes en base,
      vérifiées à la main (vainqueur, face-à-face, temps). Plafond 100 : 36→15.
- [ ] **Redéployer Cloudflare** pour embarquer le nouveau moteur de cotes (`engine.ts`/`catalog.ts`) :
      `npx opennextjs-cloudflare deploy` avec `CLOUDFLARE_API_TOKEN` en env (token à refournir par
      Antoine, ou `wrangler login`). Sans ça, la prod tourne encore l'ancien moteur — sans impact
      immédiat tant que l'endpoint Foulée est 404 (aucun recalcul prod), mais à faire avant qu'il le soit.
- [ ] **Prérequis prod du cron :** commiter (fait, `e14b875`) **+ déployer sur Vercel** l'endpoint
      `runner-stats` côté Foulée — sinon le cron/recalcul renvoie 404 (`www.foulee.run` pas encore à jour).
      L'appli fonctionne déjà (cotes en base) ; seul le recalcul en ligne attend ce déploiement.
- [ ] **Roter les secrets** transités en clair dans le chat (`SUPABASE_SERVICE_ROLE_KEY`,
      `BETTING_API_SECRET`, token Cloudflare) quand pratique.
- [ ] Saisir les `goal_time_seconds` des coureurs (admin) pour activer les marchés « battra son objectif ».
- [ ] Vérifications finales (voir section « Vérification avant présentation »).

### En attente d'Antoine

- ~~`SUPABASE_SERVICE_ROLE_KEY`~~ **FAIT** : clé secrète `sb_secret_…` posée dans `.env.local`
  (jamais commité). Transitée en clair dans le chat le 31/08 → à roter quand pratique.
- ~~`BETTING_API_SECRET`~~ **FAIT** : posé dans `foulee-paris/.env.local` (jamais commité). Un
  `ODDS_CRON_SECRET` aléatoire y a aussi été généré (protège le cron). Transités en clair dans le
  chat le 31/08 → à roter quand pratique.
- **Déployer l'endpoint `runner-stats` côté Foulée** (commit + Vercel) — non déployé aujourd'hui
  (prod 404). Requis pour que le cron Cloudflare recalcule les cotes en ligne.
- **Token API Cloudflare** au moment du déploiement (jamais commité, jamais versionné). Antoine a
  fourni un token le 31/08 (« périme dans 2 jours ») ; à réutiliser s'il est encore valide, sinon régénérer.
- **Feu vert / veto** sur les garde-fous ajoutés hors spec : `MAX_ODDS = 100`, sensibilité pente
  `0.3`, cotes fixes déterministes (ladder `1,6 / 2,75 / 4,5 / 8`).
- Feu vert / veto sur les 3 décisions par défaut (voir « Décisions design vs brief ») — construites
  en PIN / paris simples / jetons pour le bloc 2, confirmées implicitement.

---

## Périmètre et garde-fous (non négociables)

- **Ne jamais toucher `foulee_pro/`** : ni fichiers, ni paramètres, ni variables d'env, ni
  ressources cloud. Ni le projet Orée.
- **Aucun commit, aucun déploiement (Vercel ou Cloudflare) sans validation explicite
  d'Antoine** après relecture du diff.
- **Paris 100 % fictifs** : mention claire sur toutes les pages publiques (footer + accueil).
- **Argent en entiers uniquement** (centièmes de jeton), jamais de flottant.
- **PIN jamais en clair** : bcrypt, affiché une seule fois à l'admin, jamais renvoyé après.
- **Secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `BETTING_API_SECRET`, token Cloudflare,
  `SESSION_SECRET`, `ODDS_CRON_SECRET`) : env/secrets uniquement, jamais en dur, jamais logués,
  jamais commités.
- **Écritures sensibles** (compte, mise, règlement) : routes serveur + client admin
  uniquement, jamais d'écriture directe côté client.
- Semi Ca$h **n'appelle jamais** la base Supabase de Foulée — seulement l'endpoint HTTP.

---

## Décisions design vs brief (à confirmer par Antoine)

Les maquettes Claude Design (`foulee-paris/design/`) et le brief divergent sur 3 points.
**Défaut retenu = brief** (doc de référence), en attendant validation :

| Sujet | Maquette | Brief (défaut retenu) | Impact |
| --- | --- | --- | --- |
| **Connexion** | Code 6 chiffres « envoyé par email » | **PIN** 6 chiffres généré par l'admin (bcrypt, affiché 1×) | PIN = aucune infra email à monter. Le visuel des 6 cases est réutilisé, le texte adapté. |
| **Ticket de mise** | Semble un **combiné** (10 J → ≈30 J sur 2 sélections) | **Paris simples** (1 wager = 1 sélection) | Le schéma `wagers` et le règlement sont écrits pour des paris simples. |
| **Unité / départ** | « jetons » (J), départ **100 J** | Proposition « FouléCoins » / 1000 | **Maquette gagne** : jetons, départ 100 J, stockés en centièmes (100 J = 10000). |

Marché **« Dernière place du groupe »** présent dans la maquette mais absent du catalogue du
brief → proposé en bonus (trivial depuis le Monte Carlo), non implémenté par défaut.

---

## Stack technique

| Composant | Technologie | Détail |
| --- | --- | --- |
| Frontend | Next.js 16.2.7 (App Router) + TypeScript | Autonome, `foulee-paris/` |
| React | 19.2.4 | Aligné sur Foulée pour cohérence de l'environnement |
| Styles | CSS + variables (pas de Tailwind) | Tokens repris des maquettes, styles inline |
| Police | Space Grotesk (titres/cotes) + Inter (UI) | via `next/font/google` |
| Base de données | Supabase (PostgreSQL 17) | Projet `foulee_paris` (`vmfflhlizqtmrnyijrwa`), `eu-west-3` |
| Accès DB | `@supabase/supabase-js` (service role) | RLS deny-all, tout passe par les routes serveur |
| Hash PIN | `bcryptjs` (pur JS) | Compatible edge/Workers (pas de binaire natif) |
| Session | Cookie httpOnly signé via `jose` (JWT) | Pas de Supabase Auth (volume = 5 comptes) |
| Hosting | Cloudflare (compte `fonfreyde.antoine@gmail.com`) | Racine de build = `foulee-paris/` |
| Cron | Cloudflare Cron Trigger | Recalcul cotes 6 h + fermeture 12/09 minuit Europe/Paris |
| Intégration | HTTP vers Foulée `runner-stats` | Lecture seule, secret Bearer partagé |

**Méthode de déploiement Next.js sur Cloudflare :** à revérifier au moment de l'implémentation
(outillage mouvant — probablement `@opennextjs/cloudflare`). Repli en dernier recours et
seulement en le signalant : SPA Vite + API Cloudflare Workers (Hono).

---

## Intégration avec Foulée (endpoint `runner-stats`)

- **URL :** `FOULEE_RUNNER_STATS_URL` (prod : `https://www.foulee.run/api/betting/runner-stats`).
- **Auth :** header `Authorization: Bearer ${BETTING_API_SECRET}` — **même valeur** que celle
  posée côté Foulée (`.env.local` + Vercel). 401 si absent/incorrect.
- **Réponse :** `{ generated_at, program_start_date, race_date, runners: [...] }`.
  Chaque runner : `first_name`, `runner_level`, `weekly_sessions`, `goal_time`,
  `best_recent_time`, `weekly_stats[]`, `current_program_week`, `days_until_race`.
  Chaque `weekly_stats[]` (une par semaine de programme) : `week_number`, `total_distance_km`,
  `session_count`, `longest_run_km` (null si aucune séance), `avg_pace_min_per_km`
  (= `sum(min)/sum(km)`, null si 0 km), `pain_flag_count`, `planned_session_count`,
  `planned_long_run_km` (null si absent).
- **Correspondance coureurs :** sur `first_name` uniquement (table `runners.foulee_first_name`).
  Pas de partage des `user_id` Supabase de Foulée.
- **`goal_time` :** texte libre non structuré côté Foulée (ex. « finir sous 2h ») → l'admin
  saisit manuellement `runners.goal_time_seconds` (ex. 7200), pas de parsing automatique.
- **Source Foulée (fichier) :** `app/api/betting/runner-stats/route.ts` à la racine du dépôt.

---

## Schéma de base de données (`foulee_paris`)

> Monnaie : **entiers en centièmes de jeton** (1 jeton = 100). Départ = 10000 (= 100 J).

### `bettors`
`id` uuid pk · `first_name` · `last_name?` · `email` unique · `pin_hash` (bcrypt) ·
`balance_cents` int (contrainte `>= 0`) · `is_admin` bool · `created_at`.

### `runners`
`id` uuid pk · `first_name` · `goal_time_seconds?` int (saisi par l'admin) ·
`foulee_first_name` (clé de correspondance API Foulée).
**Seedés :** Antoine, Hugo, Rémi, Alix (IDs générés en base, ne pas les coder en dur ; les
relire via `select`).

### `runner_stats_snapshots`
`id` · `runner_id` fk · `computed_at` · `projected_time_seconds` · `sd_seconds` ·
`form_score` · `adherence_pct` · `reference_distance_km` · `source_as_of` (timestamp de la
donnée Foulée utilisée). Une ligne par coureur à chaque recalcul.

### `markets`
`id` · `key` (slug unique, ex. `vainqueur`, `duel_antoine_hugo`) · `label` ·
`type` enum (`winner` / `podium_full` / `head_to_head` / `time_bracket` / `prop`) ·
`status` (`open` / `closed` / `settled`) · `closes_at`.

### `selections`
`id` · `market_id` fk (on delete cascade) · `label` · `runner_id?` (nullable pour les
sélections composites, ex. classement complet) · `meta` jsonb.

### `odds`  *(table en AJOUT SEUL, jamais d'update)*
`id` · `selection_id` fk · `decimal_odds` numeric · `computed_at`. La cote courante d'une
sélection = la ligne la plus récente (`order by computed_at desc limit 1`).

### `wagers`
`id` · `bettor_id` fk · `selection_id` fk · `stake_cents` int (`> 0`) ·
`odds_at_placement` numeric (cote figée à la mise) · `potential_payout_cents` int ·
`status` (`pending` / `won` / `lost` / `void`) · `placed_at`.

### `transactions`  *(grand livre du solde)*
`id` · `bettor_id` fk · `type` (`grant_initial` / `stake` / `payout` / `adjustment`) ·
`amount_cents` int (signé) · `balance_after_cents` int · `created_at` · `related_wager_id?`.

### `settlements`
`id` · `market_id` fk **unique** (un seul règlement courant par marché) · `settled_at` ·
`winning_selection_ids` uuid[] · `official_results` jsonb (temps officiels + classement réel).

### Index
`selections(market_id)` · `odds(selection_id, computed_at desc)` · `wagers(bettor_id)` ·
`wagers(selection_id)` · `wagers(status)` · `transactions(bettor_id, created_at desc)` ·
`runner_stats_snapshots(runner_id, computed_at desc)`.

### RLS
Activé sur **toutes** les tables, **aucune policy** → seul le service role (routes serveur)
accède aux données. L'anon/publishable key ne peut rien lire ni écrire. Les 9 avertissements
`rls_enabled_no_policy` (INFO) sont donc **attendus et voulus**, pas des failles.

---

## Moteur de cotes (à implémenter)

Fonction serveur, appelée par le Cron Trigger (toutes les 6 h) **et** par un bouton
« recalculer » dans l'admin. Étapes :

1. **Récupération.** Appeler `GET runner-stats` (secret partagé). Stocker la réponse brute
   pour référence (`source_as_of`).
2. **Temps projeté par coureur.** Prendre, sur les **3 dernières semaines glissantes** de
   `weekly_stats`, la semaine au plus grand `longest_run_km`, et son `avg_pace_min_per_km`
   associé → temps de référence (s). Extrapoler vers 21,1 km (Riegel) :
   `temps_projete = temps_reference * (21.1 / distance_reference) ^ 1.06`.
   Si aucune sortie sur 3 semaines : élargir à 4 puis 6 semaines avant d'exclure le coureur
   des marchés concernés (cas limite à gérer proprement, ne doit pas faire échouer le calcul).
3. **Ajustement de forme** (facteurs multiplicatifs sur le temps projeté) :
   - *Tendance d'allure* : régression linéaire simple de `avg_pace_min_per_km` sur les 6
     dernières semaines (semaine en x). Pente négative (progrès) → facteur < 1 (jusqu'à 0,97) ;
     pente positive → facteur > 1 (jusqu'à 1,03).
   - *Assiduité* : `session_count / planned_session_count` sur 4 semaines, cappé à 100 %.
     Sous 70 % → pénalité (jusqu'à 1,03).
   - *Douleurs* : si `pain_flag_count > 2` sur 4 semaines → pénalité 1,02.
   - Les facteurs se multiplient entre eux et avec le temps projeté brut.
4. **Écart type de simulation.**
   `sd_seconds = temps_projete * (0.04 + 0.01 * max(0, (21.1 - distance_reference) / 5))`.
   Plancher : jamais sous 3 % du temps projeté.
5. **Monte Carlo.** 20 000 tirages. Par tirage : un temps par coureur ~ N(temps ajusté,
   `sd_seconds`), tronqué positif ; classer les 4. Compter les fréquences → probabilités.
6. **Conversion en cotes.** `cote = round(1 / (proba * 1.07), 2)`, **plancher 1,05**.
7. **Écriture.** Une nouvelle ligne `odds` par sélection (jamais d'update) + une ligne
   `runner_stats_snapshots` par coureur.
8. **Fermeture.** Le cron vérifie l'heure : si 12/09/2026 minuit Europe/Paris dépassé → tous
   les marchés `open` → `closed`, arrêt des recalculs (dernier jeu de cotes gelé, grisé, plus
   aucune mise).

Les marchés **déterministes** (progression d'allure, assiduité, douleurs) n'utilisent pas le
Monte Carlo : calcul direct sur `weekly_stats`, cote fixe simple selon le classement.

---

## Catalogue de marchés à créer

- **Vainqueur** (`winner`) : 4 sélections (une par coureur).
- **Classement complet** (`podium_full`) : 24 sélections (permutations des 4), proba/cote
  directes depuis les fréquences Monte Carlo.
- **Face à face** (`head_to_head`) : 6 marchés (chaque paire), 2 sélections chacun.
- **Temps d'arrivée** (`time_bracket`) : 4 marchés (un par coureur), 4 tranches :
  `< 1h45`, `1h45-2h00`, `2h00-2h15`, `> 2h15`.
- **Battra son objectif** (`prop`) : un marché par coureur ayant `goal_time_seconds` renseigné,
  2 sélections (oui/non), proba = part des simulations où le temps tiré < `goal_time_seconds`.
- **Meilleure progression d'allure** (`prop`, déterministe) : 1 marché, 4 sélections (pente
  d'allure la plus favorable sur 6 semaines).
- **Meilleure assiduité** (`prop`, déterministe) : 1 marché, 4 sélections.
- **Le moins de séances avec douleur** (`prop`, déterministe) : 1 marché, 4 sélections ;
  libellé **léger et bienveillant**, jamais clinique ni moqueur.
- *(Bonus proposé, non validé)* **Dernière place du groupe** : 4 sélections, P(dernier) via
  Monte Carlo.

---

## Mise & règlement

- Un parieur ne peut jamais miser plus que `balance_cents` (vérif **serveur** avant insertion,
  jamais côté client seul). Le solde ne doit **jamais** devenir négatif, y compris en cas de
  double-clic / requêtes concurrentes (traiter la mise de façon atomique : débit + insertion
  wager + transaction dans une opération sûre).
- Cote **figée** à la mise (`odds_at_placement`), gain potentiel affiché avant confirmation
  (`stake_cents * odds_at_placement`).
- Après la course : formulaire admin de saisie des résultats officiels (temps + ordre réel)
  → `settlements.official_results`.
- À la validation : pour chaque marché ouvert/fermé non réglé, calcul des sélections
  gagnantes, mise à jour `wagers.status`, création des `transactions` `payout`, mise à jour
  `balance_cents`.
- **Rejouable sans double crédit** : vérifier qu'un `settlement` déjà appliqué n'est pas
  réappliqué (contrainte `unique(market_id)` + garde-fou logique avant crédit).

---

## Authentification

- **Login parieur :** email + PIN 6 chiffres → vérif bcrypt serveur → session cookie httpOnly
  signé (`jose`). Pas de Supabase Auth.
- **Création parieur (admin) :** générer un PIN aléatoire 6 chiffres serveur → bcrypt → stocker
  le hash uniquement → **afficher le PIN en clair une seule fois** à l'admin (jamais stocké en
  clair, jamais renvoyé ensuite) → créditer `balance_cents` (départ 100 J = 10000) via une
  `transaction` `grant_initial`.
- **Admin :** routes protégées, accessibles seulement si `is_admin = true`.

---

## Structure des dossiers (`foulee-paris/`)

```
foulee-paris/
├── design/                       ← maquettes Claude Design (Semi Ca$h, OddsTile, ios-frame)
├── app/
│   ├── globals.css               ← design tokens (palette oklch, fonts)
│   ├── layout.tsx                ← fonts + <html> (thème sombre)
│   ├── page.tsx                  ← Accueil (countdown, pitch, 4 avatars, CTA)
│   ├── login/                    ← [à créer] email + PIN
│   ├── paris/                    ← [à créer] marchés + ticket de mise
│   ├── mon-compte/               ← [à créer] solde + historiques
│   ├── classement/               ← [à créer] gains cumulés
│   ├── admin/                    ← [à créer] parieurs, goal_time, recalcul, règlement
│   └── api/                      ← [à créer] routes serveur (auth, mise, cotes, cron, règlement)
├── components/
│   └── Disclaimer.tsx            ← disclaimer paris fictifs
├── lib/
│   ├── money.ts                  ← jetons ↔ centièmes, formatage FR
│   ├── types.ts                  ← types des tables Supabase
│   ├── supabase/admin.ts         ← createAdminClient (service role, server-only)
│   ├── odds/                     ← [à créer] moteur de cotes (Riegel, Monte Carlo)
│   └── auth/                     ← [à créer] PIN bcrypt + session jose
├── package.json                  ← deps autonomes (next, react, supabase-js, bcryptjs, jose)
├── tsconfig.json                 ← paths @/* → ./ ; exclude design
├── next.config.ts
├── .env.local.example            ← variables (sans valeurs)
├── .gitignore                    ← node_modules, .next, .env*, .wrangler, .open-next
└── foulee-paris.md               ← ce fichier
```

---

## Variables d'environnement (`foulee-paris/.env.local`)

*(noms uniquement — valeurs jamais dans ce dépôt)*

```bash
NEXT_PUBLIC_SUPABASE_URL=https://vmfflhlizqtmrnyijrwa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=          # Dashboard Supabase > Settings > API (SECRET)
FOULEE_RUNNER_STATS_URL=https://www.foulee.run/api/betting/runner-stats
BETTING_API_SECRET=                 # MÊME valeur que côté Foulée
SESSION_SECRET=                     # signe les cookies de session (aléatoire long)
ODDS_CRON_SECRET=                   # protège le cron cotes/fermeture
RACE_DATE=2026-09-13
BETS_CLOSE_AT=2026-09-12T23:59:59+02:00
```

Côté **Cloudflare** : mêmes clés en secrets (jamais commitées). Token API Cloudflare demandé
à Antoine au moment du déploiement.

---

## Design system — « Semi Ca$h » (repris des maquettes)

Thème **sombre unique**, style bookmaker. Distinct de Foulée (ne pas réutiliser Studio · Jour).

```css
--bg:          oklch(0.15 0.02 258);   /* fond app */
--surface:     oklch(0.20 0.02 258);
--surface-2:   oklch(0.24 0.02 258);   /* tuiles */
--border:      oklch(0.32 0.02 258);
--gold:        oklch(0.78 0.15 85);    /* cotes & CTA */
--violet:      oklch(0.78 0.15 290);   /* accent secondaire */
--gain:        oklch(0.72 0.17 145);
--loss:        oklch(0.66 0.19 25);
--text:        oklch(0.97 0.004 258);
--text-sub:    oklch(0.68 0.01 258);
--text-muted:  oklch(0.50 0.01 258);
--text-body:   oklch(0.85 0.006 258);
/* avatars */ Antoine oklch(.7 .14 85) · Hugo oklch(.7 .14 290) · Rémi oklch(.7 .14 195) · Alix oklch(.7 .14 35)
```

- **Fonts :** Space Grotesk 600/700 (titres, cotes, chiffres) · Inter 400/500/600/700 (UI).
- **OddsTile** (`design/OddsTile.dc.html`) : tuile cote. Sélectionnée = fond `--gold`, texte
  `--bg`. Non sélectionnée = fond `--surface-2`, bordure `--border`, cote en `--gold`.
  `min-width:88px`, `border-radius:14px`, label + cote centrés.
- **Nav basse (3 onglets) :** Paris · Classement · Compte.
- **États pari :** pastille « Gagné » (vert tint), « Perdu » (rouge tint), « En attente »
  (surface neutre).
- **Écrans maquettés** (`design/Semi Cash - Maquettes.dc.html`) : 1 Accueil · 2 Connexion ·
  3 Paris · 4 Mon compte · 5 Classement. **Lire ces maquettes avant de coder une page.**

---

## Isolation vis-à-vis du build de Foulée (critique)

- Le `tsconfig.json` **racine** inclut `**/*.ts`/`**/*.tsx` : sans exclusion, `next build`
  (Vercel) type-checkerait `foulee-paris/`, dont les deps distinctes (bcryptjs, jose, adaptateur
  Cloudflare…) **casseraient** le build.
- **Solution en place :** `foulee-paris` ajouté à `exclude` du `tsconfig.json` racine.
  Vérifier après toute nouvelle dépendance que `npx tsc --noEmit` **à la racine** reste OK.
- Nuance : `foulee_pro/` n'est **pas** exclu aujourd'hui — il ne survit au build racine que
  parce que c'est un clone à `package.json`/deps identiques. Ne pas s'en inspirer ; garder
  l'exclusion réelle pour `foulee-paris/`. **Ne pas modifier le traitement de `foulee_pro/`.**

---

## Sécurité

- PIN jamais en clair, jamais renvoyé après création (bcrypt).
- Secrets en env/secrets uniquement, jamais en dur, jamais logués, jamais commités.
- Toutes les écritures sensibles via routes serveur + client admin, jamais depuis le client.
- Solde jamais négatif (vérif serveur atomique, robuste aux requêtes concurrentes).
- RLS deny-all : l'anon key est inerte.
- Disclaimer « paris fictifs » visible sur toutes les pages publiques.
- Semi Ca$h ne fait aucun appel réseau vers la base Supabase de Foulée
  (`anxmkfhxjslyfayixgok`) — seulement l'endpoint HTTP `runner-stats`.

---

## Vérification avant présentation à Antoine

- Lancer un recalcul de cotes avec les **vraies** données Foulée (endpoint réel) et vérifier à
  la main, sur ≥ 2 marchés, que proba → cote correspond à la formule appliquée hors code.
- Vérifier que le solde ne peut jamais devenir négatif (double-clics / concurrence).
- Vérifier qu'aucun appel réseau n'atteint la base Supabase de Foulée depuis `foulee-paris/`.
- Vérifier la fermeture auto des marchés à la date de coupure (tester avec une date rapprochée
  artificielle).
- Confirmer que le build racine de `coach_semi` n'est pas affecté (`npx tsc --noEmit` racine).

---

## Décisions techniques importantes

| Date | Décision | Raison |
| --- | --- | --- |
| 31/08/26 | Projet Supabase dédié `foulee_paris` (`vmfflhlizqtmrnyijrwa`, eu-west-3) | Isolation stricte vis-à-vis de Foulée ; correspondance coureurs sur `first_name` seul |
| 31/08/26 | Argent en **centièmes de jeton** (entiers), départ 100 J | Gère les gains décimaux (ex. +8,5 J) sans flottant ; aligné sur la maquette (« jetons ») |
| 31/08/26 | **RLS deny-all** (aucune policy) | Auth = cookie custom (pas de Supabase Auth) → tout passe par le service role serveur |
| 31/08/26 | Auth **PIN** (défaut) plutôt qu'OTP email | Le brief spécifie le PIN ; évite de monter une infra email pour 5 comptes |
| 31/08/26 | **Paris simples** (défaut) plutôt que combinés | Schéma `wagers` et règlement du brief écrits pour des paris simples |
| 31/08/26 | Pas de Tailwind | Design en variables CSS + styles inline, fidèle aux maquettes, moins de deps |
| 31/08/26 | `bcryptjs` + `jose` | Compatibles edge/Cloudflare Workers (pas de binaire natif) |
| 31/08/26 | `foulee-paris` exclu du `tsconfig.json` racine | Empêche le `next build` de Foulée de type-checker des deps distinctes |
| 31/08/26 | `turbopack.root = __dirname` dans `next.config.ts` | Sans ça, Turbopack remonte au lockfile racine du monorepo et compile `proxy.ts` de Foulée (erreur `@/lib/supabase/middleware` introuvable) |
| 31/08/26 | Admin bootstrap via `pgcrypto` (`crypt`/`gen_salt('bf')`) | Amorce le 1er admin (Antoine) sans UI ; hash bcrypt `$2a$` vérifiable par `bcryptjs` |
| 31/08/26 | Session = JWT `jose` en cookie httpOnly (pas Supabase Auth) | 5 comptes, RLS deny-all, tout passe par le service role serveur |
| 31/08/26 | Mise & règlement en **fonctions Postgres** (`place_wager`, `settle_market`) | Atomicité vraie (verrou `FOR UPDATE`, une transaction) : solde jamais négatif en concurrence ; règlement idempotent via `settlements.market_id` unique |
| 31/08/26 | Monte Carlo **graine** (mulberry32) | Recalculs reproductibles (vérif à la main, tests) ; à 20 000 tirages les probas sont stables |
| 31/08/26 | `MAX_ODDS = 100` (plafond de cote, hors spec) | Évite des cotes à 5 chiffres sur les issues quasi impossibles (permutations de classement) ; à valider par Antoine |
| 31/08/26 | Cotes fixes déterministes par rang (ladder `1,6/2,75/4,5/8`) | Spec : « cote fixe simple selon le classement » — pas de Monte Carlo pour progression/assiduité/douleurs |
| 31/08/26 | Cote **figée côté serveur** à la mise (dernière ligne `odds`), pas celle du client | Empêche de miser à une cote périmée/falsifiée ; `odds_at_placement` fait foi |
| 02/09/26 | `MODEL_UNCERTAINTY = 0.06` + `EXTRAPOLATION_SENSITIVITY = 0.06` (quadrature dans `sd`) + `SHRINKAGE_LAMBDA = 0.05` (lissage par marché) | Cotes réalistes : le modèle ignorait l'incertitude d'estimation (Riegel sur peu de données) → outsiders à 100. L'incertitude croît maintenant avec la distance d'extrapolation (coureur mal renseigné = SD plus large). Sans casser la formule ni `MAX_ODDS`. Réglable. Validé par Antoine ; plafond 100 : 36→15 en live |

---

## Commandes utiles

```bash
# Dépendances (dans foulee-paris/)
cd foulee-paris && npm install

# Développement local
npm run dev            # http://localhost:3000 (depuis foulee-paris/)

# Build
npm run build

# Vérifier que le build racine de Foulée n'est pas cassé (à la RACINE du dépôt)
npx tsc --noEmit
```

**Accès Supabase pour une nouvelle session :** utiliser le MCP Supabase, projet
`vmfflhlizqtmrnyijrwa` (ne jamais confondre avec Foulée `anxmkfhxjslyfayixgok`).

---

## Ce qu'un agent IA doit absolument savoir

1. **`foulee_pro/` et Orée : hors périmètre absolu.** Ne rien y toucher.
2. **Deux bases Supabase distinctes** : Semi Ca$h = `vmfflhlizqtmrnyijrwa`, Foulée =
   `anxmkfhxjslyfayixgok`. Semi Ca$h ne parle à Foulée que par l'endpoint HTTP `runner-stats`.
3. **Aucun commit / déploiement sans validation d'Antoine.**
4. **Argent = entiers (centièmes de jeton).** Jamais de flottant. Solde jamais négatif.
5. **Secrets jamais en clair** dans le code, les logs, ce fichier ou un fichier versionné.
6. **`odds` = ajout seul** (historisation), la cote courante est la plus récente.
7. **Règlement rejouable** sans double crédit (`settlements.market_id` unique + garde-fou).
8. **Lire les maquettes** (`design/`) avant de coder une page ; reprendre fidèlement la DA.
9. **Vérifier `tsc --noEmit` racine** après toute nouvelle dépendance de `foulee-paris/`.
10. Correspondance coureurs sur `first_name` ; `goal_time_seconds` saisi à la main par l'admin.
