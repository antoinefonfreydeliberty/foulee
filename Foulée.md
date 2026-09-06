# Foulée

*Mis à jour le 10 août 2026*

---

## Résumé rapide

Application web de coaching IA pour la préparation d’un semi-marathon. Produit fermé, destiné à un groupe de 4 coureurs (Antoine, Hugo, Rémi, Alix) préparant le **semi-marathon Vannes-Auray du 13 septembre 2026**. Programme de 14 semaines démarré le 9 juin 2026 (semaines alignées sur le lundi, `PROGRAM_START_DATE = 2026-06-08`). Chaque coureur dispose d’un coach IA personnalisé, d’un programme adaptatif hebdomadaire, d’un journal d’entraînement et d’une vue partagée sur la progression du groupe.

**URL de production :** `https://www.foulee.run`**Repo GitHub :** `antoinefonfreydeliberty/foulee` (branche `main`)
**Déploiement :** Vercel, auto-deploy depuis `main`

---

## Objectif du projet

### Problème résolu

Les apps de running génériques (Strava, Nike Run Club) ne connaissent pas le coureur, ne s’adaptent pas à sa semaine réelle, et n’offrent aucun accompagnement personnalisé. Il manque un vrai coach accessible à tout moment.

### Valeur apportée

- Programme sur mesure généré à l’onboarding, adapté chaque semaine
- Coach IA disponible 24/7 pour questions entraînement, récup, nutrition, motivation
- Email hebdomadaire personnalisé avec analyse et programme de la semaine suivante
- Dimension collective : 4 amis préparent la même course ensemble
- Jamais culpabilisant, jamais militaire — bienveillant et pragmatique

### Philosophie produit

> Simple · Chaleureux · Motivant · Utile · Non culpabilisant
> 

---

## Statut actuel

**Niveau :** Production (MVP fermé)

### Ce qui fonctionne

- Déploiement Vercel : OK, zéro erreur TypeScript
- Authentification OTP custom (email → code 6 chiffres via Brevo)
- Onboarding 5 étapes avec génération programme 14 semaines via Claude API
- Dashboard principal (stats, objectif, plan semaine, zones cardiaques)
- Journal d’entraînement avec historique (saisie + liste des séances passées)
- Check-in hebdomadaire (5 questions + saisie séances non notées)
- Chat coach IA streaming avec rendu markdown et historique 4 semaines
- Vue groupe (progression des 4 coureurs)
- Rapports hebdomadaires
- Page conseils du coach (accessible via URL, hors navigation principale)
- Cron hebdomadaire Vercel (`0 19 * * 0`) + pipeline email Brevo ✓ **confirmé opérationnel le 14/06**
- DNS Brevo complet (Code, DKIM 1+2, DMARC) ✓
- Sender `coach@foulee.run` vérifié ✓
- Design system Studio · Jour appliqué sur toutes les pages
- PWA : manifest, icônes, `app/apple-icon.png` (convention Next.js App Router)
- Emails d’invitation envoyés à Hugo, Rémi, Alix
- Les 4 coureurs ont complété leur onboarding ✓
- **Premier email hebdomadaire envoyé aux 4 coureurs le 14/06** ✓
    - Hugo et Rémi : via le cron automatique Vercel (19:33-19:34 UTC)
    - Alix : via déclenchement manuel (erreur extractJSON intermittente au premier passage)
    - Antoine : via déclenchement manuel (email_sent_at pollué par un test du 09/06)
- **Fixes du 18/06 déployés** : cron week_start aligné sur le programme, vue groupe objectif dynamique, prompts rapport renforcés (stats pré-calculées + règle anti-tiret cadratins)
- **Fixes du 15/07 déployés** : suppression des tirets cadratins/demi-cadratins dans l'email (+ filet `sanitizeDashes`), anti-répétition du prénom, correction du faux message « programme démarre » sur les semaines blanches après la semaine 1

### Ce qui manque / est en cours

- Icône PWA noire sur l’appareil d’Antoine (bug isolé à son device)
- Lien vers `/dashboard/checkin` depuis le dashboard (accessible uniquement via email ou URL directe)
- Corriger le compteur `processed` dans la réponse JSON du cron (cosmétique)

---

## Fonctionnalités principales

### Authentification

- Connexion par code OTP à 6 chiffres (flux custom, indépendant de Supabase auth)
- Email envoyé via Brevo depuis `coach@foulee.run`
- Vérification côté serveur → `admin.generateLink` → `verifyOtp({ token_hash, type: 'magiclink' })`
- Page login avec email pré-rempli si paramètre `?email=` présent dans l’URL

### Onboarding (5 étapes)

1. Prénom, objectif, niveau
2. Disponibilités hebdomadaires
3. Fréquence cardiaque max / repos
4. Choix du coach (Marc / Léa / Thomas / Sophie)
5. Génération du programme 14 semaines via Claude API

### Dashboard (Bilan)

- Semaine en cours du programme (calculée dynamiquement)
- Nombre de jours avant la course
- Statistiques hebdomadaires (km, allure, séances)
- Plan de la semaine avec badges zones cardiaques
- Bulle coach avec message personnalisé et bouton “Répondre”
- Navigation basse (Bilan, Journal, Coach, Groupe, Rapports)
- Bilan course : le jour de la course (`RACE_DATE`, Europe/Paris) et tant qu'aucune séance n'est enregistrée à cette date, invitation à saisir la séance de course. Le jour J = modale bloquante (fermable via croix / « Plus tard »), les jours suivants = carte inline non bloquante. Réutilise `POST /api/training-log` (aucune route dédiée) ; la séance rejoint `training_logs` et apparaît dans le Journal

### Journal d’entraînement

- Formulaire de saisie : date, distance, durée (min + sec), allure calculée auto, ressenti (1-5), douleurs, notes libres
- Calcul allure : `calcPace(distance, duration)` → min/km
- Historique des séances passées affiché sous le formulaire, triées date desc
- Chaque carte de l'historique est un accordéon dépliable en place (lecture seule, même pattern visuel que les Bilans hebdomadaires) : au tap, détail complet de la séance (date, distance, durée, allure, ressenti, douleurs, notes libres)
- Suppression d'une séance : dans le détail déplié, bouton « Supprimer la sortie » (icône corbeille) → modal de confirmation (`ConfirmDialog`) → `DELETE /api/training-log/{id}`. En cas de succès la carte disparaît de la liste (état local) ; en cas d'échec la séance reste et un message simple est affiché. Seul point de suppression de l'app (pas dans Groupe, Chat, Rapports)
- Affichage  si aucune donnée (jamais `0 km`)
- Toutes les séances (journal + check-in) convergent dans `training_logs` et apparaissent ici

### Check-in hebdomadaire

- 5 questions : énergie, motivation, douleurs (tags), respect du programme, commentaire libre
- Section supplémentaire “Sorties non encore notées cette semaine” :
    - Toggle Non/Oui
    - Si Oui : jusqu’à 5 séances (jour de la semaine, distance, durée, allure calculée, ressenti)
    - Les séances saisies sont sauvegardées dans `training_logs` via `/api/training-log`
    - En cas d’échec d’une séance, la soumission du check-in n’est pas bloquée
- Accessible depuis le lien dans l’email du dimanche ou via URL `/dashboard/checkin`

### Chat coach IA

- Streaming via API Anthropic (`claude-sonnet-4-6`)
- Route : `app/api/conversation/route.ts`
- Historique persistant (`coach_conversations`)
- Rendu markdown : `react-markdown` avec composants compacts (p, ul, ol, li)
- Curseur de streaming `▊` appendé inline
- Messages utilisateur : texte brut, messages coach : markdown rendu
- Suggestions rapides contextuelles

**Contexte injecté dans chaque message :**

- Persona du coach (prénom + ton)
- Profil utilisateur (niveau, objectif, FC)
- Semaine courante du programme
- Séances prévues cette semaine
- Dernier check-in (ressenti, douleurs)
- **Historique d’entraînement des 4 dernières semaines** (km, séances, allure moy par semaine — résumé agrégé, pas de lignes brutes)
- Historique de la conversation

### Vue groupe

- Progression de tous les coureurs (km/semaine, allure, forme)
- Défi collectif hebdomadaire (objectif km en équipe, calculé dynamiquement depuis `training_programs.total_volume_km`)
- Classement de la semaine
- Accessible à tous (pas d’opt-out)
- Données récupérées via `createAdminClient` (service role, bypass RLS)

### Rapports hebdomadaires

- Générés par le cron chaque dimanche
- Stockés dans `weekly_reports` (texte qualitatif : `coach_analysis`, `coach_tips`, `next_week_program`)
- Page Rapports : hero distance totale, graphique km/semaine, cartes accordéon « Bilans hebdomadaires »
- Les chiffres affichés (distance totale, km/sorties/allure par semaine) sont recalculés en direct depuis `training_logs`, jamais lus depuis la colonne figée `weekly_reports.stats` (une séance saisie après le cron de sa semaine est donc comptée correctement)
- Cartes et barres du graphique uniquement pour les semaines ayant déjà un rapport ; barres cliquables (tap → ouvre et scrolle vers la carte de la semaine)
- Pas de sélecteur de période (les boutons Sem. / Mois / Saison, non fonctionnels, ont été supprimés)

### Email hebdomadaire (cron)

- Déclenché : `0 19 * * 0` (dimanche 19h UTC = ~21h Paris)
- Traitement séquentiel par utilisateur avec isolation des erreurs
- Idempotence via `email_sent_at` (empêche double envoi)
- Semaine 1 : message d’accueil même si données vides
- Contenu : analyse semaine passée (basée sur `training_logs`) + programme semaine suivante + encouragements
- Les séances saisies dans le journal en cours de semaine sont incluses dans l’analyse
- Les séances saisies lors du check-in du dimanche soir arrivent après le cron → incluses la semaine suivante

### Email d’invitation

- Script one-shot `scripts/send-invitations.mjs`
- Template HTML complet avec présentation de Foulée
- Bouton CTA avec email pré-rempli dans l’URL : `?email=xxx`
- Expéditeur : “Antoine via Foulée” / `coach@foulee.run`

### PWA

- Manifest : `public/manifest.json` (start_url: /dashboard, display: standalone)
- Icône iOS : `app/apple-icon.png` (convention Next.js App Router, générée automatiquement)
- Icônes Android : `public/icon-192.png`, `public/icon-512.png`
- Fond terracotta `#C5402C`, opaque (alpha=255 vérifié)
- Middleware exclu pour les assets PWA

---

## Stack technique

| Composant | Technologie | Détail |
| --- | --- | --- |
| Frontend | Next.js App Router + TypeScript | Client components, Server Actions |
| Styles | Tailwind CSS + CSS variables | Design system Studio · Jour |
| Police | Plus Jakarta Sans (Google Fonts) | Weight max : 800 |
| Auth | Custom OTP via Supabase Admin | Voir flux détaillé ci-dessous |
| Base de données | Supabase (PostgreSQL) | Projet `anxmkfhxjslyfayixgok`, Paris `eu-west-3` |
| IA | Anthropic API `claude-sonnet-4-6` | Conversations streaming + génération programme |
| Email transactionnel | Brevo (API v3) | `coach@foulee.run`, SMTP configuré dans Supabase |
| Hosting | Vercel (plan Hobby) | Projet `foulee`, domaine `foulee.run` |
| Cron | Vercel Cron Jobs | `vercel.json`, 1 job hebdomadaire |
| Middleware | `proxy.ts` (NE PAS renommer) | Auth guard + redirection |
| PWA | Next.js App Router file conventions | `app/apple-icon.png`, `public/manifest.json` |

---

## Architecture globale

### Flux d’authentification (OTP custom)

```
1. User saisit email sur /login
2. POST /api/auth/send-otp
   → Génère code 6 chiffres (crypto.randomInt)
   → Hash SHA-256 → stocke dans otp_codes (expire 10min)
   → Envoie email via Brevo API
3. User saisit le code
4. POST /api/auth/verify-otp
   → Vérifie hash dans otp_codes (max 5 tentatives)
   → Marque comme utilisé
   → supabase.auth.admin.generateLink({ type: 'magiclink', email })
   → Retourne { token_hash }
5. Client : supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
   → Session Supabase créée
6. router.push('/dashboard')
```

### Flux cron hebdomadaire

```
Vercel Cron (0 19 * * 0)
→ GET /api/cron/weekly-report [Authorization: Bearer CRON_SECRET]
→ Pour chaque utilisateur (séquentiel, erreurs isolées) :
   1. Vérifier email_sent_at (idempotence)
   2. Récupérer training_logs de la semaine (inclut séances journal + check-in antérieurs)
   3. Récupérer weekly_checkin de la semaine
   4. Appel Claude : générer JSON weekly_report
   5. Stocker dans weekly_reports
   6. Appel Claude : générer HTML email personnalisé
   7. Envoyer via Brevo
   8. Mettre à jour email_sent_at
```

### Flux génération programme (onboarding)

```
Étape 5 de l'onboarding
→ Récupérer profil complet (niveau, dispo, FC, coach choisi)
→ Appel Claude avec prompts spécialisés
→ Générer programme JSON 14 semaines (séances typées, zones cardiaques)
→ Stocker dans training_programs (upsert par semaine)
→ Redirect → /dashboard
```

### Flux chat coach

```
User envoie message
→ POST /api/conversation (streaming)
→ Récupérer historique coach_conversations
→ Récupérer profil + semaine courante + check-in
→ Récupérer training_logs des 4 dernières semaines → résumé agrégé
→ Appel Claude streaming avec persona du coach
→ Stream SSE vers le client
→ Stocker message + réponse dans coach_conversations
```

### Flux check-in avec séances

```
User ouvre /dashboard/checkin
→ Répond aux 5 questions
→ Si sorties non notées : saisit jusqu'à 5 séances (jour, distance, durée, ressenti)
→ Submit :
   1. POST /api/checkin → weekly_checkins (check-in)
   2. Pour chaque séance : POST /api/training-log → training_logs
      (erreurs isolées, ne bloque pas le check-in)
→ Séances visibles dans le Journal dès la prochaine ouverture
```

### Middleware (proxy.ts)

```
Toutes les requêtes → proxy.ts
→ Exclure : _next/static, _next/image, favicon.ico,
           apple-icon.png, manifest.json, icon-192.png, icon-512.png
→ Exclure : /auth/* (critique pour PKCE callback)
→ Si session valide → next()
→ Si pas de session + route protégée → redirect /login
```

---

## Structure des dossiers/fichiers

```
foulee/
├── app/
│   ├── apple-icon.png
│   ├── globals.css
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx
│   └── dashboard/
│       ├── page.tsx                  ← Dashboard (Bilan)
│       ├── log/
│       │   └── page.tsx              ← Journal + historique séances
│       ├── checkin/
│       │   └── page.tsx              ← Check-in hebdomadaire
│       ├── conversation/
│       │   └── page.tsx              ← Chat coach IA
│       ├── groupe/
│       │   └── page.tsx              ← Vue groupe
│       ├── rapports/
│       │   └── page.tsx              ← Rapports hebdomadaires
│       └── conseils/
│           └── page.tsx              ← Conseils du coach (hors nav)
├── app/
│   └── api/
│       ├── auth/
│       │   ├── send-otp/route.ts
│       │   └── verify-otp/route.ts
│       ├── conversation/
│       │   └── route.ts              ← Chat IA streaming (NB: pas /coach/chat)
│       ├── training-log/
│       │   ├── route.ts              ← Insertion séance dans training_logs (POST)
│       │   └── [id]/
│       │       └── route.ts          ← Suppression d'une séance (DELETE, RLS session)
│       ├── checkin/
│       │   └── route.ts              ← Soumission check-in
│       └── cron/
│           └── weekly-report/route.ts
├── components/
│   ├── ui/
│   │   └── ConfirmDialog.tsx         ← Modal de confirmation réutilisable (variables CSS)
│   ├── layout/
│   │   └── BottomNav.tsx             ← Nav 5 onglets (SVG inline, pas lucide-react)
│   ├── checkin/
│   │   └── CheckinStepper.tsx        ← Check-in + section séances non notées
│   ├── conversation/
│   │   └── ConversationClient.tsx
│   ├── training/
│   │   ├── SessionCard.tsx
│   │   └── LogForm.tsx               ← Formulaire + historique séances
│   └── [autres composants]
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts                 ← createServerClient + createAdminClient
│   ├── claude/
│   │   └── client.ts                 ← extractJSON (bracket-depth) + callClaudeWithRetry
│   ├── brevo/
│   │   ├── email-builder.ts
│   │   ├── otp-email.ts
│   │   └── invitation-email.ts
│   ├── otp/
│   │   └── index.ts
│   └── utils/
│       ├── dates.ts                  ← getProgramWeek(startDate) + getProgramWeekStart + getDaysLeft
│       └── pace.ts                   ← calcPace(distance, duration)
├── onboarding/
│   └── page.tsx
├── scripts/
│   ├── generate-icons.mjs
│   └── send-invitations.mjs
├── supabase/
│   └── migrations/
├── design/
│   ├── README.md
│   ├── Foulée_Redesign_dc.html
│   └── [autres assets design]
├── public/
│   ├── manifest.json
│   └── [icônes PWA]
├── proxy.ts                          ← NE PAS renommer en middleware.ts
├── vercel.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Variables d’environnement

### `.env.local` (développement)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://anxmkfhxjslyfayixgok.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[clé anon Supabase]
SUPABASE_SERVICE_ROLE_KEY=[clé service role Supabase]
ANTHROPIC_API_KEY=[clé Anthropic]
BREVO_API_KEY=[clé Brevo]
BREVO_SENDER_EMAIL=coach@foulee.run
BREVO_SENDER_VERIFIED=false
CRON_SECRET=monSecretCron2026
RACE_DATE=2026-09-13
PROGRAM_START_DATE=2026-06-08
NEXT_PUBLIC_URL=http://localhost:3000
```

### Vercel (production)

```bash
NEXT_PUBLIC_SUPABASE_URL=...   ✓
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  ✓
SUPABASE_SERVICE_ROLE_KEY=...  ✓
ANTHROPIC_API_KEY=...          ✓
BREVO_API_KEY=...              ✓
BREVO_SENDER_EMAIL=coach@foulee.run  ✓
BREVO_SENDER_VERIFIED=true     ✓  (true uniquement en prod)
CRON_SECRET=[valeur sécurisée — mise à jour le 14/06/26]  ✓
RACE_DATE=2026-09-13           ✓
PROGRAM_START_DATE=2026-06-08  ✓  (lundi précédant le 09/06 — semaines alignées lundi-dimanche)
NEXT_PUBLIC_URL=https://www.foulee.run  ✓
```

---

## Fonctionnement de l’IA

### Coaches IA (4 personas)

| Prénom | Ton | Stocké dans |
| --- | --- | --- |
| Marc | Direct, factuel | `profiles.coach_name` |
| Léa | Chaleureuse, encourageante | `profiles.coach_name` |
| Thomas | Technique, analytique | `profiles.coach_name` |
| Sophie | Ludique, motivante | `profiles.coach_name` |

**Règle absolue :** prénom et initiale toujours dynamiques depuis `profiles.coach_name`. Aucun hardcode.

### extractJSON (lib/claude/client.ts)

Fonction robuste avec 3 stratégies séquentielles :

1. Extraction depuis code fences (````json` ou `````) où qu’elles soient dans le texte
2. Localisation du premier `{` ou `[`, puis traversée caractère par caractère pour trouver le bracket fermant correspondant (bracket-depth counting — gère les strings, l’échappement)
3. Nettoyage : suppression commentaires `//` et `/* */`, trailing commas

En cas d’échec de `JSON.parse` : log des 500 premiers caractères du JSON extrait, re-throw de l’erreur.

**Note :** l’erreur “Truncated JSON” reste intermittente sur certains appels cron (observée sur Alix le 14/06, résolue au deuxième passage). À surveiller.

### Contexte du chat coach

Injecté dans chaque appel via `buildConversationPrompt` :

- Persona + profil utilisateur
- Semaine courante + programme prévu
- Dernier ressenti check-in + douleurs signalées
- **Historique 4 semaines** : résumé agrégé par semaine (km total, nb séances, allure moy) — pas de lignes brutes pour ne pas surcharger le contexte

---

## Base de données

### Table `profiles`

Schéma **réel** vérifié en base le 31/08/26 (l'ancienne doc listait des colonnes
inexistantes : `level`, `target_time`, `available_days`, `max_hr`, `resting_hr`).

- `id` (UUID), `user_id` (UUID, FK → auth.users)
- `first_name`, `coach_name`, `coach_style`
- `runner_level` (text — `beginner`/`intermediate`/`experienced`)
- `weekly_sessions` (int — fréquence hebdo visée à l'onboarding)
- `best_recent_time` (text libre, nullable — non structuré)
- `goal_time` (text libre, nullable — ex. « finir sous 2h », non structuré)
- `availability` (array de text)
- `injury_history` (text, nullable)
- `age` (int, nullable), `weight_kg` (numeric, nullable)
- `onboarding_completed` (boolean)
- `created_at` (timestamptz)

### Table `training_programs`

Contrainte unique : `(user_id, week_start)`
Une ligne par semaine de programme.

- `id`, `user_id`, `week_start` (date ISO)
- `week_number` (1-14)
- `sessions` (JSONB — tableau de séances)
- `total_volume_km`, `focus`

### Table `training_logs`

Une ligne par séance individuelle.

- `id`, `user_id`
- `date` (date ISO — jour réel de la séance)
- `distance_km`, `duration_minutes`, `pace_per_km`
- `feeling` (1-5), `pain_notes`, `notes`

**Source des données :** saisie manuelle via Journal OU via section “sorties non notées” du check-in. Les deux passent par `/api/training-log`.

### Table `weekly_checkins`

Contrainte unique : `(user_id, week_start)` → écrite en `upsert` par `/api/checkin`.
Schéma **réel** (créé à la main dans Supabase, non tracké dans les migrations) :

- `id`, `user_id`, `week_start` (date ISO — lundi ISO calculé via `getWeekStart()`)
- `sessions_count` (int), `total_distance_km` (numeric)
- `feeling_score` (1-5 — énergie/ressenti), `pain_level` (int), `pain_notes` (string)
- `free_word` (commentaire libre)
- `submitted_at`

> **Attention (15/07/26)** : pas de colonne `week_number` ni `energy_level` / `motivation_level` / `physical_tags` / `program_followed` / `free_comment` (ancienne doc erronée, réalignée sur le réel). La table est **actuellement vide** (check-in jamais utilisé) — le ressenti et les douleurs exploités par le coach proviennent de `training_logs` (Journal), pas de cette table.

### Table `weekly_reports`

- `id`, `user_id`, `week_number`
- `report_data` (JSONB)
- `email_sent_at` (NULL si pas encore envoyé — clé de l’idempotence)
- `generated_at`

### Table `coach_conversations`

- `id`, `user_id`, `role` (user/assistant), `content`, `created_at`

### Table `otp_codes`

- `id`, `email`, `code_hash` (SHA-256), `expires_at` (now() + 10min)
- `attempts` (max 5), `used` (boolean), `created_at`
- RLS activé sans policy (service role only)

### RLS

Toutes les tables : policy `auth.uid() = user_id`.
Exceptions : `otp_codes` (service role only), vue groupe (`createAdminClient`).

---

## Navigation principale

Barre basse — 5 onglets dans l’ordre :

| Onglet | Route | Icône |
| --- | --- | --- |
| Bilan | `/dashboard` | HomeSvg |
| Journal | `/dashboard/log` | PenLineSvg |
| Coach | `/dashboard/conversation` | MessageCircleSvg |
| Groupe | `/dashboard/groupe` | UsersSvg |
| Rapports | `/dashboard/rapports` | BarChartSvg |

**Implémentation :** SVG inline dans `components/layout/BottomNav.tsx` (pas lucide-react).
**Conseils** (`/dashboard/conseils`) : page existante, accessible par URL, hors navigation principale.

---

## Design system — Thème “Studio · Jour”

```css
--bg:              #F4F0EA;
--surface-1:       #FFFFFF;
--surface-2:       #EDE8E1;
--surface-3:       #E3DDD5;
--accent:          #C5402C;
--accent-tint:     rgba(197,64,44,0.10);
--secondary:       #2A6B50;
--secondary-tint:  rgba(42,107,80,0.10);
--text:            #160E08;
--text-sub:        #6E5E55;
--text-muted:      #C5BCAF;
--border:          #DDD7CE;
--nav-bg:          #FFFFFF;
--online:          #22C55E;
```

Police : Plus Jakarta Sans uniquement. **Weight max : 800.** Tout `fontWeight: 900` → corriger en 800.

### Zones cardiaques

| Zone | Couleur |
| --- | --- |
| Z1 Récup | `#3EFFA3` |
| Z2 Endurance | `#60A5FA` |
| Z3 Tempo | `#FBBF24` |
| Z4 Seuil | `#FB923C` |
| Z5 Max | `#F87171` |
| Z1-Z2 mixte | `#C5402C` |

---

## Conventions de développement

### Règles absolues

| Règle | Détail |
| --- | --- |
| **Lire avant écrire** | Toujours lire un fichier COMPLET avant de le modifier |
| **Upsert > Insert** | Tables avec contraintes uniques → toujours `upsert` |
| **Jamais `0 km`** | Si donnée absente → afficher `--` |
| **`maybeSingle()`** | Jamais `single()` sur une requête pouvant retourner null |
| **`getProgramWeek()`** | Requiert un argument `startDate`. Résultat à clamper : `Math.max(1, résultat)` |
| **`getProgramWeekStart()`** | Requiert `startDate` + `weekNumber`. Disponible dans `lib/utils/dates.ts` |
| **`createAdminClient`** | Service role key, server-side only, bypass RLS |
| **`proxy.ts`** | Ne pas renommer. Garde `/auth` en tête obligatoire |
| **Coach dynamique** | Prénom et initiale depuis `profiles.coach_name`. Aucun hardcode |
| **Font weight max** | Plus Jakarta Sans : weight max = 800 |
| **OTP custom** | Ne pas utiliser `supabase.auth.signInWithOtp`. Utiliser `/api/auth/send-otp` |
| **Couleurs** | Variables CSS exclusivement. Aucune couleur hardcodée |

### Patterns de code

```tsx
// Upsert training_programs (contrainte user_id + week_start)
await supabase.from('training_programs')
  .upsert({ user_id, week_start, week_number, sessions, total_volume_km, focus },
           { onConflict: 'user_id,week_start' })

// maybeSingle obligatoire
const { data } = await supabase.from('profiles')
  .select('*').eq('user_id', userId).maybeSingle()

// Semaine courante
const week = Math.max(1, getProgramWeek(process.env.PROGRAM_START_DATE!))
const weekStart = getProgramWeekStart(process.env.PROGRAM_START_DATE!, week)

// Client admin (server-side uniquement)
const supabase = createAdminClient()

// Affichage km
{data?.distance_km > 0 ? `${data.distance_km} km` : '--'}
```

---

## Sécurité et contraintes

### Authentification

- Flux OTP custom : code 6 chiffres, expire 10 min, max 5 tentatives, usage unique
- Hash SHA-256 en base (pas de code en clair)
- Session Supabase via `admin.generateLink` + `verifyOtp({ token_hash })`
- Middleware (`proxy.ts`) protège toutes les routes sauf assets statiques

### Assets publics (middleware exclus)

```
_next/static, _next/image, favicon.ico
apple-icon.png, manifest.json, icon-192.png, icon-512.png
/auth/* (critique pour PKCE callback)
```

### Cron sécurisé

- `Authorization: Bearer CRON_SECRET` requis
- `CRON_SECRET` différent entre local et production
- **CRON_SECRET mis à jour en production le 14/06/26** — mettre à jour `.env.local` si tests locaux du cron nécessaires

### Limites Vercel Hobby

- Cron : 1 exécution max/jour (hebdomadaire = OK)
- Function timeout : 30 secondes (borderline pour 4 users avec Claude — à surveiller)

---

## Intégrations externes

### Endpoint paris — `GET /api/betting/runner-stats`

- **Fichier :** `app/api/betting/runner-stats/route.ts`. **Consommateur :** la plateforme de paris fictifs `foulee-paris/` (projet séparé, voir section dédiée).
- **Auth :** header `Authorization: Bearer ${BETTING_API_SECRET}` — nouvelle variable d'env, ajoutée manuellement dans `.env.local` et sur Vercel (**nom uniquement ici, jamais la valeur**). 401 si absent/incorrect, et fail-closed si la variable n'est pas configurée.
- **Nature :** lecture seule (`createAdminClient`), aucune écriture, aucun cache (`export const dynamic = 'force-dynamic'`).
- **Contenu :** par profil onboardé — champs bruts (`first_name`, `runner_level`, `weekly_sessions`, `goal_time`, `best_recent_time`) + `weekly_stats` par semaine de programme sur la fenêtre `[week_start, week_start + 7j[` (distance totale, nb sorties, plus longue sortie, allure moyenne pondérée `sum(min)/sum(km)`, nb séances avec douleur, séances prévues, sortie longue prévue) + `current_program_week` + `days_until_race`.
- **Note donnée :** `planned_long_run_km` matche les DEUX variantes de `type` présentes en base (`sortie_longue` ET `sortie longue`).
- **Dépendance inverse :** `foulee-paris/` ne touche JAMAIS la base Supabase de Foulée (`anxmkfhxjslyfayixgok`) — uniquement cet endpoint HTTP.

## Plateforme Foulée Paris (`foulee-paris/`)

- **Objectif :** plateforme de paris **100 % fictifs** (aucune valeur réelle) pour le groupe fermé des 4 coureurs + un accès admin, sur les résultats du semi du 13/09/26. Fenêtre de paris fermée le 12/09/26 minuit (Europe/Paris).
- **Stack :** projet Next.js (App Router) + TypeScript **autonome** — son propre `package.json`, ses propres `node_modules`, jamais mélangé au code racine. Nouvelle base Supabase dédiée. Déploiement Cloudflare Pages (compte `fonfreyde.antoine@gmail.com`), cron pour recalcul des cotes (Monte Carlo, toutes les 6 h) et fermeture automatique des marchés.
- **Isolation build (critique) :** `foulee-paris/` sera exclu du `tsconfig.json` racine. Ses dépendances distinctes casseraient sinon le `next build` de l'app principale — contrairement à `foulee_pro/`, qui n'est **pas** exclu aujourd'hui mais passe le type-check racine par coïncidence (clone à `package.json`/deps identiques). Build racine à revérifier après création du dossier.
- **Lien avec Foulée :** lecture seule via l'endpoint `runner-stats` uniquement (voir Intégrations externes).
- **Statut (01/09/26) : EN LIGNE** sur **https://semi-cash.fonfreyde-antoine.workers.dev** (Cloudflare Workers via `@opennextjs/cloudflare`, cron `0 */6 * * *` ; Next bumpé à 16.3.4 côté `foulee-paris` seulement, root Foulée intact). Secrets posés via `wrangler secret put`. **⚠ le cron/recalcul renverra 404 tant que l'endpoint `runner-stats` n'est pas déployé sur Vercel** (commité `e14b875`, à redéployer côté Foulée). L'appli fonctionne (cotes déjà en base). Historique blocs 1‑4 ci-dessous.
- **Statut (31/08/26) :** `foulee-paris/` (« Semi Ca$h ») **blocs 1‑4 faits et vérifiés en live**. Blocs 1‑2 (rappel) : base Supabase dédiée `foulee_paris` (`vmfflhlizqtmrnyijrwa`, eu-west-3), schéma complet (9 tables, RLS deny-all), 4 runners, auth PIN (bcrypt + `jose`), panneau admin, admin Antoine (100 J). **Bloc 3 — moteur de cotes** : `lib/odds/` (fetch `runner-stats` → Riegel → facteurs de forme → Monte Carlo 20 000 tirages graine → cote `round(1/(p·1,07),2)` plancher 1,05), catalogue idempotent (15 marchés / 68 sélections : vainqueur, classement complet 24, 6 face-à-face, 4 temps, 3 déterministes ; « battra son objectif » auto dès objectif saisi), `odds` en ajout seul + snapshots, bouton admin + cron protégé (`ODDS_CRON_SECRET`) qui ferme les marchés au 12/09 minuit Europe/Paris. **Bloc 4 — mise & règlement** : fonctions Postgres `place_wager` (atomique, verrou `FOR UPDATE`, solde jamais négatif) et `settle_market` (idempotent, `settlements.market_id` unique) + vue `current_odds` ; routes `POST /api/wagers` (paris simples), `POST /api/admin/settle` ; pages `/paris` (marchés + `OddsTile` + ticket), `/mon-compte`, `/classement`. Vérifié à la main (proba→cote), end-to-end (écriture DB + idempotence) et en RPC (solde jamais négatif, règlement non rejouable en double). **⚠ Prérequis prod :** l'endpoint `runner-stats` est **non déployé** côté Foulée (prod 404) — vérif faite contre `next dev` local ; à commiter + déployer sur Vercel. **Reste :** bloc 5 (Cloudflare : cron + déploiement). Secrets `BETTING_API_SECRET`/`ODDS_CRON_SECRET` posés dans `foulee-paris/.env.local` (jamais commités). Détail complet et prompt de reprise dans `foulee-paris/foulee-paris.md`.

## Décisions techniques importantes

| Date | Décision | Raison |
| --- | --- | --- |
| S1-S2 | Next.js App Router + Supabase | Stack moderne, auth intégrée, RLS natif |
| S3 | `proxy.ts` au lieu de `middleware.ts` | Contrainte version Next.js |
| S4 | Programme généré une fois à l’onboarding | Réduction appels Claude, cohérence 14 semaines |
| S8 | Idempotence cron via `email_sent_at` | Empêche double envoi |
| S9 | Brevo pour emails auth (SMTP Supabase) | Cohérence sender |
| S10 | Design system Studio · Jour | Refonte complète |
| S11 | Fix magic link (PKCE/www/proxy) | 5 bugs cascade après S10 |
| S12 | Aliases CSS `--surface-1/2/3` | Rétrocompatibilité |
| S13 | Abandon magic link → OTP custom | Incompatibilité PKCE avec iOS PWA / Chrome défaut |
| S13 | OTP via Supabase → OTP custom | Token Supabase = 8 chiffres, expiration immédiate |
| S14 | `react-markdown` dans chat | Rendu bold/listes dans réponses coach |
| S14 | `app/apple-icon.png` | Convention Next.js App Router |
| S14 | Exclusion assets PWA du middleware | iOS ne pouvait pas fetcher l’icône |
| **11/06/26** | **extractJSON bracket-depth** | Intermittence onboarding : Claude retournait parfois du JSON avec code fences hors position 0 ou commentaires JS |
| **11/06/26** | **Nav 5 onglets** | Journal et Coach manquaient après redesign (4 onglets seulement) |
| **11/06/26** | **Séances dans le check-in** | Unifier les deux points d’entrée de données d’entraînement |
| **11/06/26** | **Historique 4 semaines coach** | La route conversation n’injectait aucune donnée training_logs — coach sans contexte réel |
| **11/06/26** | **Historique dans le journal** | Journal était uniquement un formulaire de saisie, sans liste des séances passées |
| **14/06/26** | **email_sent_at Antoine pollué** | Un run de test du 09/06 avait rempli email_sent_at — réinitialisé manuellement via Supabase SQL |
| **14/06/26** | **Compteur `processed` bugué** | La réponse JSON du cron affichait `processed:0` alors que Hugo et Rémi avaient été traités par le cron auto |
| **18/06/26** | **`PROGRAM_START_DATE` = 2026-06-08** | Programme démarré un mardi (09/06) mais semaines ISO calculées depuis le lundi (08/06) pour aligner email du dimanche et basculement dashboard le lundi |
| **18/06/26** | **Cron : `getWeekStart` → `getProgramWeekStart`** | `getWeekStart()` retournait le lundi ISO (décalé d’un jour), causant des `week_start` parasites dans `training_programs` — remplacé par `getProgramWeekStart(programStart, weekNumber)` |
| **18/06/26** | **Vue groupe : objectif dynamique** | `CHALLENGE_GOAL_KM = 200` hardcodé remplacé par somme de `total_volume_km` depuis `training_programs` pour la semaine courante |
| **18/06/26** | **Prompts : stats pré-calculées + anti-tirets** | `buildWeeklyReportPrompt` injecte désormais les stats calculées (volume réalisé/prévu/écart) pour éviter que Claude recalcule faux. Règle anti-tiret cadratins correctement injectée (ancienne string flottante morte) |
| **15/07/26** | **Email : suppression des tirets cadratins/demi-cadratins** | `Vannes–Auray` (entité `&#8211;`) et autres séparateurs corrigés en `-` dans `email-builder.ts` (hero, `<title>`, plage de dates), `dates.ts`, `client.ts`, `invitation-email.ts`. Filet de sécurité `sanitizeDashes()` appliqué au texte IA avant insertion + règle prompt renforcée (cadratin ET demi-cadratin) dans `buildWeeklyReportPrompt` et `buildConversationPrompt` |
| **15/07/26** | **Email : anti-répétition du prénom** | Le template ouvre déjà sur `Bonjour {prénom},` ; consigne ajoutée dans le prompt `coach_analysis` pour ne pas répéter la salutation ni le prénom dans les 2 premiers paragraphes (max 1 fois, jamais à <50 mots d'intervalle) |
| **15/07/26** | **Email : faux message « programme démarre » hors semaine 1** | Bug semaine 5 : hero « Ton programme démarre aujourd'hui » et stats « le programme commence maintenant » se déclenchaient dès `sessions === 0`. Nouvelle condition `isWelcomeWeek = !hasStats && weekNumber === 1` dans `buildEmailHtml`. Semaine >1 sans séance → sous-titre neutre (1re phrase de l'analyse) + « Aucune sortie enregistrée cette semaine. » |
| **15/07/26** | **Prompt rapport : semaine sans sortie → demander les séances non notées** | `weekly_checkins` vérifiée vide (jamais utilisée, ressenti/douleurs viennent en réalité de `training_logs`). Dans `buildWeeklyReportPrompt`, `noData` scindé en `isFirstWeekWelcome` (accueil semaine 1) et `noSessionsLogged` (semaine >1) : le coach demande alors, sans culpabiliser, si des sorties ont été faites sans être notées et invite à les ajouter (Journal ou check-in), sans jamais parler de « programme qui démarre » |
| **15/07/26** | **Absence prolongée : vision longue + bouton check-in** | Cron calcule `noSessionStreak` (semaines consécutives sans sortie, depuis tous les `training_logs` du programme). Si ≥ 2, le coach évoque explicitement l'absence prolongée avec recul. Email : quand 0 séance loggée, CTA principal « Faire mon check-in » (→ `/dashboard/checkin`, param `checkinLink`) + lien secondaire dashboard. Schéma `weekly_checkins` réaligné dans la doc. Params `noSessionStreak`/`checkinLink` optionnels (le build racine type-check aussi `foulee_pro/`) |
| **18/07/26** | **Classement nominatif dans l'email hebdomadaire** | Tableau de classement des 4 coureurs par km de la semaine (médailles 🥇🥈🥉 + « 4. »), identique dans les 4 emails, en fin d'email avant le footer. Choix : **calcul déterministe en code, aucun nouvel appel Claude**. Le cron agrège `training_logs` via **une seule requête Supabase par run** (avant la boucle, `createAdminClient`, même fenêtre `weekStart`→`nextWeekStart` que le rapport individuel), trie km↓/sorties↓/prénom. Type `ClassementEntry`. Seule l'évocation personnelle du coach passe par Claude, en enrichissant le prompt `coach_analysis` existant (contexte `toi`/`autres` + consigne « tu/toi » pour le destinataire, prénom à la 3e personne pour les autres). Un coureur à 0 km reste affiché (donnée agrégée réelle, pas `--`) |
| **28/07/26** | **Cron semaine 7 : 2 échecs distincts diagnostiqués** | Le cron du 26/07 (semaine 7) a échoué pour 2 coureurs. **Hugo** : `Truncated JSON in Claude response (unbalanced brackets)` (le bug extractJSON intermittent, jamais retenté de façon fiable). **Alix** : la fonction cron entière tuée par la plateforme (`Vercel Runtime Timeout Error: Task timed out after 300 seconds`) avant la fin du traitement **séquentiel** (le risque « Timing cron sur Hobby » qui se matérialise). Leurs séances existaient dans `training_logs` ; seuls rapport + email manquaient. |
| **28/07/26** | **Fix A : retry ciblé sur JSON tronqué** | `lib/claude/client.ts` : ajout de `isTruncatedJsonError()` + `callClaudeWithRetry` accorde un **budget de retries dédié** au JSON tronqué (jusqu'à 2 essais supplémentaires, délai court fixe 800 ms) AVANT de retomber sur le backoff générique. Constat au passage : la version précédente retentait déjà **toute** erreur 3× (donc le JSON tronqué aussi), mais sans traitement explicite ni marge dédiée. Comportement des autres types d'erreurs **inchangé**. Isolation par utilisateur conservée. |
| **28/07/26** | **Fix B : cron parallélisé (`Promise.allSettled`)** | `app/api/cron/weekly-report/route.ts` : la boucle séquentielle `for...of` devient une fonction `processUser` exécutée en parallèle via `Promise.allSettled` (pas `Promise.all` : un rejet n'interrompt pas les autres). Le temps mural ne dépend plus de la SOMME mais du plus long. `try/catch` interne conservé (isolation par utilisateur). Compteur `processed` recalculé proprement depuis les résultats agrégés (bug cosmétique corrigé au passage). `export const maxDuration = 300` ajouté (= plafond effectif déjà appliqué par la plateforme, à confirmer côté plan Vercel). |
| **28/07/26** | **Rattrapage one-shot semaine 7 (Hugo, Alix)** | `scripts/send-catchup-week7.mjs` (modèle `send-invitations.mjs`, lancé via `npx tsx`, imports dynamiques après `dotenv`). **Réutilise** la logique du cron (mêmes fonctions prompt/stats/HTML, même classement calculé pour la semaine 7). Cible **uniquement** Hugo et Alix (jamais Antoine/Rémi). Garde-fou anti double-envoi (skip si une ligne `weekly_reports` existe déjà en semaine 7, réexécutable). `--dry-run` par défaut, `--send` pour l'exécution réelle. Bandeau de rattrapage en tête d'email via nouveau param optionnel `catchUpNotice?` de `buildEmailHtml` (le cron ne le passe jamais → parcours normal inchangé ; texte passé par `sanitizeDashes()`). Vérification finale `email_sent_at` en console. |
| **29/07/26** | **Fix mémoire chat : tri de l'historique `coach_conversations`** | La requête de `route.ts` chargeait les 50 messages les plus anciens (`limit(50)`, tri ascendant, sans offset) au lieu des 50 plus récents. Au-dela d'une cinquantaine de messages cumules, le coach ne voyait plus jamais les echanges recents, d'ou l'impression de memoire courte signalee par Alix. Correctif : tri descendant + limit 50, puis inversion en JS pour repasser en ordre chronologique avant l'appel Claude. |
| **10/08/26** | **Journal : détail d'une séance en lecture seule** | Retour de Hugo : impossible de revoir le détail d'une séance. Chaque carte de l'historique (`components/training/LogForm.tsx`) devient un accordéon dépliable en place, réutilisant le pattern visuel de « Bilans hebdomadaires » (`RapportItem`). Détail lecture seule : date, distance, durée (min + sec), allure, ressenti (emoji + libellé + niveau), `pain_notes`, `notes` si renseignée. `notes` ajouté au `select` de `app/dashboard/log/page.tsx` (`duration_minutes` déjà présent). Aucune nouvelle route API, aucun nouvel appel Supabase, aucun bouton édition/suppression. |
| **20/08/26** | **Suppression d'une sortie depuis le Journal** | Alix ne pouvait pas supprimer un doublon enregistré par erreur ; aucune fonctionnalité de suppression n'existait sur `training_logs`. Nouvelle route `DELETE app/api/training-log/[id]/route.ts` (client scopé à la session `createClient`, protection par la policy RLS `own_training_logs` = `auth.uid() = user_id`, cmd ALL couvre DELETE ; 404 si 0 ligne supprimée). Nouveau composant réutilisable `components/ui/ConfirmDialog.tsx` (variables CSS, Echap/clic extérieur = annuler). Bouton de suppression ajouté uniquement dans le détail déplié d'une carte du Journal (`components/training/LogForm.tsx`, `LogHistoryCard`) — pas dans `SessionCard.tsx` qui affiche les séances *prévues* du programme, non l'historique. Isolation RLS entre utilisateurs vérifiée en base (delete d'un autre user = 0 ligne, delete du propriétaire = 1). `weekly_reports.stats` non touché (répercussion sur les rapports au prochain cron, comportement attendu). |
| **10/08/26** | **Rapports : suppression des onglets, chiffres live, barres cliquables** | 3 changements sur la page Rapports (retour Antoine). **(1)** Suppression des boutons Sem./Mois/Saison (non fonctionnels, aucun état de période conservé). **(2)** Tous les chiffres affichés recalculés en direct depuis `training_logs` au lieu de `weekly_reports.stats` figé : hero = somme de tous les logs du programme ; par carte/barre = fenêtre `[week_start, week_start + 7j[` (identique au cron), allure via `calcPace(totalKm, totalMin)` (même formule que le cron, non réinventée). Corrige le cas d'une séance saisie après le cron de sa semaine (ex. Hugo S8 : 19,5 km / 2 sorties au lieu de 8,0 / 1 figé ; total Hugo 88,3 / 9 au lieu de 64,2 / 7). Cartes/barres uniquement pour les semaines ayant un rapport ; texte qualitatif (`coach_analysis`) toujours lu depuis `weekly_reports`, aucun appel Claude. **(3)** Barres du graphique cliquables : tap → ouvre + scrolle vers la carte de la semaine. État d'ouverture de l'accordéon remonté de `RapportItem` (désormais contrôlé) vers un nouveau wrapper client `RapportsClient`, source unique partagée par les cartes et le graphique. `page.tsx` devient un server component qui calcule les stats live et passe des props sérialisables. |
| **31/08/26** | **Endpoint lecture seule `GET /api/betting/runner-stats` + démarrage `foulee-paris/`** | Nouvelle plateforme de paris fictifs (groupe fermé) consommant les stats d'entraînement via HTTP. Endpoint **additif** protégé par `BETTING_API_SECRET` (Bearer, même pattern que le cron), `createAdminClient` lecture seule, agrégation par semaine de programme (fenêtre `[week_start, week_start+7j[`, mêmes bornes que le cron). Vérifié en local contre les totaux réels — tolérance zéro (Alix 14/118,54 · Antoine 19/201,4 · Hugo 18/199 · Rémi 24/153,2), 401 sans/mauvais secret. `planned_long_run_km` matche les DEUX variantes `sortie_longue`/`sortie longue` présentes en base (sinon 13 semaines à `null`). `foulee-paris/` : projet Next.js autonome, isolé du build racine, dépend de Foulée uniquement via cet endpoint. |
| **06/09/26** | **Carte/modale « Bilan course » sur le Dashboard** | Dès la connexion le jour de la course (ou après), inviter à enregistrer la séance de course sans créer de système parallèle à `training_logs`. Nouveau composant client `components/dashboard/RaceDayBilanCard.tsx` réutilisant l'endpoint **existant** `POST /api/training-log` (même body que `LogForm` : durée min+sec, ressenti, allure via `calcPace`). Détection dans `app/dashboard/page.tsx` (server) : 4e requête légère au `Promise.all` (existe-t-il un `training_log` à `date = RACE_DATE` ?) ; affichage si `todayParis >= RACE_DATE && !log`, avec `todayParis` en Europe/Paris et `RACE_DATE` relue depuis `process.env` (car `dates.ts` la hardcode pour `getDaysLeft`). Deux présentations, même formulaire : **jour J** (`todayParis === RACE_DATE`) = modale bloquante (backdrop, scroll body verrouillé, fermable via croix / « Plus tard » pour ne pas culpabiliser une mauvaise course) ; **jours suivants** = carte inline non bloquante en haut du Dashboard, jusqu'à enregistrement. Date préremplie à `RACE_DATE` (non modifiable), distance préremplie 21,1 (modifiable). Sur succès : le bilan disparaît (état local) + `router.refresh()` ; la séance apparaît dans le Journal. Testé E2E le 06/09 (insert conforme, disparition, présence Journal, nettoyage). |
| **06/09/26** | **Email de clôture semaine 14 (bilan global + résultat jour J)** | Le dimanche de la course (semaine 14/14), le cron hebdomadaire envoie un email de **clôture** au lieu de l'email hebdomadaire standard. Intégré dans la route cron existante (`app/api/cron/weekly-report/route.ts`) : **garde-fou** anti-envoi post-programme via `getRawProgramWeek()` (nouveau helper non clampé dans `dates.ts` ; `getProgramWeek` reste borné à 14) : si `rawWeek > TOTAL_PROGRAM_WEEKS (14)`, no-op complet AVANT toute écriture DB (le cron `0 19 * * 0` tourne chaque dimanche : 13/09 = clôture, 20/09 = no-op). Branche `isFinalWeek` (`rawWeek === 14`) : bilan global des 14 semaines (stats pré-calculées : km total, plus longue sortie, semaines actives, allure moyenne globale) + résultat du jour J mis en avant, **aucun** programme de semaine suivante (pas d'upsert `training_programs`). Fichiers **dédiés** (même convention que l'email J-1, non-régression des semaines 1-13, `email-builder.ts`/`buildWeeklyReportPrompt` non touchés) : `lib/claude/closing-prompt.ts` (`buildClosingReportPrompt`) et `lib/brevo/closing-email.ts` (`buildClosingEmailHtml`) ; hero « résultat du jour » ou variante « course pas encore loggée » (CTA dashboard). **Podium** de clôture classé par **temps de course** (pas le volume hebdo), calculé une fois par run ; coureurs sans résultat en fin de liste, mention neutre « résultat à venir ». `sendClosingEmail` (sujet dédié). Testé : harnais dry-run (clôture, sans écriture ni envoi, résultats synthétiques mixtes) + vraie route (garde-fou post-programme). |

---

## Ce qu’un agent IA doit absolument savoir

### Ne pas casser

1. **`proxy.ts`** — Ne jamais renommer. La garde `/auth` en tête est critique.
2. **`createAdminClient`** — Server-side uniquement.
3. **Flux OTP** — Ne jamais remplacer par `supabase.auth.signInWithOtp`.
4. **`PROGRAM_START_DATE`** — Variable globale fixe pour tous les utilisateurs.
5. **Exclusions middleware** — La liste des paths exclus doit inclure tous les assets PWA.
6. **Coach dynamique** — Aucun hardcode de “Marc” ou initiale. Toujours `profiles.coach_name`.
7. **Route conversation** — Elle est à `app/api/conversation/route.ts`, pas `app/api/coach/chat/`.

### Pièges connus

- `single()` sur une requête pouvant retourner null → exception. Toujours `maybeSingle()`.
- `getProgramWeek()` sans `startDate` → erreur. Résultat non clampé → semaine négative.
- `fontWeight: 900` → Plus Jakarta Sans ne supporte pas 900. Corriger en 800.
- Couleurs hardcodées (ancienne palette) → utiliser les variables CSS.
- `insert` sur `training_programs` → doublon. Toujours `upsert` avec `onConflict: 'user_id,week_start'`.
- BottomNav utilise des SVG inline, pas lucide-react. Nouvelles icônes = nouveaux SVG inline.
- `getProgramWeekStart()` nécessite deux arguments : `startDate` ET `weekNumber`.
- **Ne jamais lancer de run de test en production sans remettre `email_sent_at` à NULL ensuite** — risque de bloquer les vrais envois hebdomadaires.
- **Le compteur `processed` dans la réponse du cron est inexact** — se fier à `email_sent_at` dans Supabase plutôt qu’au JSON de réponse pour vérifier qui a été traité.

### Hypothèses importantes

- 4 utilisateurs max actuellement, architecture conçue pour en supporter plus
- `PROGRAM_START_DATE` = `2026-06-08` (lundi), identique pour tous — les semaines programme courent du lundi au dimanche
- Les semaines sont calculées depuis une date globale, pas depuis l’inscription individuelle
- Le coach persona est immuable après l’onboarding
- Tous les emails partent depuis `coach@foulee.run`
- Les séances check-in soumises après 19h UTC le dimanche n’apparaissent pas dans l’email de ce soir mais dans la semaine suivante

---

## Bugs connus / dette technique

### Icône PWA noire sur l’appareil d’Antoine

- **Statut :** Isolé à son device (fonctionne sur autres iPhones)
- **Cause :** Cache SpringBoard iOS avec entrée négative persistante
- **Workaround possible :** Changer temporairement `"name"` dans `manifest.json`

### Erreur extractJSON intermittente sur le cron

- **Statut :** ⚠️ S'est de nouveau matérialisée sur **Hugo en semaine 7** (26/07). **Retry ciblé implémenté le 28/07** (`isTruncatedJsonError` + budget dédié dans `callClaudeWithRetry`) — en attente de validation/déploiement d'Antoine.
- **Cause :** Réponse Claude tronquée sur certains appels (JSON coupé, brackets déséquilibrés). Aggravé par `max_tokens: 2000`, potentiellement juste pour certains rapports.
- **Mitigation actuelle :** L'idempotence permet de relancer le cron sans double envoi ; retry dédié désormais dans le code.
- **Fix restant possible si récidive :** Augmenter `max_tokens` dans l'appel Claude du cron (le retry seul ne suffit pas si la troncature est déterministe plutôt qu'intermittente).

### Compteur `processed` dans la réponse cron

- **Statut :** ✅ Corrigé le 28/07 lors du refactor `Promise.allSettled` (compteurs recalculés depuis les résultats agrégés). En attente de déploiement.
- **Cause historique :** Le compteur n'était pas incrémenté correctement pour tous les utilisateurs traités.
- **Impact :** Aucun sur le fonctionnement réel — `email_sent_at` reste la source de vérité.

### Check-in accessible uniquement par URL

- **Statut :** Fonctionnel mais discret
- **Impact :** Les coureurs ne pensent pas à faire leur check-in en semaine
- **Fix possible :** Ajouter un lien ou une carte CTA sur le dashboard

### Timing cron sur Hobby

- **Statut :** ⚠️ Risque **matérialisé** en semaine 7 (26/07) : timeout à 300 s ayant tué le run avant la fin du traitement d'Alix (dernière de la boucle séquentielle). **Parallélisé le 28/07** via `Promise.allSettled` — en attente de déploiement.
- **Cause :** Traitement séquentiel avec Claude → temps mural = somme des utilisateurs. Le plafond effectif observé côté plateforme est 300 s (et non 30 s comme indiqué plus haut : à vérifier dans le dashboard Vercel).
- **Mitigation :** Parallélisation en place. `maxDuration = 300` déclaré explicitement dans la route. À surveiller si le nombre d'utilisateurs augmente fortement (limite de concurrence des appels Claude).

### Fichiers résiduels dans `public/`

- `apple-touch-icon-v2.png`, `apple-touch-icon.png`, `apple-touch-icon-precomposed.png` : non référencés, peuvent être supprimés

---

## Roadmap / prochaines étapes

### Court terme

- [x]  Les 4 coureurs ont complété leur onboarding
- [x]  Premier email hebdomadaire envoyé aux 4 coureurs (14/06)
- [x]  Fixes cron week_start, vue groupe objectif dynamique, prompts rapport (18/06)
- [ ]  Corriger le compteur `processed` dans la réponse du cron
- [ ]  Ajouter un retry automatique par utilisateur dans le cron (erreur extractJSON intermittente)
- [ ]  Valider la réception des emails par Hugo, Rémi et Alix

### Moyen terme

- [ ]  Ajouter accès au check-in depuis le dashboard (CTA hebdomadaire)
- [ ]  Tests end-to-end complets (tous les onglets, toutes les fonctionnalités)
- [ ]  Validation rendu email dans Gmail / iPhone Mail / Outlook

### Long terme

- [ ]  Intégration Garmin/Strava pour import automatique des séances
- [ ]  Notifications push (PWA)
- [ ]  Mode hors ligne (PWA cache)

---

## Commandes utiles

```bash
# Développement local
npm run dev

# Build production
npm run build

# Test cron en local
curl -X GET "http://localhost:3000/api/cron/weekly-report" \
  -H "Authorization: Bearer monSecretCron2026"

# Test cron en production (PowerShell)
$r = Invoke-WebRequest -Uri "https://www.foulee.run/api/cron/weekly-report" -Method GET -Headers @{ "Authorization" = "Bearer TON_SECRET_ICI" } -UseBasicParsing
$r.Content

# Réinitialiser email_sent_at d'un utilisateur (Supabase SQL editor)
UPDATE weekly_reports
SET email_sent_at = NULL
WHERE user_id = (SELECT user_id FROM profiles WHERE first_name = 'Antoine')
AND week_number = [NUMERO_SEMAINE];

# Vérifier l'état des envois de la semaine
SELECT p.first_name, wr.week_number, wr.email_sent_at, wr.generated_at
FROM weekly_reports wr
JOIN profiles p ON p.user_id = wr.user_id
ORDER BY wr.generated_at DESC;

# Générer les icônes PWA
node scripts/generate-icons.mjs

# Appliquer les migrations Supabase
npx supabase db push
```