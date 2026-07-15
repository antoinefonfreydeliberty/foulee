# Foulée

*Mis à jour le 15 juillet 2026*

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

### Journal d’entraînement

- Formulaire de saisie : date, distance, durée (min + sec), allure calculée auto, ressenti (1-5), douleurs, notes libres
- Calcul allure : `calcPace(distance, duration)` → min/km
- Historique des séances passées affiché sous le formulaire, triées date desc
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
- Stockés dans `weekly_reports`
- Visualisation graphique dans l’app (Sem. / Mois / Saison)

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
│       │   └── route.ts              ← Insertion séance dans training_logs
│       ├── checkin/
│       │   └── route.ts              ← Soumission check-in
│       └── cron/
│           └── weekly-report/route.ts
├── components/
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

- `user_id` (UUID, FK → auth.users)
- `first_name`, `last_name`, `coach_name`, `coach_style`
- `level` (débutant/intermédiaire/avancé)
- `goal`, `target_time`
- `available_days` (array)
- `max_hr`, `resting_hr`
- `onboarding_completed` (boolean)

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

- **Statut :** Observée sur Alix le 14/06 au premier passage, résolue au deuxième
- **Cause :** Réponse Claude tronquée ou malformée sur certains appels
- **Mitigation actuelle :** L’idempotence permet de relancer le cron sans double envoi
- **Fix possible :** Augmenter `max_tokens` dans l’appel Claude du cron, ou ajouter un retry automatique par utilisateur

### Compteur `processed` dans la réponse cron

- **Statut :** Bug confirmé — cosmétique uniquement
- **Cause :** Le compteur n’est pas incrémenté correctement pour tous les utilisateurs traités
- **Impact :** Aucun sur le fonctionnement réel — `email_sent_at` reste la source de vérité
- **Fix possible :** Corriger le compteur dans `app/api/cron/weekly-report/route.ts`

### Check-in accessible uniquement par URL

- **Statut :** Fonctionnel mais discret
- **Impact :** Les coureurs ne pensent pas à faire leur check-in en semaine
- **Fix possible :** Ajouter un lien ou une carte CTA sur le dashboard

### Timing cron sur Hobby

- **Statut :** Risque théorique non déclenché (cron 14/06 a fonctionné en ~34 min pour 2 users)
- **Cause :** Timeout 30s, traitement séquentiel avec Claude
- **Mitigation :** `Promise.all` si problème constaté

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