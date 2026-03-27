import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Star, Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchableSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  className?: string;
  displayFn?: (v: string) => string;
  popularItems?: string[];
  recentItems?: string[];
  popularLabel?: string;
  recentLabel?: string;
  /** Async search callback — when provided, calls this on typing and merges results with options */
  onSearch?: (query: string) => Promise<string[]>;
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
  onSearch,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [asyncResults, setAsyncResults] = useState<string[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const display = displayFn ?? ((v: string) => v);

  const allOptions = useMemo(() => {
    if (!onSearch || asyncResults.length === 0) return options;
    const set = new Set(options);
    asyncResults.forEach((r) => set.add(r));
    return Array.from(set).sort();
  }, [options, asyncResults, onSearch]);

  const validPopular = useMemo(
    () => popularItems.filter((p) => allOptions.includes(p)),
    [popularItems, allOptions]
  );
  const validRecent = useMemo(
    () => recentItems.filter((r) => allOptions.includes(r) && !validPopular.includes(r)),
    [recentItems, allOptions, validPopular]
  );

  const filtered = useMemo(() => {
    if (!search) return allOptions.slice(0, 50);
    const q = search.toLowerCase();
    const matches = allOptions.filter(
      (o) => o.toLowerCase().includes(q) || display(o).toLowerCase().includes(q)
    );
    const popularMatches = matches.filter((m) => validPopular.includes(m) || validRecent.includes(m));
    const rest = matches.filter((m) => !popularMatches.includes(m));
    return [...popularMatches, ...rest].slice(0, 50);
  }, [allOptions, search, display, validPopular, validRecent]);

  // Async search with debounce
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (onSearch && val.trim().length >= 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setAsyncLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await onSearch(val.trim());
          setAsyncResults(results);
        } catch {
          // ignore
        } finally {
          setAsyncLoading(false);
        }
      }, 300);
    } else if (onSearch && val.trim().length < 2) {
      setAsyncResults([]);
      setAsyncLoading(false);
    }
  }, [onSearch]);

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
        setAsyncResults([]);
      }}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/80 transition-colors ${
        item === value ? "bg-primary/10 font-medium text-primary" : ""
      }`}
    >
      {display(item)}
    </button>
  );

  const remainingItems = useMemo(() => {
    if (hasSearch) return [];
    const excluded = new Set([...validPopular, ...validRecent]);
    return allOptions.filter((o) => !excluded.has(o)).slice(0, 30);
  }, [allOptions, validPopular, validRecent, hasSearch]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            setSearch("");
            setAsyncResults([]);
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {asyncLoading && (
              <div className="flex items-center justify-center py-2 gap-2 text-muted-foreground text-sm">
                <Loader2 size={14} className="animate-spin" /> Recherche...
              </div>
            )}
            {hasSearch ? (
              filtered.length === 0 && !asyncLoading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {onSearch && search.length < 2 ? "Tapez au moins 2 caractères" : "Aucun résultat"}
                </div>
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
