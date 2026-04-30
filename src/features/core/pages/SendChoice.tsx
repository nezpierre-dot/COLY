/**
 * SendChoice — Écran de choix guidé après le CTA "Envoyer" de la HomePage.
 *
 * 2 chemins clairs (B2C, 1 décision à la fois) :
 *  1. Envoi de colis classique (point A → point B)  → /send-coly
 *  2. Demande NeedIt (faire acheter un produit)     → /needit/categories
 *
 * UX :
 *  - Cards larges, icône + titre + sous-titre + exemple concret
 *  - Pleine accessibilité clavier (focus visible, aria-labels, role="radiogroup")
 *  - Tutoiement, wording validé en mémoire
 *  - Bouton retour explicite
 *
 * Analytics : send_choice_view, send_choice_pick { kind: parcel|needit }
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Package, ShoppingBag, Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticLight } from "@/lib/haptics";
import { trackEvent } from "@/lib/analytics";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";

type Choice = {
  key: "parcel" | "needit";
  title: string;
  subtitle: string;
  example: string;
  icon: typeof Package;
  to: string;
  accent: "primary" | "accent";
};

const SendChoice = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const firstCardRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    trackEvent("send_choice_view", "navigation");
    // Focus la 1ʳᵉ option pour les utilisateurs clavier
    firstCardRef.current?.focus();
  }, []);

  const choices: Choice[] = [
    {
      key: "parcel",
      title: t("sendChoice.parcelTitle"),
      subtitle: t("sendChoice.parcelSubtitle"),
      example: t("sendChoice.parcelExample"),
      icon: Package,
      to: "/send-coly",
      accent: "primary",
    },
    {
      key: "needit",
      title: t("sendChoice.needitTitle"),
      subtitle: t("sendChoice.needitSubtitle"),
      example: t("sendChoice.needitExample"),
      icon: ShoppingBag,
      to: "/needit/categories",
      accent: "accent",
    },
  ];

  const pick = (c: Choice) => {
    hapticLight();
    trackEvent("send_choice_pick", "navigation", { kind: c.key });
    navigate(c.to);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24">
        <header className="px-5 pt-5 pb-3 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            aria-label={t("common.back")}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">{t("sendChoice.headerTitle")}</h1>
        </header>

        <section className="px-5 pt-2 pb-5">
          <h2 className="text-2xl font-bold text-foreground leading-tight">
            {t("sendChoice.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("sendChoice.subtitle")}</p>
        </section>

        <div
          role="radiogroup"
          aria-label={t("sendChoice.groupAria")}
          className="px-5 space-y-3"
        >
          {choices.map((c, idx) => {
            const Icon = c.icon;
            const isPrimary = c.accent === "primary";
            return (
              <motion.button
                key={c.key}
                ref={idx === 0 ? firstCardRef : undefined}
                role="radio"
                aria-checked="false"
                aria-label={`${c.title}. ${c.subtitle}. ${c.example}`}
                whileTap={{ scale: 0.98 }}
                onClick={() => pick(c)}
                className={[
                  "group relative overflow-hidden w-full rounded-3xl p-5 text-left shadow-lg outline-none",
                  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isPrimary
                    ? "bg-gradient-to-br from-primary to-primary/80 focus-visible:ring-primary"
                    : "bg-gradient-to-br from-accent to-accent/80 focus-visible:ring-accent",
                ].join(" ")}
              >
                <div
                  className={`absolute -right-6 -top-6 w-32 h-32 rounded-full ${
                    isPrimary ? "bg-primary-foreground/10" : "bg-accent-foreground/10"
                  }`}
                />
                <div className="relative flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isPrimary ? "bg-primary-foreground/15" : "bg-accent-foreground/15"
                    }`}
                  >
                    <Icon
                      size={24}
                      className={isPrimary ? "text-primary-foreground" : "text-accent-foreground"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-lg font-bold ${
                        isPrimary ? "text-primary-foreground" : "text-accent-foreground"
                      }`}
                    >
                      {c.title}
                    </p>
                    <p
                      className={`text-sm mt-0.5 ${
                        isPrimary ? "text-primary-foreground/85" : "text-accent-foreground/85"
                      }`}
                    >
                      {c.subtitle}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 mt-2 text-[11px] font-medium rounded-full px-2 py-0.5 ${
                        isPrimary
                          ? "text-primary-foreground/90 bg-primary-foreground/10"
                          : "text-accent-foreground/90 bg-accent-foreground/10"
                      }`}
                    >
                      <Sparkles size={10} /> {c.example}
                    </span>
                  </div>
                  <ArrowRight
                    size={20}
                    className={`shrink-0 mt-1 group-hover:translate-x-1 transition-transform ${
                      isPrimary ? "text-primary-foreground/80" : "text-accent-foreground/80"
                    }`}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className="px-5 mt-6 text-xs text-muted-foreground text-center">
          {t("sendChoice.hint")}
        </p>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default SendChoice;
