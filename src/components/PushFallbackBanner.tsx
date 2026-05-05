import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellOff, Mail, X, Share, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_KEY = "nidit:push-fallback-banner-dismissed";

/**
 * Detect iOS version from UA. Returns null on non-iOS.
 * Web Push on iOS only works from 16.4+ AND when the PWA is installed
 * (added to Home Screen / display-mode: standalone).
 */
function getIOSVersion(): number | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  if (!isIOS) return null;
  const m = ua.match(/OS (\d+)_(\d+)/);
  if (!m) return null;
  return parseFloat(`${m[1]}.${m[2]}`);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Banner shown on iOS devices where Web Push is unavailable
 * (iOS < 16.4, or iOS 16.4+ but PWA not installed).
 * Reassures the user that critical events still arrive by email,
 * and invites them to install the PWA for instant notifications.
 */
export default function PushFallbackBanner() {
  const { supported, blocked } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const status = useMemo(() => {
    const iosVersion = getIOSVersion();
    if (iosVersion === null) return null; // non-iOS: no banner
    if (iosVersion < 16.4) return "ios_too_old" as const;
    if (!isStandalone()) return "ios_not_installed" as const;
    if (!supported) return "ios_unsupported" as const;
    return null;
  }, [supported]);

  // Hide in Lovable preview iframes
  if (blocked) return null;
  if (!status || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const title =
    status === "ios_too_old"
      ? "Notifications limitées sur ton iPhone"
      : "Active les notifications instantanées";

  const description =
    status === "ios_too_old"
      ? "iOS 16.3 ou antérieur ne supporte pas les notifications push. Pas d'inquiétude : on te prévient par email pour les événements critiques (acceptation, OTP, rappels)."
      : "Ajoute Nidit à ton écran d'accueil pour recevoir les notifications instantanées. En attendant, on t'envoie un email pour les événements critiques.";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mx-4 mb-3 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md p-4 relative"
      >
        <button
          onClick={handleDismiss}
          aria-label="Fermer"
          className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-muted/50 transition"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="shrink-0 rounded-xl bg-primary/10 p-2">
            {status === "ios_too_old" ? (
              <Mail className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
            {status === "ios_not_installed" && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium">
                <Share className="h-3.5 w-3.5" /> Safari → Partager → Ajouter à l'écran d'accueil
              </p>
            )}
            <Link
              to="/email-preferences"
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
            >
              <SettingsIcon className="h-3 w-3" /> Gérer l'email de secours
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
      </motion.div>
    </AnimatePresence>
  );
}
