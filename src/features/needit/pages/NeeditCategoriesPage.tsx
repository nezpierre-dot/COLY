import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, X, Sparkles, PenLine } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { CATEGORIES, BRAND_ENABLED_CATEGORIES, type CategoryKey } from "@/lib/categoryIcons";
import NeeditPageHeader from "../components/NeeditPageHeader";
import { useNeeditDraft } from "../hooks/useNeeditDraft";
import { useTranslation } from "@/hooks/useTranslation";
import needitBagIllustration from "@/assets/illustrations/needit-bag.png";

const NeeditCategoriesPage = () => {
  const navigate = useNavigate();
  const { update, reset } = useNeeditDraft();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return CATEGORIES;
    return CATEGORIES.filter((c) => {
      if (c.label.toLowerCase().includes(q)) return true;
      return (c.children || []).some((child) => child.label.toLowerCase().includes(q));
    });
  }, [q]);

  const popular = filtered.filter((c) => c.popular);
  const others = filtered.filter((c) => !c.popular).sort((a, b) => a.label.localeCompare(b.label));

  const handlePick = (key: CategoryKey, label: string) => {
    reset();
    update({ categoryKey: key, categoryLabel: label });
    if (BRAND_ENABLED_CATEGORIES.includes(key)) {
      navigate(`/needit/marques/${key}`);
    } else {
      navigate("/needit-mission");
    }
  };

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

        {filtered.length === 0 ? (
          <EmptyState search={search} onSkip={() => navigate("/needit-mission")} />
        ) : (
          <>
            {!q && popular.length > 0 && (
              <Section
                title={t("needit.cat.popular")}
                icon={<Sparkles size={14} className="text-accent" />}
              >
                <CategoryGrid items={popular} onPick={handlePick} accent topLabel={t("needit.cat.top")} />
              </Section>
            )}

            {others.length > 0 && (
              <Section title={q ? t("needit.cat.results") : t("needit.cat.all")}>
                <CategoryGrid items={others} onPick={handlePick} topLabel={t("needit.cat.top")} />
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
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="mb-8">
    <h3 className="flex items-center gap-2 text-sm font-bold text-foreground/80 uppercase tracking-wider mb-3 px-1">
      {icon}
      {title}
    </h3>
    {children}
  </section>
);

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
        className={`relative flex flex-col items-center justify-center gap-3 p-5 aspect-[4/5] rounded-3xl bg-card border transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:shadow-sm ${
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
