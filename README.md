# Nidit – Transport collaboratif de colis

[![Built with Lovable](https://lovable.dev/badge.svg)](https://lovable.dev)

**Nidit** est une plateforme PWA de transport collaboratif de colis entre particuliers (colis-voiturage). Les voyageurs transportent des colis ou achètent des produits (missions NeedIt) sur leur trajet, les demandeurs envoient ou reçoivent facilement.

## ✨ Fonctionnalités

- 📦 **Envoi de colis** – Créez une demande d'envoi avec photo, dimensions et tarif
- 🛒 **Missions NeedIt** – Demandez à un voyageur d'acheter un produit à l'étranger
- 🗺️ **Voyages** – Publiez vos trajets et acceptez des colis ou missions
- 📸 **Preuves photo** – Récupération et livraison sécurisées avec géolocalisation
- 🔑 **Code de confirmation** – Code unique pour finaliser la mission et débloquer le paiement
- 💬 **Messagerie** – Chat en temps réel entre voyageur et demandeur
- 🔔 **Notifications** – Alertes push et in-app pour chaque étape
- ⭐ **Évaluations** – Système de notation mutuelle
- 🌍 **Multi-langue** – FR / EN / AR
- 📱 **PWA installable** – Fonctionne hors-ligne, installable sur mobile

## 🛠️ Stack technique

- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS
- **UI** : shadcn/ui, Radix UI, Framer Motion
- **Backend** : Lovable Cloud – Auth, Database, Edge Functions, Storage
- **Cartes** : Mapbox GL
- **Paiement** : Stripe

## 📥 Installation

```bash
# 1. Cloner le projet
git clone <repo-url>
cd nidit

# 2. Installer les dépendances
bun install        # ou npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
```

Ouvrez `.env` et remplissez chaque variable avec vos propres clés :

| Variable | Description | Où la trouver |
|---|---|---|
| `VITE_SUPABASE_PROJECT_ID` | ID du projet Supabase | Dashboard Lovable Cloud |
| `VITE_SUPABASE_URL` | URL de l'API Supabase | Dashboard Lovable Cloud |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique (anon) | Dashboard Lovable Cloud |
| `VITE_MAPBOX_TOKEN` | Token public Mapbox | [mapbox.com/account](https://account.mapbox.com/) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) |

> ⚠️ Ne commitez jamais le fichier `.env`. Seul `.env.example` (avec des placeholders) doit être versionné.

```bash
# 4. Lancer en développement
bun dev            # ou npm run dev
```

## 📁 Structure

```
src/
├── components/    # Composants réutilisables (UI, tracking, preuves…)
├── features/      # Modules métier (auth, voyage, shipment, needit, chat…)
├── hooks/         # Hooks custom (auth, theme, traduction, notifications…)
├── lib/           # Utilitaires (i18n, haptics, géolocalisation…)
└── integrations/  # Client auto-généré
supabase/
├── functions/     # Edge Functions (emails, EAN, paiement…)
└── migrations/    # Migrations SQL
```

## 📄 Licence

Projet privé – Tous droits réservés.
