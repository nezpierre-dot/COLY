import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Loader2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

// — Country / City API helpers —

const fetchCountries = async (): Promise<string[]> => {
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries");
    const json = await res.json();
    if (!json.error && json.data) {
      return (json.data as { country: string }[])
        .map((c) => c.country)
        .sort((a, b) => a.localeCompare(b, "fr"));
    }
  } catch (e) {
    console.error("Failed to fetch countries:", e);
  }
  return [];
};

const fetchCities = async (country: string): Promise<string[]> => {
  try {
    const res = await fetch(
      "https://countriesnow.space/api/v0.1/countries/cities",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      }
    );
    const json = await res.json();
    if (!json.error && json.data) {
      return (json.data as string[]).sort((a, b) => a.localeCompare(b, "fr"));
    }
  } catch (e) {
    console.error("Failed to fetch cities:", e);
  }
  return [];
};

// — Searchable Dropdown —

const SearchableDropdown = ({
  label,
  placeholder,
  items,
  value,
  onChange,
  loading,
  disabled,
  error,
}: {
  label: string;
  placeholder: string;
  items: string[];
  value: string;
  onChange: (v: string) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? items.filter((i) => i.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            disabled={disabled}
            className={`w-full flex items-center justify-between border-b py-3 text-left bg-transparent transition-colors disabled:opacity-50 ${
              error
                ? "border-destructive text-destructive"
                : "border-primary/30 focus:border-primary"
            } ${value ? "text-foreground" : "text-muted-foreground"}`}
          >
            <span className="truncate">
              {loading ? "Chargement..." : value || placeholder}
            </span>
            {loading ? (
              <Loader2 size={16} className="animate-spin text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground shrink-0" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border border-border shadow-lg z-50"
          align="start"
          sideOffset={4}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              className="flex-1 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {items.length === 0 ? "Aucune donnée" : "Aucun résultat"}
              </p>
            ) : (
              <div className="py-1">
                {filtered.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                      value === item
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

// — Main Component —

const NeeditMission = () => {
  const navigate = useNavigate();
  const [pays, setPays] = useState("");
  const [ville, setVille] = useState("");
  const [timing, setTiming] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // API data
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  // Fetch countries on mount
  useEffect(() => {
    fetchCountries().then((data) => {
      setCountries(data);
      setLoadingCountries(false);
    });
  }, []);

  // Fetch cities when country changes
  const handleCountryChange = useCallback((country: string) => {
    setPays(country);
    setVille("");
    setCities([]);
    if (errors.pays) setErrors((p) => { const n = { ...p }; delete n.pays; return n; });

    if (country) {
      setLoadingCities(true);
      fetchCities(country).then((data) => {
        setCities(data);
        setLoadingCities(false);
      });
    }
  }, [errors.pays]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!pays.trim()) e.pays = "Pays requis";
    if (!timing) e.timing = "Veuillez choisir une option";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Veuillez compléter les champs requis");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    toast.success("Mission NeedIt créée !");
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col bg-primary relative overflow-hidden">
      <div className="absolute top-12 left-1/2 -translate-x-1/3 w-40 h-40 rounded-full bg-primary-foreground/10" />
      <div className="absolute top-28 right-10 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-foreground/20" />
        ))}
      </div>

      <div className="relative z-10 px-6 pt-12 pb-6">
        <h1 className="text-4xl font-bold text-primary-foreground leading-tight">
          NeedIt<br />Missions
        </h1>
      </div>

      <div className="relative z-10 flex-1 bg-card rounded-t-3xl px-6 pt-8 pb-24">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">
          Information NeedIt
        </h2>

        <h3 className="text-lg text-muted-foreground mb-3">à Partir d'ou ?</h3>
        <div className="space-y-4 mb-8">
          <SearchableDropdown
            label="Pays"
            placeholder="Sélectionnez un pays"
            items={countries}
            value={pays}
            onChange={handleCountryChange}
            loading={loadingCountries}
            error={errors.pays}
          />
          <SearchableDropdown
            label="Ville (facultatif)"
            placeholder="Sélectionnez une ville"
            items={cities}
            value={ville}
            onChange={(v) => setVille(v)}
            loading={loadingCities}
            disabled={!pays}
          />
        </div>

        <h3 className="text-lg text-muted-foreground mb-3">Quand ?</h3>
        {errors.timing && (
          <p className="text-xs text-destructive mb-2">{errors.timing}</p>
        )}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={timing === "asap"}
              onCheckedChange={() => {
                setTiming("asap");
                if (errors.timing)
                  setErrors((p) => { const n = { ...p }; delete n.timing; return n; });
              }}
            />
            <span className="text-foreground">dès que possible</span>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={timing === "date"}
              onCheckedChange={() => {
                setTiming("date");
                if (errors.timing)
                  setErrors((p) => { const n = { ...p }; delete n.timing; return n; });
              }}
            />
            <span className="text-foreground">
              à partir de la date indiquée ci dessus.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            Retour
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-accent text-accent-foreground text-lg font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            Continuer <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default NeeditMission;
