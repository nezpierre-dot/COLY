/**
 * LanguageSwitcher — dropdown discret pour permettre aux visiteurs anonymes
 * de changer la langue depuis la PublicHeader (et toute autre surface publique).
 *
 * - Auto-détection navigator.language reste active (premier chargement)
 * - L'utilisateur peut override via ce switcher
 * - Persistance : localStorage (clé "preferred-language")
 * - WCAG : bouton avec aria-haspopup + aria-expanded + role="menu" + Escape close
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Languages, Check } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { AVAILABLE_LANGUAGES, type AppLocale } from "@/hooks/useLanguagePreference";

interface LanguageSwitcherProps {
  /** Variant compact = icon only ; default = icon + label */
  variant?: "compact" | "full";
  className?: string;
}

const LanguageSwitcher = ({ variant = "compact", className }: LanguageSwitcherProps) => {
  const { language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const current = AVAILABLE_LANGUAGES.find((l) => l.code === language);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = useCallback((code: AppLocale) => {
    setLanguage(code);
    setOpen(false);
    triggerRef.current?.focus();
  }, [setLanguage]);

  return (
    <div ref={wrapRef} className={["relative", className].filter(Boolean).join(" ")}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Changer de langue (${current?.label || language})`}
        className="inline-flex items-center gap-1.5 min-h-11 px-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Languages size={16} className="text-muted-foreground" aria-hidden="true" />
        {variant === "full" ? (
          <span className="hidden sm:inline">{current?.label || language.toUpperCase()}</span>
        ) : (
          <span className="hidden sm:inline uppercase tracking-wide text-xs font-semibold">{language}</span>
        )}
        <span className="text-base" aria-hidden="true">{current?.flag}</span>
      </button>

      {open && (
        <ul
          role="menu"
          aria-label="Liste des langues"
          className="absolute right-0 mt-2 min-w-[180px] rounded-2xl border border-border bg-card shadow-card py-1 z-50 max-h-80 overflow-y-auto"
        >
          {AVAILABLE_LANGUAGES.map((l) => {
            const active = l.code === language;
            return (
              <li key={l.code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => pick(l.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-11 text-sm hover:bg-muted transition-colors focus-visible:outline-none focus-visible:bg-muted ${active ? "font-semibold text-foreground" : "text-foreground/80"}`}
                >
                  <span className="text-base" aria-hidden="true">{l.flag}</span>
                  <span className="flex-1 text-left">{l.label}</span>
                  {active && <Check size={14} className="text-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LanguageSwitcher;
