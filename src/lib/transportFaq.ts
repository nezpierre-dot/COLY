/**
 * Transport-specific FAQ generation for trip detail pages.
 * Returns Q/A tailored to the mode of transport (avion, voiture, train, bus, bateau).
 */
export type TransportKind = "avion" | "voiture" | "train" | "bus" | "bateau" | "autre";

export function detectTransport(method: string | null | undefined): TransportKind {
  const m = (method ?? "").toLowerCase();
  if (/avion|plane|flight|vol|aéri/.test(m)) return "avion";
  if (/voiture|car|auto|road|route/.test(m)) return "voiture";
  if (/train|tgv|rail/.test(m)) return "train";
  if (/bus|coach|car /.test(m)) return "bus";
  if (/bateau|ferry|boat|ship|cargo/.test(m)) return "bateau";
  return "autre";
}

export interface FaqItem {
  q: string;
  a: string;
}

interface FaqContext {
  from: string;
  to: string;
  method: string;
}

export function buildTransportFaq({ from, to, method }: FaqContext): FaqItem[] {
  const kind = detectTransport(method);
  const base: FaqItem[] = [
    {
      q: `Comment envoyer un colis de ${from} à ${to} ?`,
      a: `Crée ton compte Nidit, publie ton colis ${from} → ${to}, choisis un voyageur vérifié et règle en paiement protégé. Le voyageur récupère ton colis et le remet à destination contre code OTP.`,
    },
    {
      q: `Quel est le prix d'envoi ${from} → ${to} ?`,
      a: `Le tarif est fixé librement entre membre et voyageur Nidit selon le poids, le volume et la nature du colis. Souvent moins cher que la poste classique pour ${from} → ${to}.`,
    },
    {
      q: "Mon colis est-il assuré et protégé ?",
      a: "Le paiement est bloqué (escrow) jusqu'à la confirmation de livraison via OTP et photo. En cas de litige, l'équipe Nidit intervient sous 72 h.",
    },
  ];

  switch (kind) {
    case "avion":
      return [
        ...base,
        {
          q: `Quel poids maximum pour un envoi ${from} → ${to} en avion ?`,
          a: `En avion, la limite dépend des bagages du voyageur (souvent 5 à 23 kg). Vérifie la capacité affichée sur l'annonce du trajet ${from} → ${to}.`,
        },
        {
          q: "Quels objets sont interdits en avion ?",
          a: "Liquides >100ml en cabine, batteries lithium hors normes, objets tranchants, produits inflammables, aérosols sous pression. Suis les règles IATA.",
        },
        {
          q: "Combien de temps pour un envoi par avion ?",
          a: `Pour un trajet ${from} → ${to} en avion, la livraison est généralement effectuée le jour même ou le lendemain de l'arrivée du voyageur.`,
        },
      ];
    case "voiture":
      return [
        ...base,
        {
          q: `Puis-je envoyer un colis volumineux ${from} → ${to} en voiture ?`,
          a: `Oui, en voiture la capacité est plus souple qu'en avion. Tu peux confier des colis volumineux ou lourds (jusqu'à plusieurs dizaines de kg) à un voyageur Nidit sur ${from} → ${to}.`,
        },
        {
          q: "Comment se passe le suivi en voiture ?",
          a: "Le voyageur partage sa position en temps réel via Nidit. Tu reçois une alerte à 5 km puis 1 km du point de remise.",
        },
        {
          q: `Combien de temps pour un trajet ${from} → ${to} en voiture ?`,
          a: `La livraison dépend de la durée du trajet routier ${from} → ${to} et des arrêts éventuels. Le voyageur indique sa date d'arrivée estimée.`,
        },
      ];
    case "train":
      return [
        ...base,
        {
          q: `Quels sont les avantages d'un envoi ${from} → ${to} en train ?`,
          a: `Le train est rapide, ponctuel et écologique. Idéal pour un envoi ${from} → ${to} le jour même, avec moins de restrictions qu'en avion sur les liquides.`,
        },
        {
          q: "Y a-t-il une limite de bagages en train ?",
          a: "Pas de limite stricte de poids en TGV/Intercités, mais le voyageur reste responsable du transport jusqu'au quai. Vérifie la capacité affichée.",
        },
        {
          q: "Où s'effectue la remise en gare ?",
          a: "La remise et la récupération s'organisent en gare de départ et d'arrivée, ou à proximité, selon ce que toi et le voyageur convenez via la messagerie Nidit.",
        },
      ];
    case "bus":
      return [
        ...base,
        {
          q: `Pourquoi choisir un envoi ${from} → ${to} en bus ?`,
          a: `Le bus est souvent l'option la plus économique pour ${from} → ${to}, avec une bonne capacité bagages en soute. Idéal pour les trajets transfrontaliers.`,
        },
        {
          q: "Quels formats de colis sont acceptés en bus ?",
          a: "La plupart des compagnies acceptent les bagages en soute jusqu'à environ 20 kg. Les objets fragiles doivent être bien emballés.",
        },
      ];
    case "bateau":
      return [
        ...base,
        {
          q: `Combien de temps pour un envoi ${from} → ${to} en bateau ?`,
          a: `En bateau / ferry, compte plusieurs heures à plusieurs jours selon la traversée ${from} → ${to}. Idéal pour les colis lourds non urgents.`,
        },
        {
          q: "Quelle capacité pour un envoi par bateau ?",
          a: "La capacité est généralement très importante (plusieurs dizaines de kg). Vérifie les détails affichés sur l'annonce.",
        },
      ];
    default:
      return base;
  }
}
