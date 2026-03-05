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

## 🚀 Démarrage rapide

```bash
# Cloner le projet
git clone <repo-url>
cd nidit

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# Lancer en développement
npm run dev
```

## 📁 Structure

```
src/
├── components/    # Composants réutilisables (UI, tracking, preuves…)
├── hooks/         # Hooks custom (auth, theme, traduction, notifications…)
├── pages/         # Pages de l'application
├── lib/           # Utilitaires (i18n, haptics, géolocalisation…)
└── integrations/  # Client auto-généré
supabase/
├── functions/     # Edge Functions (emails, EAN, paiement…)
└── migrations/    # Migrations SQL
```

## 📄 Licence

Projet privé – Tous droits réservés.
