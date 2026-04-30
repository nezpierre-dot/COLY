import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, X, Sparkles, ChevronLeft, ArrowRight, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

type Msg = { role: "user" | "assistant"; content: string };

const HIDDEN_PATHS = ["/", "/signup", "/login", "/reset-password"];

// ---------------- Guided questions catalog ----------------
type GuidedQuestion = {
  id: string;
  label: string;
  answer: string; // markdown response, served from frontend (no AI cost)
  link?: { to: string; label: string };
};
type GuidedCategory = {
  id: string;
  label: string;
  emoji: string;
  questions: GuidedQuestion[];
};

const CATEGORIES: GuidedCategory[] = [
  {
    id: "envoi",
    label: "Envoyer un colis",
    emoji: "📦",
    questions: [
      {
        id: "envoi-comment",
        label: "Comment envoyer un colis ?",
        answer: `Envoyer un colis sur **Nidit** se fait en **4 étapes** :

1. **Trajet** — indique l'adresse de départ et d'arrivée (précises, avec code d'accès si besoin).
2. **Colis** — choisis la taille (S, M, L, XL) et ajoute une photo.
3. **Tarif & options** — fixe ton prix, active l'assurance si tu le souhaites.
4. **Récap & paiement** — vérifie, paie, et c'est lancé ! 🚀

Le paiement est sécurisé en **escrow** : le voyageur est rémunéré 48h après livraison confirmée.`,
        link: { to: "/send-coly", label: "Créer un envoi" },
      },
      {
        id: "envoi-prix",
        label: "Comment est calculé le prix ?",
        answer: `Le **prix d'un envoi** est libre et fixé par toi, mais Nidit te suggère un tarif basé sur :

- 📏 **La distance** entre départ et arrivée
- 📦 **La taille du colis** (S, M, L, XL)
- ⏱️ **L'urgence** (date de livraison souhaitée)
- 🛡️ **L'assurance** (option)

**Commission Nidit : 15%** prélevée sur le voyageur (incluse dans son revenu net affiché).`,
      },
      {
        id: "envoi-suivi",
        label: "Comment suivre mon colis ?",
        answer: `Tu suis ton colis **en temps réel** via :

- 🗺️ **Carte GPS** Mapbox sur la page de suivi
- 🔔 **Notifications push** à chaque étape (accepté → récupéré → en transit → livré)
- 📍 **Alertes de proximité** à 5 km puis 1 km de la livraison
- 📸 **Preuves photo** au pick-up et à la remise

Tu retrouves tout ça dans **Mes envois** > sélectionne ton colis.`,
      },
      {
        id: "envoi-modif",
        label: "Puis-je modifier mon envoi ?",
        answer: `**Avant acceptation** par un voyageur ✅ : tu peux modifier ou annuler librement depuis Mes envois.

**Après acceptation** ❌ : l'envoi est **verrouillé** pour protéger le voyageur.

- Annulation possible **uniquement avant le pick-up**
- Après pick-up → tu dois **ouvrir un litige** (/litiges)
- Délai d'escalade : **72h**`,
      },
    ],
  },
  {
    id: "voyage",
    label: "Devenir voyageur",
    emoji: "✈️",
    questions: [
      {
        id: "voyage-comment",
        label: "Comment devenir voyageur ?",
        answer: `Pour **devenir voyageur** sur Nidit :

1. Bascule ton rôle dans **Réglages > Mode Voyageur**
2. Publie un **trajet** (départ, arrivée, date, capacité disponible)
3. Reçois des **propositions de colis** correspondant à ton trajet
4. Accepte, récupère, livre — et reçois ton paiement 48h après remise ✅

Le **KYC** (vérification d'identité) est obligatoire avant ton premier colis.`,
        link: { to: "/voyageur-search", label: "Espace voyageur" },
      },
      {
        id: "voyage-gains",
        label: "Combien je peux gagner ?",
        answer: `Tes **revenus voyageur** dépendent de :

- 🛣️ La **distance** parcourue
- 📦 La **taille** des colis transportés
- 🌍 **National vs International** (les trajets internationaux paient plus)
- ⭐ Ton **niveau de fidélité** (Green → Diamant) qui débloque des bonus

Tu touches **85% du tarif fixé** par le demandeur (commission Nidit : 15%). Paiement automatique vers ton wallet 48h après livraison.`,
      },
      {
        id: "voyage-cutoff",
        label: "C'est quoi le cutoff ?",
        answer: `Le **cutoff** est le délai avant départ à partir duquel ton trajet **n'accepte plus de nouveaux colis**.

- ⏱️ Configurable entre **6h et 72h** avant départ
- 🚪 Passé ce délai, le trajet est **fermé automatiquement** aux nouveaux matchs
- ✅ Les colis déjà acceptés restent valides

Cela t'évite d'être sollicité au dernier moment.`,
      },
    ],
  },
  {
    id: "needit",
    label: "Missions NeedIt",
    emoji: "🛒",
    questions: [
      {
        id: "needit-quoi",
        label: "C'est quoi une mission NeedIt ?",
        answer: `Une **mission NeedIt** = tu demandes à un voyageur d'**acheter ET rapporter** un produit pour toi.

Différence avec un envoi classique :
- 📦 **Colis** : tu envoies un objet que tu possèdes déjà
- 🛒 **NeedIt** : le voyageur **achète** le produit sur place puis te le livre

Idéal pour des produits introuvables chez toi (spécialités locales, éditions limitées, etc.).`,
      },
      {
        id: "needit-creer",
        label: "Comment créer une mission ?",
        answer: `Création d'une mission NeedIt :

1. **Catégorie** → choisis le type de produit
2. **Marque** → précise si pertinent
3. **Produit** → nom exact (ou scan du code-barres EAN 📷)
4. **Détails** → quantité, budget max, photo de référence
5. **Adresse de livraison** + date souhaitée
6. **Paiement** sécurisé en escrow

Le voyageur achète, scanne le ticket de caisse comme preuve, te livre.`,
      },
      {
        id: "needit-scan",
        label: "Le scanner code-barres",
        answer: `Le **scanner EAN** te permet d'identifier précisément un produit :

- 📷 Scanne le code-barres avec ton téléphone
- 🔍 Récupération automatique du nom, marque, photo via **Open Food Facts** + cache interne Nidit
- ✅ Aucune ambiguïté pour le voyageur — il sait exactement quoi acheter

Disponible directement dans le formulaire de création NeedIt.`,
      },
    ],
  },
  {
    id: "paiement",
    label: "Paiement & Wallet",
    emoji: "💳",
    questions: [
      {
        id: "pay-escrow",
        label: "Comment fonctionne l'escrow ?",
        answer: `L'**escrow** est notre système de **paiement sécurisé** :

1. 💳 Tu paies à la création de l'envoi
2. 🔒 L'argent est **bloqué** sur un compte Stripe Connect
3. 📦 Le voyageur livre + tu confirmes via **code OTP**
4. ⏱️ **48h** après livraison → paiement libéré au voyageur
5. ⚖️ Pendant ces 48h, tu peux **ouvrir un litige** si problème

Aucun paiement direct entre utilisateurs : Nidit fait l'intermédiaire.`,
      },
      {
        id: "pay-wallet",
        label: "C'est quoi le wallet ?",
        answer: `Le **wallet Nidit** est ton portefeuille interne :

- 💰 **Recharger** : par carte bancaire (Stripe) ou SEPA
- 💸 **Retirer** tes gains de voyageur vers ton compte bancaire
- 📊 **Historique** complet des transactions
- 🎁 Utilise ton solde pour payer tes futurs envois

Les retraits sont traités sous 1 à 3 jours ouvrés.`,
        link: { to: "/solde", label: "Mon solde" },
      },
      {
        id: "pay-commission",
        label: "Quelle est la commission ?",
        answer: `**Commission Nidit : 15%** sur chaque transaction.

Répartition :
- 👤 **Demandeur** paie le tarif affiché (TTC, sans frais cachés)
- ✈️ **Voyageur** reçoit **85%** du tarif
- 🏢 **Nidit** garde **15%** pour : assurance, support, infrastructure, escrow Stripe

Aucun frais d'inscription, aucun abonnement.`,
      },
    ],
  },
  {
    id: "remise",
    label: "Remise & OTP",
    emoji: "🔐",
    questions: [
      {
        id: "remise-otp",
        label: "Comment marche le code OTP ?",
        answer: `Le **double OTP** sécurise les échanges physiques :

🔐 **OTP de pick-up** : le demandeur donne un code au voyageur quand il récupère le colis.
🔐 **OTP de livraison** : le destinataire donne un code au voyageur à la remise.

Sans ces codes, le statut ne peut pas avancer. Cela garantit que **le bon colis** est remis à la **bonne personne**.`,
      },
      {
        id: "remise-photo",
        label: "Pourquoi des photos ?",
        answer: `Les **photos de pick-up et livraison** sont **obligatoires** car elles :

- 📸 Servent de **preuve** en cas de litige
- 🛡️ Protègent le voyageur (prouve qu'il a bien remis le colis)
- 🛡️ Protègent le demandeur (prouve l'état du colis à la remise)
- 🔍 Sont analysées automatiquement par notre système anti-fraude

Sans photo → impossible de valider l'étape.`,
      },
    ],
  },
  {
    id: "kyc",
    label: "Vérification (KYC)",
    emoji: "🪪",
    questions: [
      {
        id: "kyc-quoi",
        label: "C'est quoi le KYC ?",
        answer: `**KYC = Know Your Customer** (vérification d'identité).

Sur Nidit, le KYC est **obligatoire** pour :
- ✈️ Devenir voyageur (transporter des colis)
- 📦 Envoyer ton **premier** colis (demandeur)

Pourquoi ? Pour **lutter contre la fraude**, respecter la **réglementation** (paiements, douanes) et **rassurer** la communauté.`,
      },
      {
        id: "kyc-quand",
        label: "Quand dois-je le faire ?",
        answer: `Le KYC est demandé **uniquement au premier envoi** ou à l'activation du mode voyageur — pas à l'inscription.

Processus en **5 étapes** rapides (~3 min) :
1. Pièce d'identité (carte / passeport)
2. Selfie de vérification
3. Adresse postale
4. Numéro de téléphone
5. Validation automatique (souvent <1h)

Une fois validé, tu n'as plus jamais à le refaire ✅`,
      },
    ],
  },
  {
    id: "compte",
    label: "Compte & Sécurité",
    emoji: "👤",
    questions: [
      {
        id: "compte-litiges",
        label: "Comment ouvrir un litige ?",
        answer: `Si un problème survient (colis abîmé, non remis, etc.) :

1. Va dans **Mes litiges** depuis ton envoi concerné
2. Décris le problème + ajoute des **photos**
3. Notre équipe te répond sous **24h**
4. Délai d'escalade : **72h** pour fournir tous les éléments

Pendant le litige, le **paiement reste bloqué** en escrow jusqu'à résolution.`,
        link: { to: "/litiges", label: "Mes litiges" },
      },
      {
        id: "compte-fidelite",
        label: "Le programme de fidélité",
        answer: `**4 niveaux** de fidélité Nidit :

- 🟢 **Green** (départ)
- 🟡 **Gold** — bonus matchs prioritaires
- 💎 **Platine** — commission réduite, support prioritaire
- 💠 **Diamant** — visibilité max, badges exclusifs

**Gagner des points** : livrer des colis, recevoir 5⭐, parrainer des amis, compléter ton profil.

**Perdre des points** : annulations tardives, mauvaises notes, litiges perdus.`,
      },
      {
        id: "compte-notation",
        label: "Comment fonctionne la notation ?",
        answer: `Après chaque livraison, **chacun note l'autre** :

- ⭐ **1 à 5 étoiles** + commentaire optionnel
- 💬 **Réponse publique** possible aux avis reçus
- 🔔 **Rappel automatique** 24h après livraison si tu n'as pas noté
- 📊 Ta moyenne est visible sur ton profil

Les notes impactent ton **niveau de fidélité** et ta **visibilité** dans les matchs.`,
      },
    ],
  },
];

const AiChatWidget = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<GuidedQuestion | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const launcherRef = useRef<HTMLButtonElement | null>(null);

  const isHidden = !user || HIDDEN_PATHS.includes(location.pathname);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setTimeout(() => launcherRef.current?.focus?.(), 60);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, activeCategory]);

  const askQuestion = (q: GuidedQuestion) => {
    setLastQuestion(q);
    setActiveCategory(null);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: q.label },
      { role: "assistant", content: q.answer },
    ]);
  };

  const resetConversation = () => {
    setMessages([]);
    setActiveCategory(null);
    setLastQuestion(null);
  };

  const goToLink = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  if (isHidden) return null;

  const activeCat = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            ref={launcherRef}
            key="launcher"
            initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 260, damping: 20 }
            }
            onClick={() => setOpen(true)}
            aria-label="Ouvrir l'assistant Nidit"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="fixed bottom-28 right-4 sm:bottom-10 sm:right-8 z-40 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-primary text-primary-foreground shadow-elevated hover:shadow-glow active:scale-95 transition-all flex items-center justify-center focus-visible:outline-2 focus-visible:outline-primary"
          >
            <MessageCircle size={26} strokeWidth={2} />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent flex items-center justify-center">
              <Sparkles size={10} className="text-accent-foreground" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
            role="dialog"
            aria-modal="false"
            aria-label="Assistant Nidit"
            className="fixed bottom-20 right-2 left-2 sm:bottom-8 sm:right-8 sm:left-auto z-40 sm:w-[380px] max-h-[calc(100dvh-7rem)] sm:max-h-[600px] flex flex-col rounded-3xl bg-card border border-border shadow-elevated overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-hero px-5 py-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft shrink-0">
                  <Sparkles size={18} className="text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-foreground text-base leading-tight">Assistant Nidit</h2>
                  <p className="text-xs text-muted-foreground truncate">Choisis une question 👇</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={resetConversation}
                    aria-label="Nouvelle conversation"
                    className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition-colors"
                  >
                    <RotateCcw size={16} className="text-foreground" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fermer l'assistant"
                  className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition-colors"
                >
                  <X size={18} className="text-foreground" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-soft">
              {messages.length === 0 && !activeCat && (
                <div className="text-center pt-2 pb-1 px-2">
                  <p className="text-sm font-semibold text-foreground mb-1">Bienvenue ! 🎒</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sélectionne un sujet pour obtenir une réponse instantanée.
                  </p>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-gradient-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1.5 prose-strong:text-foreground prose-a:text-primary">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Quick action link after answer */}
              {lastQuestion?.link && messages[messages.length - 1]?.role === "assistant" && (
                <div className="flex justify-start">
                  <button
                    onClick={() => goToLink(lastQuestion.link!.to)}
                    className="text-xs px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors flex items-center gap-1.5 font-medium"
                  >
                    {lastQuestion.link.label}
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Guided question picker */}
            <div className="border-t border-border bg-card px-3 py-3 max-h-[45%] overflow-y-auto">
              {!activeCat ? (
                <>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-1 mb-2">
                    {messages.length === 0 ? "Choisis un sujet" : "Une autre question ?"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className="px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 text-left transition-colors flex items-center gap-2"
                      >
                        <span className="text-base shrink-0">{cat.emoji}</span>
                        <span className="text-xs font-medium text-foreground leading-tight">
                          {cat.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft size={14} />
                      Retour
                    </button>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
                      <span>{activeCat.emoji}</span>
                      {activeCat.label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {activeCat.questions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => askQuestion(q)}
                        className="px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-primary/10 hover:border-primary/30 border border-transparent text-left transition-colors text-xs text-foreground flex items-center justify-between gap-2 group"
                      >
                        <span className="leading-snug">{q.label}</span>
                        <ArrowRight size={12} className="text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiChatWidget;
