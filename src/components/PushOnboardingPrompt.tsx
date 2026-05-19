/**
 * PushOnboardingPrompt — banner discret qui propose d'activer les notifs push
 * APRÈS un événement-clé (1er match côté sender, 1ère publication côté voyageur).
 *
 * Hook habit-formation : sans notification, pas de trigger externe → pas d'usage
 * récurrent. Ce composant se monte une fois par session via AppProviders et
 * écoute un flag `localStorage["push:prompt:fired"]` pour ne jamais re-spammer.
 *
 * Trigger d'affichage :
 *   1. Utilisateur connecté ET
 *   2. Notifications push supportées + permission "default" + non bloquée ET
 *   3. Flag "shouldAskPush" présent dans localStorage (posé par SendWizard
 *      après 1er envoi, NewTrip après 1ère publication, etc.) OU
 *      compteur de visites ≥ 3 (proxy d'engagement)
 *
 * WCAG : role="dialog", focus trap léger, Escape close.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { motion, AnimatePresence } from "framer-motion";

const FIRED_KEY = "push:prompt:fired";
const ASK_KEY = "push:should-ask";
const VISIT_KEY = "push:visit-count";

const PushOnboardingPrompt = () => {
  const { user } = useAuth();
  const { supported, blocked, permission, subscribe, loading } = usePushNotifications();
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Decide whether to show the prompt
  useEffect(() => {
    if (!user) return;
    if (!supported || blocked) return;
    if (permission !== "default") return;
    // Already shown this session/lifecycle ? Skip.
    try {
      if (localStorage.getItem(FIRED_KEY)) return;
    } catch { /* ignore */ }
    // Trigger #1 : explicit "should-ask" flag set by upstream flows
    let shouldAsk = false;
    try { shouldAsk = !!localStorage.getItem(ASK_KEY); } catch { /* ignore */ }
    // Trigger #2 : engagement proxy (visit count >= 3)
    if (!shouldAsk) {
      try {
        const n = Number(localStorage.getItem(VISIT_KEY) || "0") + 1;
        localStorage.setItem(VISIT_KEY, String(n));
        if (n >= 3) shouldAsk = true;
      } catch { /* ignore */ }
    }
    if (!shouldAsk) return;
    // Defer a few seconds so it doesn't intercept the user's current task
    const t = window.setTimeout(() => setOpen(true), 2500);
    return () => window.clearTimeout(t);
  }, [user, supported, blocked, permission]);

  // Auto-focus close button + Escape close
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(FIRED_KEY, "1");
      localStorage.removeItem(ASK_KEY);
    } catch { /* ignore */ }
  }, []);

  const enable = useCallback(async () => {
    const ok = await subscribe();
    setOpen(false);
    try {
      localStorage.setItem(FIRED_KEY, ok ? "ok" : "tried");
      localStorage.removeItem(ASK_KEY);
    } catch { /* ignore */ }
  }, [subscribe]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="push-prompt-title"
          aria-describedby="push-prompt-desc"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 320 }}
          className="fixed left-3 right-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-[80] sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-card p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Bell size={20} className="text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="push-prompt-title" className="text-sm font-bold text-foreground">Active les notifications</h2>
              <p id="push-prompt-desc" className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                On te prévient dès qu'un voyageur accepte ton colis, qu'il bouge sur ton trajet, ou qu'un match arrive — pas de spam, promis.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={enable}
                  disabled={loading}
                  className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {loading ? "..." : "Activer 🔔"}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex items-center justify-center min-h-11 px-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Plus tard
                </button>
              </div>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={dismiss}
              aria-label="Fermer"
              className="shrink-0 -m-1 p-1 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default PushOnboardingPrompt;
