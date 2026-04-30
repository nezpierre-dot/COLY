import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, X, Sparkles, PenLine, AlertTriangle, RefreshCw, Loader2, History, TrendingUp, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { CATEGORIES, BRAND_ENABLED_CATEGORIES, type CategoryKey, type CategoryDef } from "@/lib/categoryIcons";
import NeeditPageHeader from "../components/NeeditPageHeader";
import { useNeeditDraft } from "../hooks/useNeeditDraft";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import needitBagIllustration from "@/assets/illustrations/needit-bag.png";

type SuggestionReason = "recent" | "popular";
type Suggestion = { cat: CategoryDef; reason: SuggestionReason; count?: number };

const DISMISSED_KEY = "nidit:needit:dismissedSuggestions";
const readDismissed = (): CategoryKey[] => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CategoryKey[]) : [];
  } catch {
    return [];
  }
};
const writeDismissed = (keys: CategoryKey[]) => {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(keys));
  } catch {
    /* quota / private mode */
  }
};

const NeeditCategoriesPage = () => {
  const navigate = useNavigate();
  const { update, reset } = useNeeditDraft();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [recentCounts, setRecentCounts] = useState<Map<CategoryKey, number>>(new Map());
  const [recentLoading, setRecentLoading] = useState(true);
  const [dismissed, setDismissed] = useState<CategoryKey[]>(() => readDismissed());

  // Sécurise l'import (si pour une raison quelconque CATEGORIES est vide, on bascule en erreur)
  const categoriesLoaded = Array.isArray(CATEGORIES) && CATEGORIES.length > 0;

  useEffect(() => {
    trackEvent("needit_categories_view", "navigation");
  }, []);

  // Récupère l'historique du user pour construire des suggestions explicables
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        setRecentLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("needit_missions" as any)
          .select("category_key")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);
        if (cancelled) return;
        const counts = new Map<CategoryKey, number>();
        for (const row of (data as any[]) || []) {
          const k = row?.category_key as CategoryKey | undefined;
          if (!k) continue;
          counts.set(k, (counts.get(k) || 0) + 1);
        }
        setRecentCounts(counts);
      } catch {
        if (!cancelled) setRecentCounts(new Map());
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!categoriesLoaded) return [];
    if (!q) return CATEGORIES;
    return CATEGORIES.filter((c) => {
      if (c.label.toLowerCase().includes(q)) return true;
      return (c.children || []).some((child) => child.label.toLowerCase().includes(q));
    });
  }, [q, categoriesLoaded]);

  const popular = filtered.filter((c) => c.popular);
  const others = filtered.filter((c) => !c.popular).sort((a, b) => a.label.localeCompare(b.label));

  // Suggestions explicables : 1) historique trié par fréquence, 2) populaires en complément
  // Toujours filtrées par les "ignorées" (persistées localement)
  const suggestions = useMemo<Suggestion[]>(() => {
    if (!categoriesLoaded || q) return [];
    const dismissedSet = new Set(dismissed);

    const fromRecent: Suggestion[] = [];
    for (const [key, count] of Array.from(recentCounts.entries()).sort((a, b) => b[1] - a[1])) {
      if (dismissedSet.has(key)) continue;
      const cat = CATEGORIES.find((c) => c.key === key);
      if (cat) fromRecent.push({ cat, reason: "recent", count });
    }

    const recentKeysSet = new Set(fromRecent.map((s) => s.cat.key));
    const fromPopular: Suggestion[] = CATEGORIES.filter(
      (c) => c.popular && !recentKeysSet.has(c.key) && !dismissedSet.has(c.key)
    ).map((cat) => ({ cat, reason: "popular" }));

    return [...fromRecent, ...fromPopular].slice(0, 3);
  }, [categoriesLoaded, q, recentCounts, dismissed]);

  const handlePick = (key: CategoryKey, label: string, source: string) => {
    trackEvent("needit_categories_pick", "engagement", { key, source });
    reset();
    update({ categoryKey: key, categoryLabel: label });
    if (BRAND_ENABLED_CATEGORIES.includes(key)) {
      navigate(`/needit/marques/${key}`);
    } else {
      navigate("/needit-mission");
    }
  };

  const dismissSuggestion = (key: CategoryKey, reason: SuggestionReason) => {
    setDismissed((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      writeDismissed(next);
      return next;
    });
    trackEvent("needit_suggestion_dismiss", "engagement", { key, reason });
    toast(t("needit.cat.suggestionDismissed"), {
      action: {
        label: t("needit.cat.undo"),
        onClick: () => {
          setDismissed((prev) => {
            const next = prev.filter((k) => k !== key);
            writeDismissed(next);
            return next;
          });
          trackEvent("needit_suggestion_dismiss_undo", "engagement", { key });
        },
      },
    });
  };

  const resetDismissed = () => {
    setDismissed([]);
    writeDismissed([]);
    trackEvent("needit_suggestion_dismiss_reset", "engagement");
  };

  // -------- Fallback : catégories indisponibles -----------------------------
  if (!categoriesLoaded) {
    return (
      <div className="min-h-screen bg-gradient-soft flex flex-col">
        <NeeditPageHeader
          title={t("needit.cat.title")}
          subtitle={t("needit.cat.step")}
          onBack={() => navigate("/dashboard")}
        />
        <main className="flex-1 px-4 pt-5 pb-32 max-w-2xl mx-auto w-full">
          <div className="text-center rounded-3xl border border-dashed border-border bg-muted/30 p-8 mt-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="text-destructive" size={28} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              {t("needit.cat.errorTitle")}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">{t("needit.cat.errorDesc")}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <RefreshCw size={16} /> {t("needit.cat.retry")}
              </button>
              <button
                onClick={() => navigate("/needit-mission")}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-colors"
              >
                {t("needit.cat.skipFreeform")}
              </button>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col">
      <NeeditPageHeader
        title={t("needit.cat.title")}
        subtitle={t("needit.cat.step")}
        onBack={() => navigate("/dashboard")}
      />

      <main className="flex-1 px-4 sm:px-5 pt-5 pb-32 max-w-2xl mx-auto w-full">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2
              className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight"
              dangerouslySetInnerHTML={{ __html: t("needit.cat.heroTitle") }}
            />
            <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed max-w-[34ch]">
              {t("needit.cat.heroSub")}
            </p>
          </div>
          <img
            src={needitBagIllustration}
            alt=""
            aria-hidden="true"
            loading="eager"
            width={112}
            height={112}
            className="w-20 h-20 sm:w-28 sm:h-28 object-contain shrink-0 drop-shadow-lg"
          />
        </div>

        <div className="sticky top-[68px] z-20 -mx-4 sm:-mx-5 px-4 sm:px-5 py-3 bg-background/80 backdrop-blur-md mb-4">
          <label className="flex items-center gap-3 px-4 h-14 rounded-2xl bg-muted border border-border focus-within:border-primary focus-within:bg-card transition-all shadow-sm">
            <Search size={20} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("needit.cat.searchPh")}
              aria-label={t("needit.cat.searchPh")}
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label={t("needit.cat.clearSearch")}
                className="shrink-0 w-8 h-8 rounded-full bg-muted-foreground/15 hover:bg-muted-foreground/25 flex items-center justify-center transition-colors"
              >
                <X size={14} className="text-foreground" />
              </button>
            )}
          </label>
        </div>

        {/* Suggestions personnalisées — explicables et ignorables */}
        {!q && (
          <Section
            title={t("needit.cat.suggestionsTitle")}
            icon={<Sparkles size={14} className="text-accent" />}
            action={
              dismissed.length > 0 ? (
                <button
                  onClick={resetDismissed}
                  className="text-[11px] font-semibold text-primary hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {t("needit.cat.restoreAll")}
                </button>
              ) : null
            }
          >
            {recentLoading ? (
              <SuggestionsSkeleton />
            ) : suggestions.length > 0 ? (
              <SuggestionList
                items={suggestions}
                onPick={(k, l) => handlePick(k, l, "suggestion")}
                onDismiss={dismissSuggestion}
              />
            ) : (
              <p className="text-xs text-muted-foreground italic px-1">
                {t("needit.cat.noSuggestions")}
              </p>
            )}
          </Section>
        )}

        {filtered.length === 0 ? (
          <EmptyState search={search} onSkip={() => navigate("/needit-mission")} />
        ) : (
          <>
            {!q && popular.length > 0 && (
              <Section
                title={t("needit.cat.popular")}
                icon={<Sparkles size={14} className="text-accent" />}
              >
                <CategoryGrid
                  items={popular}
                  onPick={(k, l) => handlePick(k, l, "popular")}
                  accent
                  topLabel={t("needit.cat.top")}
                />
              </Section>
            )}

            {others.length > 0 && (
              <Section title={q ? t("needit.cat.results") : t("needit.cat.all")}>
                <CategoryGrid
                  items={others}
                  onPick={(k, l) => handlePick(k, l, q ? "search" : "all")}
                  topLabel={t("needit.cat.top")}
                />
              </Section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

const Section = ({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="mb-8">
    <div className="flex items-center justify-between mb-3 px-1">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground/80 uppercase tracking-wider">
        {icon}
        {title}
      </h3>
      {action}
    </div>
    {children}
  </section>
);

const SuggestionList = ({
  items,
  onPick,
  onDismiss,
}: {
  items: Suggestion[];
  onPick: (key: CategoryKey, label: string) => void;
  onDismiss: (key: CategoryKey, reason: SuggestionReason) => void;
}) => {
  const { t } = useTranslation();
  const reasonMeta = (s: Suggestion) => {
    if (s.reason === "recent") {
      return {
        Icon: History,
        // count > 1 → "Commandé X fois", sinon "Déjà commandé"
        label:
          s.count && s.count > 1
            ? t("needit.cat.reason.recentN", { count: String(s.count) })
            : t("needit.cat.reason.recent"),
        cls: "bg-primary/10 text-primary",
      };
    }
    return {
      Icon: TrendingUp,
      label: t("needit.cat.reason.popular"),
      cls: "bg-accent/15 text-accent",
    };
  };

  return (
    <ul className="space-y-2.5" role="list">
      {items.map((s, i) => {
        const meta = reasonMeta(s);
        const ReasonIcon = meta.Icon;
        const dismissAria = t("needit.cat.dismissAria", { label: s.cat.label });
        return (
          <motion.li
            key={s.cat.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.2) }}
            className="relative flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all"
          >
            <button
              type="button"
              onClick={() => onPick(s.cat.key, s.cat.label)}
              aria-label={s.cat.label}
              className="flex-1 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1 -m-1"
            >
              <img
                src={s.cat.icon}
                alt=""
                aria-hidden="true"
                className="w-12 h-12 object-contain shrink-0 drop-shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{s.cat.label}</p>
                <span
                  className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.cls}`}
                >
                  <ReasonIcon size={10} aria-hidden="true" />
                  {meta.label}
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onDismiss(s.cat.key, s.reason)}
              aria-label={dismissAria}
              title={t("needit.cat.dismiss")}
              className="shrink-0 w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <EyeOff size={16} aria-hidden="true" />
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
};

const CategoryGrid = ({
  items,
  onPick,
  accent = false,
  topLabel,
}: {
  items: typeof CATEGORIES;
  onPick: (key: CategoryKey, label: string) => void;
  accent?: boolean;
  topLabel: string;
}) => (
  <div className="grid grid-cols-2 gap-4">
    {items.map((c, i) => (
      <motion.button
        key={c.key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.03, 0.25) }}
        whileTap={{ scale: 0.96 }}
        onClick={() => onPick(c.key, c.label)}
        aria-label={c.label}
        className={`relative flex flex-col items-center justify-center gap-3 p-5 aspect-[4/5] rounded-3xl bg-card border transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none ${
          accent ? "border-accent/30 bg-accent/[0.03]" : "border-border"
        }`}
      >
        {c.popular && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wide shadow-sm">
            <Sparkles size={9} />
            {topLabel}
          </span>
        )}
        <div className="flex-1 flex items-center justify-center w-full">
          <img
            src={c.icon}
            alt=""
            aria-hidden="true"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-sm"
          />
        </div>
        <span className="text-sm sm:text-base font-bold text-foreground text-center leading-tight line-clamp-2">
          {c.label}
        </span>
      </motion.button>
    ))}
  </div>
);

const SuggestionsSkeleton = () => (
  <div className="grid grid-cols-2 gap-4" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="aspect-[4/5] rounded-3xl bg-card border border-border animate-pulse"
      />
    ))}
  </div>
);

const EmptyState = ({ search, onSkip }: { search: string; onSkip: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="text-center rounded-3xl border border-dashed border-border bg-muted/30 p-8 mt-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center">
        <PenLine className="text-primary" size={28} />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t("needit.cat.emptyTitle")}
      </h3>
      <p className="text-sm text-muted-foreground mb-1">{t("needit.cat.emptyTo")}</p>
      <p className="text-base font-semibold text-foreground mb-5">"{search}"</p>
      <button
        onClick={onSkip}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        {t("needit.cat.describeFreely")}
      </button>
    </div>
  );
};

export default NeeditCategoriesPage;
