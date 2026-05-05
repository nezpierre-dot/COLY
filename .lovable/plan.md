## Objectif

Aligner le header de l'Accueil sur le pattern visuel exact des onglets Missions / Messages / Profil, sans toucher à ces 3 onglets (parfaits).

## Pattern de référence (Missions / Messages / Profil)

```
┌────────────────────────────────────────┐
│ [←]                          [🔔]      │  ← row d'actions
│                                        │
│ ⬤ greeting-bubble-xl (icône + label)   │
│                                        │
│ Titre principal                        │  ← clamp(1.85rem,5.5vw,2.4rem)
│ ligne gradient ✨                      │  ← bg-clip-text gradient primary→secondary
│                                        │
│ Sous-titre muted (max-w-280)           │
└────────────────────────────────────────┘
```

Aucune grosse illustration "héroïque" à droite, pas de SVG décoratif inline — juste les auras automatiques de `page-header-soft`.

## État actuel de l'Accueil

- Le shell (`page-shell` / `page-header-soft` / `page-content`) est déjà appliqué.
- Mais le contenu du header diverge :
  - Voyageur : `greeting-bubble` (petite, pas la XL), titre **sans** ligne gradient, plus une grosse illustration `planeIllustration` 144 px à droite.
  - Demandeur : bubble custom animée, énorme illustration `parcelFutureHero` + SVG route + badge "En route" flottant.
- C'est ce déséquilibre visuel qui fait que l'Accueil "ne ressemble pas" aux autres.

## Modifications (uniquement `src/features/core/pages/Dashboard.tsx`)

### 1. Bandeau d'actions du header
- Garder logo + `NotificationBell` à gauche, `AdminQuickMenu` + bouton "switch role" à droite (le bouton switch est spécifique à l'accueil, on le conserve).

### 2. Header Voyageur — réécrit pour matcher le pattern
- Remplacer `greeting-bubble` → `greeting-bubble-xl` avec icône avion (Lucide `Plane`).
- Nouveau titre 2 lignes :
  - L1 : « Prêt pour un nouveau »
  - L2 : `<span gradient primary→secondary>` voyage ? ✨ `</span>`
- Ajouter un sous-titre muted : « Trouve tes prochains colis et missions en quelques secondes. »
- `UserLevelBadge` conservé sous le sous-titre (`mt-3`).
- **Supprimer** `planeIllustration` (la grosse image à droite) pour respecter le rythme épuré des autres onglets.

### 3. Header Demandeur — simplifié au même pattern
- Remplacer la bubble animée par `greeting-bubble-xl` standard (icône `Package` + « Bonjour{firstName ? `, ${firstName}` : ""} »).
- Conserver le titre 2 lignes existant (« Suis tes envois » / « en un coup d'œil. » en gradient) — déjà conforme.
- Conserver le sous-titre muted existant.
- **Supprimer** le bloc illustration dominant (parcel + SVG route animé + badge "En route" flottant) — il casse l'harmonie avec les 3 autres onglets.
- `UserLevelBadge` conservé.

### 4. Nettoyage imports
- Retirer les imports devenus inutiles : `parcelFutureHero`, `parcelRouteIllustration`, `planeIllustration`, et `MapPin` s'il n'est plus utilisé ailleurs dans le fichier (à vérifier avant suppression).

## Ce qui ne change pas

- Toute la suite du Dashboard sous le header (cards voyages, MatchingSuggestions, listes, dialogs, FAB, etc.).
- Les autres onglets (Missions, Messages, Profil) ne sont pas touchés.
- Les tokens du design system (`page-header-soft`, `greeting-bubble-xl`, gradient primary→secondary) sont déjà définis dans `index.css` — aucun ajout CSS.

## Résultat attendu

L'Accueil devient visuellement indissociable des 3 autres onglets : même header doux à auras, même bubble XL, même titre à 2 lignes avec ligne gradient, même sous-titre muted, même rythme de spacing — tout en gardant son contenu fonctionnel unique (switch de rôle, voyages, suggestions, etc.).