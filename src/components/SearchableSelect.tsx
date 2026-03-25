import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown, Star, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchableSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  className?: string;
  /** Optional function to transform the display of each option */
  displayFn?: (v: string) => string;
  /** Items shown in a "Popular" section at the top when no search */
  popularItems?: string[];
  /** Items shown in a "Recent" section (user's history) when no search */
  recentItems?: string[];
  /** Label for popular section */
  popularLabel?: string;
  /** Label for recent section */
  recentLabel?: string;
}

const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = "",
  displayFn,
  popularItems = [],
  recentItems = [],
  popularLabel = "Populaires",
  recentLabel = "Récents",
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const display = displayFn ?? ((v: string) => v);

  // Filter popular/recent to only include items in the options list
  const validPopular = useMemo(
    () => popularItems.filter((p) => options.includes(p)),
    [popularItems, options]
  );
  const validRecent = useMemo(
    () => recentItems.filter((r) => options.includes(r) && !validPopular.includes(r)),
    [recentItems, options, validPopular]
  );

  const filtered = useMemo(() => {
    if (!search) return options.slice(0, 50);
    const q = search.toLowerCase();
    // Prioritize popular/recent in search results
    const matches = options.filter(
      (o) => o.toLowerCase().includes(q) || display(o).toLowerCase().includes(q)
    );
    const popularMatches = matches.filter((m) => validPopular.includes(m) || validRecent.includes(m));
    const rest = matches.filter((m) => !popularMatches.includes(m));
    return [...popularMatches, ...rest].slice(0, 50);
  }, [options, search, display, validPopular, validRecent]);

  const hasSearch = search.length > 0;
  const showSections = !hasSearch && (validPopular.length > 0 || validRecent.length > 0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const renderItem = (item: string) => (
    <button
      key={item}
      type="button"
      onClick={() => {
        onChange(item);
        setOpen(false);
        setSearch("");
      }}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/80 transition-colors ${
        item === value ? "bg-primary/10 font-medium text-primary" : ""
      }`}
    >
      {display(item)}
    </button>
  );

  // Remaining items excluding popular & recent
  const remainingItems = useMemo(() => {
    if (hasSearch) return [];
    const excluded = new Set([...validPopular, ...validRecent]);
    return options.filter((o) => !excluded.has(o)).slice(0, 30);
  }, [options, validPopular, validRecent, hasSearch]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            setSearch("");
          }
        }}
        className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? display(value) : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg">
          <div className="p-2">
            <Input
              autoFocus
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {hasSearch ? (
              filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Aucun résultat</div>
              ) : (
                filtered.map(renderItem)
              )
            ) : showSections ? (
              <>
                {validRecent.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                      <Clock size={12} className="text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{recentLabel}</span>
                    </div>
                    {validRecent.map(renderItem)}
                  </>
                )}
                {validPopular.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                      <Star size={12} className="text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{popularLabel}</span>
                    </div>
                    {validPopular.map(renderItem)}
                  </>
                )}
                {remainingItems.length > 0 && (
                  <>
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">A – Z</span>
                    </div>
                    {remainingItems.map(renderItem)}
                  </>
                )}
              </>
            ) : (
              filtered.map(renderItem)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
