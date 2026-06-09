# Handoff Design — Foulée Redesign 2025

## Vue d'ensemble

Ce package contient le redesign haute-fidélité de l'application **Foulée**, un coach running IA. Le fichier `Foulée Redesign.dc.html` est un **prototype de référence design** — il montre l'intention visuelle et comportementale exacte. La tâche du développeur est de **recréer ces écrans dans la base de code existante** (React Native, Swift, Kotlin, etc.) en appliquant les patterns et bibliothèques déjà en place.

## Fidélité

**Haute-fidélité (hifi).** Les couleurs, typographie, espacements, rayons de bordure, ombres et interactions sont finalisés. Le développeur doit reproduire l'UI pixel-perfect en utilisant le système de design de la codebase.

---

## Tokens de design — Thème "Studio · Jour"

> Thème retenu par le client. Le thème "Obsidian · Nuit" (dark mode) est disponible dans le prototype pour référence future.

### Couleurs

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#F4F0EA` | Fond de page principal |
| `surface-1` | `#FFFFFF` | Cards, surfaces élevées |
| `surface-2` | `#EDE8E1` | Backgrounds secondaires, inputs |
| `surface-3` | `#E3DDD5` | Progress bars background, hover states |
| `accent` | `#C5402C` | Couleur principale (terracotta) — CTA, liens actifs, avatar coach |
| `accent-tint` | `rgba(197,64,44,0.10)` | Backgrounds légers accent |
| `secondary` | `#2A6B50` | Couleur secondaire (vert forêt) — badges Z2, éléments positifs |
| `secondary-tint` | `rgba(42,107,80,0.10)` | Backgrounds légers secondaire |
| `text` | `#160E08` | Texte principal |
| `text-sub` | `#6E5E55` | Texte secondaire, labels |
| `text-muted` | `#C5BCAF` | Texte désactivé, bordures nav bar |
| `border` | `#DDD7CE` | Bordures de cards et inputs |
| `nav-bg` | `#FFFFFF` | Fond de la bottom navigation |
| `online` | `#22C55E` | Pastille "En ligne" coach |

### Zones cardiaques (graphiques)
| Zone | Couleur |
|---|---|
| Z1 Récup | `#3EFFA3` |
| Z2 Endurance | `#60A5FA` |
| Z3 Tempo | `#FBBF24` |
| Z4 Seuil | `#FB923C` |
| Z5 Max | `#F87171` |

### Typographie

**Police :** `Plus Jakarta Sans` (Google Fonts)  
**Weights chargés :** 400 · 500 · 600 · 700 · 800 · 900

| Usage | Size | Weight | Letter-spacing |
|---|---|---|---|
| Titre d'écran (h1) | 24px | 900 | -0.8px |
| Titre grand (hero) | 48px | 900 | -2px |
| Corps principal | 13–14px | 400–500 | 0 |
| Label coach | 10px | 700 | 0.5px (uppercase) |
| Micro labels | 10–11px | 500–600 | 0–1px |
| Stats chiffres | 22px | 900 | -0.5px |
| Timestamps | 10px | 400 | 0 |

### Espacements & Rayons

| Token | Valeur |
|---|---|
| Padding horizontal écran | 14–18px |
| Gap entre cards | 7–10px |
| Border-radius card standard | 14–16px |
| Border-radius card large | 18px |
| Border-radius pill/badge | 99px |
| Border-radius avatar | 50% |
| Border-radius input | 99px |
| Border width | 1px |

### Ombres

| Usage | Valeur |
|---|---|
| Téléphone (présentation) | `0 40px 80px rgba(0,0,0,0.6)` |
| Avatar coach | `0 4px 12px rgba(197,64,44,0.10)` |
| Bulle coach | `0 2px 12px rgba(197,64,44,0.10)` |
| Bouton CTA principal | `0 6px 20px rgba(197,64,44,0.10)` |
| Message utilisateur (chat) | `0 3px 10px rgba(197,64,44,0.10)` |

---

## Icônes

Style **Feather Icons** (stroke, pas fill) — `stroke-width: 2`, `stroke-linecap: round`, `stroke-linejoin: round`.

| Nom | Usage | SVG path(s) |
|---|---|---|
| `home` | Tab Bilan | `M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z` · `M9 22V12h6v10` |
| `bulb` | Tab Conseils | `M9 18h6` · `M10 22h4` · `M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z` |
| `users` | Tab Groupe | paths standards Feather |
| `bar-chart` | Tab Rapports | `M18 20V10` · `M12 20V4` · `M6 20v-6` |
| `zap` | Séances entraînement | `M13 2L3 14h9l-1 8 10-12h-9l1-8z` |
| `message` | Coach bubble reply | `M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z` |
| `send` | Bouton envoi chat | `M22 2L11 13` · `M22 2l-7 20-4-9-9-4 20-7z` |
| `mic` | Bouton voix chat | paths standards Feather |
| `phone` | Bouton appel coach | path standards Feather |

---

## Navigation

**Bottom navigation — 4 onglets**

| Index | Label | Icône | Écran |
|---|---|---|---|
| 0 | Bilan | home | Dashboard principal |
| 1 | Conseils | bulb | Tips du coach |
| 2 | Groupe | users | Leaderboard collectif |
| 3 | Rapports | bar-chart | Métriques & graphiques |

**Onglets hors bottom nav (accessibles autrement) :**
- **Check-in** — ouvert chaque lundi, depuis une notification ou depuis Bilan
- **Coach (chat)** — accessible via la bulle Marc tappable sur tous les écrans

**Comportement bottom nav :**
- Onglet actif : icône en `accent` + label bold 700 + dot `4×4px` en-dessous
- Onglet inactif : icône + label en `text-muted`
- Hauteur nav : 80px, padding-top 10px
- Fond : `nav-bg` (#FFFFFF), bordure top `1px solid border`
- Indicateur home (barre iOS) : 20px hauteur, barre `90×4px` en `text-muted`, centré

---

## Écrans

### 1. Bilan (Dashboard)

**Objectif :** Vue synthétique de la progression hebdomadaire.

**Layout (de haut en bas) :**

1. **Header** — `padding: 2px 18px 12px` · flex row space-between
   - Gauche : date (`text-sub`, 11px, 500) + titre "Bonjour, [Prénom] 👋" (24px, 900, `text`, letter-spacing -0.8)
   - Droite : avatar utilisateur — cercle 40×40px, fond `accent`, lettre initiale blanche 15px 900

2. **Bulle coach Marc** — tappable → ouvre le chat (voir composant Coach Bubble)

3. **Statistiques — 3 colonnes égales** · gap 7px · padding 0 14px
   - Card : `surface-1`, radius 14, border, padding `12px 8px`, texte centré
   - Valeur : 22px 900, couleur selon stat · unité : 12px 700 même couleur
   - Label : `text-sub`, 10px, 500
   - Stats affichées : jours avant la course (`accent`) · % accompli (`text-sub`) · séances/semaine (`secondary`)

4. **Objectif hebdomadaire** · card `surface-1` · padding `13px 15px` · radius 16
   - Titre + valeur "X / 30 km" sur une ligne (space-between)
   - Progress bar : fond `surface-3`, h:7px, radius 99, fill `linear-gradient(90deg, accent, accent à 53%)`
   - Sous-texte : `text-sub`, 12px

5. **Plan de la semaine** — liste de séances
   - Titre section : 12px 700, margin-bottom 9px
   - Card séance : `surface-1`, radius 14, padding `11px 13px`, flex row, gap 10
     - Icône carré : 40×40px, radius 11, fond couleur zone à 13%, icône `zap` 18px couleur zone
     - Texte : jour (10px 600 `text-sub`) + description (13px 700 `text`)
     - Badge zone : fond couleur à 13%, texte couleur, 10px 700, radius 99, padding `3px 8px`

---

### 2. Conseils

**Objectif :** Conseils personnalisés du coach pour la semaine.

**Layout :**

1. **Header** — titre "Conseils" 24px 900
2. **Bulle coach Marc** — tappable
3. **Filtres horizontaux scrollables** — chips : `surface-2`/`accent` (actif), radius 99, 11px 600, padding `5px 12px`
   - Catégories : Tous · Récup · Nutrition · Mental · Technique
4. **Liste de cards conseils** — padding `0 14px`
   - Card : `surface-1`, radius 16, padding `14px 15px`, gap 9px entre header et texte
   - Header card : emoji catégorie (16px) + badge catégorie coloré + avatar Marc (20×20px, `accent`, "M")
   - Titre : 13px 800, `text`, line-height 1.35
   - Description : 11px 400, `text-sub`, line-height 1.5

---

### 3. Groupe

**Objectif :** Défi collectif + classement de la semaine.

**Layout :**

1. **Header** — "Groupe" + badge nb membres (`accent-tint` bg, `accent` text)
2. **Card défi collectif** — `linear-gradient(140deg, accent, accent à 80%)`, radius 18, padding `16px 18px`
   - Titre catégorie uppercase 10px 600 blanc à 70% + nom du défi 17px 900 blanc
   - Progress bar blanche sur fond blanc à 25%
   - Détail : X / Y km · jours restants
3. **Classement** — titre section + liste membres
   - Row membre : radius 13, padding `10px 13px`, flex row, gap 9
   - Rang : emoji médaille ou chiffre, width 22px centré
   - Avatar : 32×32px cercle, `surface-2` ou `accent` si "moi"
   - Nom : 12px, 700 si "moi", 500 sinon
   - Distance : 13px 800, `accent` si "moi" sinon `text`
   - Row "moi" : fond `accent-tint`, bordure `accent`

---

### 4. Rapports

**Objectif :** Métriques de progression (distance, barres hebdo, zones cardiaques).

**Layout :**

1. **Header** — "Rapports" + toggle Sem./Mois/Saison (pills, actif = `accent`)
2. **Hero métrique** — card `surface-1`, radius 18, padding 18px
   - Label uppercase 10px · valeur chiffre 48px 900 letter-spacing -2 · unité 18px 600
   - Badge tendance (`secondary-tint` bg, `secondary` text) + nb séances
3. **Graphique barres hebdomadaires** — card `surface-1`, radius 16, h:90px pour les barres
   - Bar active : `linear-gradient(180deg, accent, accent à 33%)`, bordure accent à 33%
   - Bar inactive : `surface-2`, bordure `border`
   - Labels valeur (9px) au-dessus + semaine (9px) en-dessous
4. **Zones cardiaques** — card `surface-1`, radius 16
   - Ligne : label zone (10px, width 66px) + barre progress + pourcentage
   - Couleurs par zone : voir tableau tokens

---

### 5. Check-in Hebdomadaire

**Objectif :** Collecte du ressenti utilisateur chaque lundi.

**Layout :**

1. **Header** — label "CHAQUE LUNDI" uppercase 10px 600 + titre "Check-in hebdo"
2. **Bulle coach Marc** — message contextuel tappable
3. **Section Énergie** — card `surface-1`, 5 choix en flex row
   - Pill actif : fond `accent`, texte blanc, 10px 700
   - Pill inactif : fond `surface-2`, texte `text-sub`, 10px 500
   - Labels : Épuisé · Fatigué · OK · Bien · Top !
4. **Section Motivation** — idem avec emojis 17px (😞 😐 🙂 😄 🚀)
   - Actif : fond `accent-tint`, bordure `accent`
5. **Section Ressenti physique** — chips flex-wrap
   - Actif : fond `accent-tint`, texte `accent`, bordure `accent`
   - Inactif : fond `surface-2`, texte `text-sub`
6. **Zone note libre** — card `surface-1`, radius 12, min-height 52px, texte `text-muted` placeholder
7. **CTA Envoyer** — fond `accent`, radius 13, padding 14px, texte blanc 14px 800, shadow `0 6px 20px accent-tint`

---

### 6. Coach (Chat)

**Objectif :** Interface de messagerie avec le coach IA Marc.

**Layout (colonne flex, overflow hidden) :**

#### Header
- Fond `surface-1`, padding `8px 16px 10px`, bordure bottom
- Avatar Marc : 40×40px cercle `accent`, "M" blanc 16px 900 + pastille verte 10×10px (bordure `surface-1`)
- Nom "Marc" 14px 800 + statut "En ligne · Coach IA Foulée" 11px `#22C55E`
- Bouton appel : cercle 34px `surface-2`, icône téléphone

#### Zone messages (flex:1, overflow-y auto)
- Gap entre bulles : 10px
- Padding : `14px 14px 10px`

**Bulles Marc (gauche) :**
- Avatar 28×28px cercle `accent`, "M" blanc 11px 900
- Fond `surface-1`, bordure `border`, radius `18px 18px 18px 4px`
- Texte 12px 400 `text`, line-height 1.5, padding `10px 13px`
- Timestamp : 10px `text-muted`

**Bulles utilisateur (droite) :**
- Fond `accent`, sans bordure, radius `18px 18px 4px 18px`
- Texte 12px 400 blanc, padding `10px 13px`
- Shadow `0 3px 10px accent-tint`
- Timestamp : 10px `text-muted`

**Indicateur de frappe (typing) :**
- Même mise en forme que bulle Marc
- 3 dots 6×6px ronds, fond `text-muted`
- Animation `bounce` : translateY(0→-5px→0), opacity 0.4→1→0.4
- Duration 1.2s, ease-in-out, infinite
- Delays : 0s · 0.15s · 0.30s

#### Suggestions rapides
- Padding `8px 14px 6px`, flex row, gap 6px, overflow-x auto
- Pills : fond `surface-1`, texte `accent`, bordure `accent` à 27%, radius 99, 11px 600, no-wrap
- Exemples : "Adapter mon plan" · "Douleur au genou" · "Nutrition avant course" · "Mon allure cible"

#### Zone de saisie
- Padding `8px 14px 12px`, fond `surface-1`, bordure top
- Conteneur input : fond `surface-2`, radius 99, padding `8px 8px 8px 16px`, bordure
- Placeholder "Écris à Marc…" 13px `text-muted`
- Bouton micro : cercle 34px `surface-3`, icône mic `text-sub`
- Bouton envoyer : cercle 34px `accent`, icône send blanc, shadow `0 3px 10px accent-tint`

---

## Composant Coach Bubble (réutilisable)

Présent sur : Bilan · Conseils · Check-in.  
**Tappable → ouvre le Chat Coach.**

- Fond `surface-1`, radius 16, padding `12px 13px`
- Bordure `1px solid accent` à 33%
- Shadow `0 2px 12px accent-tint`
- Cursor pointer, transition `transform 0.12s, box-shadow 0.12s`
- Contenu : avatar Marc (36px + pastille verte) + header (label coach + badge "Répondre") + texte tronqué 2 lignes

**Badge "Répondre" :**
- Fond `accent-tint`, radius 99, padding `2px 8px`
- Icône message 10px stroke `accent` + texte "Répondre" 10px 700 `accent`

---

## Interactions & Comportements

| Élément | Déclencheur | Action |
|---|---|---|
| Bulle Coach Marc | Tap | Navigue vers écran Chat |
| Tab bottom nav | Tap | Navigue vers l'écran correspondant |
| CTA "Envoyer à Marc" | Tap | Submit check-in + navigue vers Chat |
| Suggestions rapides (chat) | Tap | Pré-remplit le champ texte |
| Filtres Conseils | Tap | Filtre la liste de tips |
| Bouton envoyer (chat) | Tap | Envoie le message |

### Animations
- **Typing indicator** : `@keyframes bounce` — 3 dots décalés de 150ms
- **Transitions buttons/pills** : `all 0.15s` ease

---

## Assets & Ressources

- **Police** : `Plus Jakarta Sans` — [fonts.google.com/specimen/Plus+Jakarta+Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
- **Icônes** : Style Feather Icons — stroke 2px, linecap round, linejoin round — [feathericons.com](https://feathericons.com)
- **Pas d'images bitmap** dans le prototype. Les avatars utilisateur sont des initiales sur fond coloré.

---

## Fichiers du package

| Fichier | Description |
|---|---|
| `Foulée Redesign.dc.html` | Prototype haute-fidélité interactif — 6 écrans navigables |
| `README.md` | Ce document de handoff |

**Pour visualiser le prototype :** ouvrir `Foulée Redesign.dc.html` dans un navigateur moderne avec `support.js` dans le même dossier. Naviguer entre les écrans via les boutons en haut de page.

---

## Notes pour Claude Code

- Les données affichées sont des **données fictives** illustratives. Remplacer par les vraies données de l'API.
- Le coach "Marc" est une IA — les réponses dans le chat doivent être générées dynamiquement.
- Le Check-in est prévu **chaque lundi** — implémenter la logique de calendrier côté back.
- La pastille "En ligne" du coach peut être remplacée par un état réel (heure de réponse estimée).
- Le thème dark "Obsidian · Nuit" existe dans le prototype (T[0]) et peut servir de base pour un dark mode.
