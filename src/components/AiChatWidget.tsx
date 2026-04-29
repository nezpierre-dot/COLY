import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, Send, X, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const HIDDEN_PATHS = ["/", "/signup", "/login", "/reset-password"];

const AiChatWidget = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const launcherRef = useRef<HTMLButtonElement | null>(null);

  const isHidden = !user || HIDDEN_PATHS.includes(location.pathname);

  // Esc ferme le panel ; restaure le focus sur le launcher
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        // Le launcher se remontera et reprendra le focus naturellement à la prochaine ouverture
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
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
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

      // Flush leftover
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
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (isHidden) return null;

  return (
    <>
      {/* Floating launcher button */}
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

      {/* Chat panel */}
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
                  <p className="text-xs text-muted-foreground">Posez vos questions, je suis là 👋</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer l'assistant"
                className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-soft">
              {messages.length === 0 && (
                <div className="text-center py-6 px-2">
                  <p className="text-sm font-semibold text-foreground mb-2">Bienvenue ! 🎒</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    Je peux t'aider sur l'envoi de colis, les missions NeedIt, le paiement, le KYC…
                  </p>
                  <div className="flex flex-col gap-2">
                    {[
                      "Comment envoyer un colis ?",
                      "C'est quoi une mission NeedIt ?",
                      "Comment fonctionne l'escrow ?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="px-3 py-2 rounded-xl bg-card border border-border text-xs text-foreground text-left hover:bg-muted/60 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
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
                        <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3.5 py-2.5">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border bg-card px-3 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pose ta question…"
                  rows={1}
                  maxLength={1000}
                  disabled={isStreaming}
                  aria-label="Votre question"
                  className="flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-h-32"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || isStreaming}
                  aria-label="Envoyer le message"
                  className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-primary text-primary-foreground shadow-soft hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center"
                >
                  {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiChatWidget;
