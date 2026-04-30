import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, X, Sparkles, Loader2, ChevronLeft, ArrowRight, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const HIDDEN_PATHS = ["/", "/signup", "/login", "/reset-password"];

// ---------------- Guided questions catalog ----------------
type GuidedQuestion = {
  id: string;
  label: string;
  prompt: string;
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
        prompt:
          "Explique-moi étape par étape comment envoyer un colis sur Nidit (les 4 étapes), de manière simple et concise.",
        link: { to: "/send-coly", label: "Créer un envoi" },
      },
      {
        id: "envoi-prix",
        label: "Comment est calculé le prix ?",
        prompt:
          "Explique-moi comment est calculé le prix d'un envoi sur Nidit (distance, taille, urgence) et la commission de 15%.",
      },
      {
        id: "envoi-suivi",
        label: "Comment suivre mon colis ?",
        prompt:
          "Comment puis-je suivre mon colis en temps réel sur Nidit ? Parle-moi du suivi GPS et des notifications.",
      },
      {
        id: "envoi-modif",
        label: "Puis-je modifier mon envoi ?",
        prompt:
          "Puis-je modifier ou annuler mon envoi après création ? Quelles sont les règles avant et après acceptation par un voyageur ?",
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
        prompt:
          "Comment puis-je devenir voyageur sur Nidit et publier un trajet pour transporter des colis ?",
        link: { to: "/voyageur-search", label: "Espace voyageur" },
      },
      {
        id: "voyage-gains",
        label: "Combien je peux gagner ?",
        prompt:
          "Combien un voyageur peut-il gagner sur Nidit ? Comment sont calculés les revenus par trajet ?",
      },
      {
        id: "voyage-cutoff",
        label: "C'est quoi le cutoff ?",
        prompt:
          "Explique-moi le cutoff d'un trajet sur Nidit (entre 6h et 72h avant départ) et ce qui se passe ensuite.",
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
        prompt:
          "Explique-moi simplement ce qu'est une mission NeedIt sur Nidit et en quoi c'est différent d'un envoi de colis classique.",
      },
      {
        id: "needit-creer",
        label: "Comment créer une mission ?",
        prompt:
          "Détaille les étapes pour créer une mission NeedIt (catégorie → marque → produit → détails).",
      },
      {
        id: "needit-scan",
        label: "Le scanner code-barres",
        prompt:
          "Comment fonctionne le scanner de code-barres EAN dans les missions NeedIt ?",
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
        prompt:
          "Explique-moi le système d'escrow (paiement sécurisé) de Nidit et le délai de 48h après livraison.",
      },
      {
        id: "pay-wallet",
        label: "C'est quoi le wallet ?",
        prompt:
          "C'est quoi le wallet Nidit ? Comment recharger mon solde et retirer mes gains ?",
        link: { to: "/solde", label: "Mon solde" },
      },
      {
        id: "pay-commission",
        label: "Quelle est la commission ?",
        prompt:
          "Quelle commission Nidit prend-elle sur chaque transaction ? Comment est-elle répartie ?",
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
        prompt:
          "Comment fonctionne le système de double OTP à la remise et à la livraison sur Nidit ?",
      },
      {
        id: "remise-photo",
        label: "Pourquoi des photos ?",
        prompt:
          "Pourquoi les photos de pick-up et de livraison sont-elles obligatoires sur Nidit ?",
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
        prompt:
          "C'est quoi le KYC sur Nidit ? Pourquoi dois-je vérifier mon identité et quand ?",
      },
      {
        id: "kyc-quand",
        label: "Quand dois-je le faire ?",
        prompt:
          "À quel moment dois-je faire mon KYC sur Nidit ? Est-il obligatoire dès l'inscription ?",
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
        prompt:
          "Comment ouvrir un litige sur Nidit ? Quel est le délai d'escalade de 72h ?",
        link: { to: "/litiges", label: "Mes litiges" },
      },
      {
        id: "compte-fidelite",
        label: "Le programme de fidélité",
        prompt:
          "Explique-moi le programme de fidélité Nidit (Green → Diamant) et comment gagner des points.",
      },
      {
        id: "compte-notation",
        label: "Comment fonctionne la notation ?",
        prompt:
          "Comment fonctionnent les notes et avis sur Nidit (1-5 étoiles, réponse publique, rappel 24h) ?",
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<GuidedQuestion | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
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

  useEffect(() => () => abortRef.current?.abort(), []);

  const askQuestion = async (q: GuidedQuestion) => {
    if (isStreaming) return;
    setLastQuestion(q);
    setActiveCategory(null);

    const userMsg: Msg = { role: "user", content: q.label };
    const next: Msg[] = [...messages, userMsg, { role: "assistant", content: "" }];
    setMessages(next);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m)),
      );
    };

    try {
      // Send the rich prompt to the AI but display the friendly label to the user
      const apiMessages = [...messages, { role: "user" as const, content: q.prompt }];

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        let errMsg = "Une erreur est survenue. Réessaie dans un instant.";
        if (resp.status === 429) errMsg = "Trop de messages. Patiente quelques secondes.";
        else if (resp.status === 402) errMsg = "Crédits IA épuisés. Contacte le support.";
        try {
          const data = await resp.json();
          if (data?.error) errMsg = data.error;
        } catch { /* keep default */ }
        toast({ title: "Erreur", description: errMsg, variant: "destructive" });
        // Remove the empty assistant placeholder
        setMessages((prev) => prev.slice(0, -1));
        setIsStreaming(false);
        return;
      }

      if (!resp.body) throw new Error("Réponse sans corps");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const content: string | undefined = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "" || !raw.startsWith("data: ")) continue;
          const json = raw.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const content: string | undefined = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return;
      console.error("AI chat error:", e);
      toast({
        title: "Connexion impossible",
        description: "Vérifie ta connexion internet et réessaie.",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const resetConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setActiveCategory(null);
    setLastQuestion(null);
    setIsStreaming(false);
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
                {messages.length > 0 && !isStreaming && (
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
                      m.content ? (
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1.5 prose-strong:text-foreground prose-a:text-primary">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <Loader2 size={16} className="animate-spin text-muted-foreground" />
                      )
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Quick action link after answer */}
              {!isStreaming && lastQuestion?.link && messages[messages.length - 1]?.role === "assistant" && (
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
                        disabled={isStreaming}
                        className="px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 disabled:opacity-50 disabled:cursor-not-allowed text-left transition-colors flex items-center gap-2"
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
                        disabled={isStreaming}
                        className="px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-primary/10 hover:border-primary/30 border border-transparent text-left transition-colors text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2 group"
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
