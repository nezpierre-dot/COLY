/**
 * Static blog content for SEO / organic traffic.
 * Articles are stored as TS modules (no DB) so they can be statically indexed
 * and added to the sitemap. Add a new entry to BLOG_POSTS to publish.
 *
 * Style guide:
 *  - Tutoiement (cf. Core memory)
 *  - "Voyageur Nidit" (jamais "Transporteur")
 *  - "Paiement protégé" (jamais "Escrow" en user-facing)
 *  - "Vérification d'identité" (jamais "KYC" en user-facing)
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** ISO date — used for sitemap lastmod and article display */
  publishedAt: string;
  updatedAt?: string;
  /** Reading time in minutes (rough estimate) */
  readingMinutes: number;
  /** Comma-separated keywords for meta + internal use */
  keywords: string[];
  /** Article body in lightweight blocks (rendered by BlogPost page) */
  blocks: BlogBlock[];
  /** Related route slugs (links to /explore/:slug) */
  relatedRoutes?: string[];
  category: "guide" | "comparatif" | "destination" | "astuces";
}

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "cta"; text: string; href: string; label: string };

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "envoyer-colis-maroc-pas-cher",
    title: "Comment envoyer un colis au Maroc pas cher en 2025",
    description:
      "Guide complet pour envoyer un colis au Maroc moins cher : tarifs, délais, douane, alternative collaborative Nidit (France → Casablanca, Marrakech, Rabat, Tanger).",
    publishedAt: "2026-05-05",
    readingMinutes: 7,
    category: "guide",
    keywords: [
      "envoi colis maroc pas cher",
      "envoyer colis france maroc",
      "tarif colis maroc",
      "livraison casablanca",
      "douane maroc colis",
    ],
    relatedRoutes: ["paris_casablanca", "lyon_marrakech", "marseille_rabat"],
    blocks: [
      { type: "p", text: "Tu cherches comment envoyer un colis au Maroc sans payer une fortune ? Que ce soit pour de la nourriture, des cosmétiques, des vêtements ou un cadeau famille, voici toutes les options 2025 — y compris l'alternative collaborative Nidit, souvent la moins chère." },
      { type: "h2", text: "Les options classiques pour envoyer un colis au Maroc" },
      { type: "h3", text: "1. La Poste / Colissimo international" },
      { type: "p", text: "Tarif à partir d'environ 30 € pour 2 kg, livraison en 5 à 10 jours ouvrés. Pratique mais cher dès que le poids monte, et délais aléatoires en période de fêtes." },
      { type: "h3", text: "2. Chronopost, DHL, UPS, FedEx" },
      { type: "p", text: "Plus rapides (2 à 4 jours), avec suivi en temps réel. Comptez 60 à 150 € selon poids et destination (Casablanca, Marrakech, Tanger, Rabat, Agadir)." },
      { type: "h3", text: "3. Le cotransportage entre particuliers (Nidit)" },
      { type: "p", text: "Tu confies ton colis à un voyageur Nidit vérifié qui se rend déjà au Maroc en avion, voiture ou bateau. Tarif négocié librement, souvent 30 à 60 % moins cher que les services postaux. Paiement protégé jusqu'à la remise contre code OTP." },
      { type: "h2", text: "Comparatif tarifs envoi colis Maroc (2 kg, France → Casablanca)" },
      {
        type: "table",
        head: ["Service", "Délai", "Prix indicatif", "Suivi"],
        rows: [
          ["Colissimo International", "5–10 j", "30–40 €", "Oui"],
          ["Chronopost International", "2–4 j", "60–80 €", "Temps réel"],
          ["DHL Express", "2–3 j", "70–120 €", "Temps réel"],
          ["Voyageur Nidit", "Selon trajet", "15–35 € + paiement protégé", "Live + OTP"],
        ],
      },
      { type: "h2", text: "Que peut-on (et ne peut-on pas) envoyer au Maroc ?" },
      { type: "ul", items: [
        "Autorisés : vêtements, livres, jouets, cosmétiques pour usage personnel, alimentaire sec, électronique légère.",
        "Restrictions : alcool, tabac, médicaments sur ordonnance, denrées périssables, devises au-dessus du seuil légal.",
        "Interdits : armes, drones non déclarés, certaines plantes, tout produit dangereux.",
      ] },
      { type: "h2", text: "Combien coûte la douane au Maroc pour un colis personnel ?" },
      { type: "p", text: "Pour un colis personnel d'une valeur déclarée inférieure à 1 250 MAD (~115 €), il est en général exonéré de droits de douane. Au-dessus, des droits + TVA marocaine de 20 % peuvent s'appliquer. Pense à toujours déclarer la vraie valeur — la sous-déclaration est risquée." },
      { type: "h2", text: "Pourquoi Nidit est souvent l'option la plus avantageuse" },
      { type: "ul", items: [
        "Voyageurs vérifiés (vérification d'identité obligatoire).",
        "Paiement protégé : ton argent est bloqué jusqu'à la livraison.",
        "Code OTP + photo à la remise comme preuve.",
        "Suivi GPS en temps réel, alertes à 5 km puis 1 km du destinataire.",
        "Litiges traités sous 72 heures par l'équipe Nidit.",
      ] },
      { type: "cta", text: "Prêt à envoyer ton colis au Maroc ?", href: "/explore/paris_casablanca", label: "Voir les voyageurs Paris → Casablanca" },
      { type: "h2", text: "FAQ rapide" },
      { type: "h3", text: "Combien de temps pour envoyer un colis au Maroc ?" },
      { type: "p", text: "1 à 4 jours en avion via un voyageur Nidit, 2 à 4 jours via Chronopost/DHL, 5 à 10 jours en Colissimo classique." },
      { type: "h3", text: "Puis-je envoyer de la nourriture au Maroc ?" },
      { type: "p", text: "Oui pour l'alimentaire sec et emballé d'origine. Les produits frais ou périssables sont déconseillés (douane et conditions de transport)." },
    ],
  },
  {
    slug: "comparatif-envoi-colis-international-2025",
    title: "Comparatif envoi colis international 2025 : Nidit, La Poste, DHL, Chronopost",
    description:
      "Comparatif 2025 des solutions pour envoyer un colis à l'international : tarifs, délais, suivi, douane. Quand choisir un voyageur Nidit, La Poste, DHL ou Chronopost.",
    publishedAt: "2026-05-05",
    readingMinutes: 8,
    category: "comparatif",
    keywords: [
      "comparatif envoi colis international 2025",
      "envoi colis international pas cher",
      "alternative DHL Chronopost",
      "cotransportage particulier",
    ],
    relatedRoutes: ["paris_dakar", "paris_alger", "lyon_tunis", "paris_montreal"],
    blocks: [
      { type: "p", text: "Envoyer un colis à l'international en 2025 n'est plus la même affaire qu'il y a cinq ans. Entre la hausse des tarifs postaux, les délais des transporteurs classiques et l'essor du cotransportage entre particuliers, on fait le point sur la meilleure option selon ton besoin." },
      { type: "h2", text: "Tableau comparatif global" },
      {
        type: "table",
        head: ["Critère", "La Poste", "Chronopost", "DHL Express", "Voyageur Nidit"],
        rows: [
          ["Prix 2 kg Europe", "20 €", "35 €", "55 €", "10–20 €"],
          ["Prix 2 kg Maghreb", "30 €", "60 €", "80 €", "15–30 €"],
          ["Prix 2 kg Afrique sub.", "45 €", "90 €", "120 €", "20–50 €"],
          ["Délai moyen", "5–15 j", "2–5 j", "2–3 j", "Selon trajet"],
          ["Suivi", "Basique", "Temps réel", "Temps réel", "Live GPS + OTP"],
          ["Paiement protégé", "Non", "Non", "Non", "Oui (escrow)"],
        ],
      },
      { type: "h2", text: "Quand choisir La Poste ?" },
      { type: "p", text: "Pour les petits colis (<1 kg) sans urgence, La Poste reste compétitive. Idéal pour des documents ou cadeaux légers vers l'Europe." },
      { type: "h2", text: "Quand choisir Chronopost / DHL / UPS ?" },
      { type: "p", text: "Pour les envois pros urgents avec garantie de délai. Le coût est élevé mais la fiabilité aussi. Évite si tu envoies un cadeau à la famille — tu paieras 2 à 3 fois trop cher." },
      { type: "h2", text: "Quand choisir un voyageur Nidit ?" },
      { type: "ul", items: [
        "Tu veux le tarif le plus bas (négocié de particulier à particulier).",
        "Tu envoies à un proche dans un pays peu desservi (Maroc, Sénégal, Algérie, Tunisie, Côte d'Ivoire, Liban, Vietnam…).",
        "Tu veux un suivi humain : photo à la remise, code OTP, contact direct avec le voyageur.",
        "Tu acceptes une certaine flexibilité de date (selon les voyages disponibles).",
      ] },
      { type: "h2", text: "Top 5 destinations Nidit en 2025" },
      { type: "ol", items: [
        "Paris ⇄ Dakar — la plus active, départs quasi quotidiens.",
        "Paris ⇄ Casablanca — forte demande cosmétiques et alimentaire.",
        "Lyon ⇄ Alger — communauté très engagée.",
        "Paris ⇄ Montréal — alternative économique à Postes Canada.",
        "Marseille ⇄ Tunis — proximité géographique, ferry + avion.",
      ] },
      { type: "cta", text: "Trouve un voyageur sur ta route", href: "/explore", label: "Explorer les trajets disponibles" },
    ],
  },
  {
    slug: "envoyer-colis-senegal-dakar",
    title: "Envoyer un colis au Sénégal (Dakar) : guide pratique 2025",
    description:
      "Comment envoyer un colis au Sénégal pas cher : tarifs Paris → Dakar, douane sénégalaise, délais, alternative collaborative Nidit avec voyageurs vérifiés.",
    publishedAt: "2026-05-05",
    readingMinutes: 6,
    category: "destination",
    keywords: [
      "envoyer colis sénégal",
      "colis paris dakar",
      "tarif colis dakar",
      "douane sénégal colis",
    ],
    relatedRoutes: ["paris_dakar", "lyon_dakar", "marseille_dakar"],
    blocks: [
      { type: "p", text: "Le Sénégal — et particulièrement Dakar — est l'une des destinations les plus actives de Nidit. Voici comment envoyer un colis France → Sénégal au meilleur prix en 2025." },
      { type: "h2", text: "Combien coûte un colis Paris → Dakar ?" },
      { type: "p", text: "En Colissimo International, comptez environ 45 € pour 2 kg en 7 à 12 jours. En Chronopost/DHL, 80 à 150 € en 2 à 4 jours. Via un voyageur Nidit en avion : généralement 20 à 50 € pour 2 kg, livraison sous 24 à 48 h après l'arrivée." },
      { type: "h2", text: "Que peut-on envoyer au Sénégal ?" },
      { type: "ul", items: [
        "Vêtements, chaussures, cosmétiques, parfums, produits de soin.",
        "Médicaments sans ordonnance pour usage personnel (en quantité raisonnable).",
        "Électronique grand public (smartphone, tablette — souvent taxés à l'arrivée).",
        "Alimentaire emballé d'origine (chocolat, café, biscuits…).",
      ] },
      { type: "h2", text: "Douane sénégalaise : ce qu'il faut savoir" },
      { type: "p", text: "Au-delà d'une valeur déclarée d'environ 100 000 FCFA (~150 €), des droits de douane et TVA peuvent s'appliquer. Les colis personnels entre particuliers passent généralement sans encombre s'ils restent dans des limites raisonnables." },
      { type: "h2", text: "Pourquoi Dakar marche autant chez Nidit" },
      { type: "p", text: "La diaspora sénégalaise en France, Belgique et Italie envoie en permanence des colis à la famille. Avec Nidit, tu trouves quasiment chaque jour un voyageur Paris → Dakar, Lyon → Dakar ou Marseille → Dakar." },
      { type: "cta", text: "Voir les voyageurs Paris → Dakar", href: "/explore/paris_dakar", label: "Trouver un voyageur" },
    ],
  },
  {
    slug: "astuces-emballage-colis-international",
    title: "10 astuces pour bien emballer un colis avant un envoi international",
    description:
      "Comment emballer ton colis pour un envoi international : matériel, protection, étiquetage, douane. Évite la casse et les retours.",
    publishedAt: "2026-05-05",
    readingMinutes: 5,
    category: "astuces",
    keywords: [
      "emballer colis international",
      "comment emballer colis fragile",
      "protection colis avion",
    ],
    blocks: [
      { type: "p", text: "Un colis bien emballé arrive intact. Voici 10 règles d'or pour préparer ton envoi international, que tu passes par La Poste, DHL ou un voyageur Nidit." },
      { type: "ol", items: [
        "Choisis un carton à double cannelure pour les objets lourds.",
        "Utilise du papier bulle ou des chips de calage — pas de journaux (taches d'encre).",
        "Laisse minimum 5 cm entre l'objet et les parois du carton.",
        "Emballe chaque objet fragile individuellement.",
        "Renforce les coins avec du scotch d'emballage large.",
        "Indique 'Fragile' clairement si nécessaire (mais ne te repose pas dessus).",
        "Note l'adresse complète du destinataire à l'intérieur ET à l'extérieur.",
        "Joins la liste détaillée du contenu pour la douane.",
        "Évite les emballages d'origine de produits high-tech (vol).",
        "Pèse et mesure ton colis avant de confirmer le tarif avec le voyageur.",
      ] },
      { type: "quote", text: "Un colis bien emballé est un colis qui arrive entier — c'est ta responsabilité, pas celle du transporteur." },
      { type: "cta", text: "Publie ton colis sur Nidit", href: "/signup", label: "Créer un compte" },
    ],
  },
  {
    slug: "envoyer-colis-algerie",
    title: "Envoyer un colis en Algérie depuis la France : tarifs et conseils 2025",
    description:
      "Guide complet pour envoyer un colis en Algérie (Alger, Oran, Constantine) : Colissimo, DHL, voyageurs Nidit, douane algérienne et délais.",
    publishedAt: "2026-05-05",
    readingMinutes: 6,
    category: "destination",
    keywords: [
      "envoyer colis algérie",
      "colis paris alger",
      "lyon alger colis",
      "tarif colis algérie",
      "douane algérie",
    ],
    relatedRoutes: ["paris_alger", "lyon_alger", "marseille_oran"],
    blocks: [
      { type: "p", text: "L'Algérie est, avec le Maroc et la Tunisie, l'une des destinations les plus demandées par la communauté française. Voici comment envoyer ton colis Paris → Alger, Lyon → Alger ou Marseille → Oran sans te ruiner." },
      { type: "h2", text: "Tarifs comparés France → Algérie (2 kg)" },
      {
        type: "table",
        head: ["Service", "Délai", "Prix"],
        rows: [
          ["Colissimo International", "5–10 j", "30 €"],
          ["Chronopost", "2–4 j", "65 €"],
          ["DHL Express", "2–3 j", "85 €"],
          ["Voyageur Nidit (avion)", "1–3 j", "15–30 €"],
          ["Voyageur Nidit (bateau Marseille→Alger)", "2–5 j", "10–25 €"],
        ],
      },
      { type: "h2", text: "Douane algérienne : règles à connaître" },
      { type: "p", text: "Les colis personnels d'une valeur inférieure à 50 000 DZD passent en général sans frais. Les produits high-tech, parfums et cosmétiques en grande quantité peuvent être taxés. Toujours déclarer la valeur réelle." },
      { type: "h2", text: "Bateau ou avion : que choisir ?" },
      { type: "p", text: "Pour les colis lourds (>10 kg) ou volumineux (meubles, électroménager léger), un voyageur Nidit qui prend le ferry Marseille → Alger est imbattable côté tarif. Pour les colis urgents et légers, l'avion reste roi." },
      { type: "cta", text: "Voir les voyageurs Paris → Alger", href: "/explore/paris_alger", label: "Trouver un voyageur" },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedPosts(slug: string, max = 3): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, max);
}
