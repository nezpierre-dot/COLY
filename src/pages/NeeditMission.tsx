import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ChevronDown, Loader2, Search, Camera, ScanBarcode } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { successFeedback } from "@/lib/successFeedback";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencyForCountry, getUnitsForCountry } from "@/hooks/useLocaleUnits";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import EanScanner from "@/components/EanScanner";

// ─── Product Category Data ───

type CategoryNode = {
  label: string;
  children?: CategoryNode[];
};

const PRODUCT_CATEGORIES: CategoryNode[] = [
  {
    label: "ALIMENTATION / BOISSONS",
    children: [
      { label: "Épicerie fine" },
      { label: "Produits secs / Conserves" },
      { label: "Snack et gourmandises" },
      { label: "Fromages et Charcuterie" },
      { label: "Produits de la Mer" },
      { label: "Boulangerie" },
      { label: "Boisson végétales" },
      { label: "Boisson non alcoolisées" },
      {
        label: "Boisson alcoolisées",
        children: [
          {
            label: "Vins",
            children: [
              { label: "Rouge" }, { label: "Blanc" }, { label: "Rosé" }, { label: "Pétillant" },
            ],
          },
          { label: "Bières", children: [{ label: "Artisanale" }, { label: "Industrielle" }, { label: "Sans alcool" }] },
          {
            label: "Spiritueux",
            children: [
              {
                label: "Whisky",
                children: [{ label: "Single Malt" }, { label: "Blended" }, { label: "Bourbon" }, { label: "Japonais" }],
              },
              {
                label: "Vodka",
                children: [{ label: "Pure" }, { label: "Aromatisé" }, { label: "Bio" }, { label: "Premium" }],
              },
              {
                label: "Rhum",
                children: [{ label: "Blanc" }, { label: "Ambré" }, { label: "Vieux" }, { label: "Arrangé" }],
              },
              {
                label: "Gin",
                children: [{ label: "London Dry" }, { label: "Aromatisé" }, { label: "Premium" }],
              },
              { label: "Tequila", children: [{ label: "Blanco" }, { label: "Reposado" }, { label: "Añejo" }] },
              { label: "Cognac & Armagnac" },
            ],
          },
          { label: "Cidres et boissons Fermentées" },
          { label: "Cocktails" },
          { label: "Alcools de Saison" },
          { label: "Saké" },
          { label: "Absinthe" },
          { label: "Liqueurs" },
          { label: "Champagnes / Crémants" },
        ],
      },
    ],
  },
  {
    label: "HIGH-TECH / ÉLECTRONIQUE",
    children: [
      { label: "Smartphones & Tablettes" },
      { label: "Ordinateurs & Accessoires" },
      { label: "Audio & Casques" },
      { label: "Photo & Vidéo" },
      { label: "Gaming" },
      { label: "Objets connectés" },
    ],
  },
  {
    label: "MODE / BIJOUX / BAGAGERIE",
    children: [
      { label: "Vêtements" },
      { label: "Chaussures" },
      { label: "Bijoux" },
      { label: "Montres" },
      { label: "Sacs & Bagagerie" },
      { label: "Maroquinerie" },
    ],
  },
  {
    label: "COSMÉTIQUE & SOINS",
    children: [
      { label: "Soins visage" },
      { label: "Soins corps" },
      { label: "Maquillage" },
      { label: "Parfums" },
      { label: "Soins capillaires" },
      { label: "K-Beauty" },
      { label: "J-Beauty" },
      { label: "Bio & Naturel" },
    ],
  },
  {
    label: "JOUETS / JEUX VIDÉO / LIVRES",
    children: [
      { label: "Jouets enfants" },
      { label: "Jeux de société" },
      { label: "Jeux vidéo & Consoles" },
      { label: "Livres & Manga" },
      { label: "Figurines & Collectors" },
    ],
  },
  {
    label: "MAISON / DÉCORATION",
    children: [
      { label: "Décoration intérieure" },
      { label: "Art de la table" },
      { label: "Textile maison" },
      { label: "Bougies & Senteurs" },
      { label: "Ustensiles de cuisine" },
    ],
  },
  {
    label: "MODE / ACCESSOIRES",
    children: [
      { label: "Lunettes de soleil" },
      { label: "Ceintures" },
      { label: "Écharpes & Foulards" },
      { label: "Chapeaux" },
      { label: "Portefeuilles" },
    ],
  },
];


// ─── Country / City API helpers ───

const fetchCountries = async (): Promise<string[]> => {
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries");
    const json = await res.json();
    if (!json.error && json.data) {
      return (json.data as { country: string }[]).map((c) => c.country).sort((a, b) => a.localeCompare(b, "fr"));
    }
  } catch (e) { console.error("Failed to fetch countries:", e); }
  return [];
};

const fetchCities = async (country: string): Promise<string[]> => {
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country }),
    });
    const json = await res.json();
    if (!json.error && json.data) {
      return (json.data as string[]).sort((a, b) => a.localeCompare(b, "fr"));
    }
  } catch (e) { console.error("Failed to fetch cities:", e); }
  return [];
};

// ─── Searchable Dropdown ───

const SearchableDropdown = ({
  label, placeholder, items, value, onChange, loading, disabled, error,
}: {
  label: string; placeholder: string; items: string[]; value: string;
  onChange: (v: string) => void; loading?: boolean; disabled?: boolean; error?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = search ? items.filter((i) => i.toLowerCase().includes(search.toLowerCase())) : items;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button disabled={disabled} className={`w-full flex items-center justify-between border-b py-3 text-left bg-transparent transition-colors disabled:opacity-50 ${error ? "border-destructive text-destructive" : "border-primary/30 focus:border-primary"} ${value ? "text-foreground" : "text-muted-foreground"}`}>
            <span className="truncate">{loading ? "Chargement..." : value || placeholder}</span>
            {loading ? <Loader2 size={16} className="animate-spin text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border border-border shadow-lg z-50" align="start" sideOffset={4}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input className="flex-1 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-60 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{items.length === 0 ? "Aucune donnée" : "Aucun résultat"}</p>
            ) : (
              <div className="py-1">
                {filtered.map((item) => (
                  <button key={item} onClick={() => { onChange(item); setOpen(false); setSearch(""); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${value === item ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}>{item}</button>
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

// ─── Main Component ───

const NeeditMission = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  // Step management: 1=location/timing, 2=product category, 3=photo, 4=description
  const [step, setStep] = useState(1);

  // Step 1 state
  const [pays, setPays] = useState("");
  const [ville, setVille] = useState("");
  const [timing, setTiming] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  // Step 2 state — category breadcrumb navigation
  const [categoryPath, setCategoryPath] = useState<CategoryNode[]>([]);
  const [selectedLeaf, setSelectedLeaf] = useState("");
  const [isUnlisted, setIsUnlisted] = useState(false);
  const [unlistedName, setUnlistedName] = useState("");

  // Step 3 state — photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Step 4 state — description
  const [dimension, setDimension] = useState("");
  const [poids, setPoids] = useState("");
  const [prixMax, setPrixMax] = useState("");
  const [eanCode, setEanCode] = useState("");

  useEffect(() => {
    fetchCountries().then((data) => { setCountries(data); setLoadingCountries(false); });
  }, []);

  // Load existing mission for editing
  useEffect(() => {
    if (!editId || !user) return;
    const loadMission = async () => {
      const { data, error } = await supabase
        .from("needit_missions")
        .select("*")
        .eq("id", editId)
        .eq("user_id", user.id)
        .single();
      if (error || !data) {
        toast.error("Mission introuvable");
        navigate("/mes-missions-needit");
        return;
      }
      if (data.status !== "pending") {
        toast.error("Seules les missions en attente peuvent être modifiées");
        navigate("/mes-missions-needit");
        return;
      }
      // Populate fields
      setPays(data.country || "");
      setVille(data.city || "");
      setTiming(data.timing || "");
      setIsUnlisted(data.is_unlisted || false);
      setUnlistedName(data.unlisted_description || data.product_name || "");
      setSelectedLeaf(data.is_unlisted ? "" : (data.product_name || ""));
      setPhotoPreview(data.photo_url || null);
      setDimension(data.dimension || "");
      setPoids(data.poids || "");
      setPrixMax(data.prix_max || "");
      setEanCode(data.ean_code || "");
      // Load cities for the country
      if (data.country) {
        setLoadingCities(true);
        fetchCities(data.country).then((c) => { setCities(c); setLoadingCities(false); });
      }
      setLoadingEdit(false);
    };
    loadMission();
  }, [editId, user]);

  const handleCountryChange = useCallback((country: string) => {
    setPays(country); setVille(""); setCities([]);
    if (errors.pays) setErrors((p) => { const n = { ...p }; delete n.pays; return n; });
    if (country) { setLoadingCities(true); fetchCities(country).then((data) => { setCities(data); setLoadingCities(false); }); }
  }, [errors.pays]);

  // ─── Current level of categories ───
  const currentCategories = (): CategoryNode[] => {
    if (categoryPath.length === 0) return PRODUCT_CATEGORIES;
    const last = categoryPath[categoryPath.length - 1];
    return last.children || [];
  };

  const handleCategorySelect = (node: CategoryNode) => {
    if (node.children && node.children.length > 0) {
      setCategoryPath((p) => [...p, node]);
      setSelectedLeaf("");
    } else {
      setSelectedLeaf(node.label);
    }
  };

  const handleCategoryBack = () => {
    setCategoryPath((p) => p.slice(0, -1));
    setSelectedLeaf("");
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ─── Validation per step ───
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!pays.trim()) e.pays = "Pays requis";
    if (!timing) e.timing = "Veuillez choisir une option";
    setErrors(e);
    if (Object.keys(e).length > 0) { toast.error("Veuillez compléter les champs requis"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!selectedLeaf && !isUnlisted) { toast.error("Veuillez sélectionner un produit ou choisir 'Produit non référencé'"); return false; }
    if (isUnlisted && !unlistedName.trim()) { toast.error("Veuillez décrire le produit"); return false; }
    return true;
  };

  const handleNext = async () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3) setStep(4);
    else if (step === 4) {
      if (!user) { toast.error("Vous devez être connecté"); return; }
      setSubmitting(true);
      try {
        // Upload photo if exists
        let photo_url: string | null = null;
        if (photoFile) {
          const ext = photoFile.name.split(".").pop();
          const path = `${user.id}/${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("shipment-photos")
            .upload(path, photoFile);
          if (!uploadErr) {
            // Use signed URL for private bucket access
            const { data: signedData } = await supabase.storage
              .from("shipment-photos")
              .createSignedUrl(path, 60 * 60 * 24 * 90); // 90 days expiry
            photo_url = signedData?.signedUrl ?? null;
          }
        }

        const pathLabels = categoryPath.map((n) => n.label);
        if (selectedLeaf) pathLabels.push(selectedLeaf);

        const missionData = {
          country: pays,
          city: ville || null,
          timing,
          category_path: pathLabels.length > 0 ? pathLabels : undefined,
          product_name: isUnlisted ? unlistedName : selectedLeaf,
          is_unlisted: isUnlisted,
          unlisted_description: isUnlisted ? unlistedName : null,
          photo_url: photo_url ?? photoPreview,
          dimension: dimension || null,
          poids: poids || null,
          prix_max: prixMax || null,
          ean_code: eanCode || null,
        };

        if (editId) {
          // Update existing mission
          const { error } = await supabase
            .from("needit_missions")
            .update(missionData as any)
            .eq("id", editId)
            .eq("user_id", user.id);
          if (error) throw error;
          successFeedback("Mission mise à jour !", { description: "Les changements sont enregistrés." });
        } else {
          // Create new mission
          const { data: inserted, error } = await supabase.from("needit_missions").insert({
            user_id: user.id,
            ...missionData,
          } as any).select("id").single();
          if (error) throw error;
          // Trigger match notifications
          supabase.functions.invoke("notify-match", { body: { type: "mission", record_id: inserted.id } }).catch(() => {});
          successFeedback("Mission NeedIt créée !", { description: "Nous cherchons un voyageur sur cet axe…" });
        }
        navigate("/mes-missions-needit");
      } catch (err: any) {
        console.error(err);
        toast.error(editId ? "Erreur lors de la mise à jour" : "Erreur lors de la création de la mission");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step === 1) navigate(editId ? "/mes-missions-needit" : "/dashboard");
    else if (step === 2 && categoryPath.length > 0) handleCategoryBack();
    else setStep((s) => s - 1);
  };

  // ─── Step title ───
  const stepTitle = () => {
    if (step === 1) return "Information NeedIt";
    if (step === 2) return categoryPath.length === 0 ? "Produits" : "Information Produits";
    if (step === 3) return "Information NeedIt";
    return "Information NeedIt";
  };

  return (
    <div className="flex min-h-screen flex-col bg-primary relative overflow-hidden">
      {/* Header decorations */}
      <div className="absolute top-12 left-1/2 -translate-x-1/3 w-40 h-40 rounded-full bg-primary-foreground/10" />
      <div className="absolute top-28 right-10 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-foreground/20" />
        ))}
      </div>

      <div className="relative z-10 px-6 pt-12 pb-6">
        <h1 className="text-4xl font-bold text-primary-foreground leading-tight">{editId ? "Modifier" : "NeedIt"}<br />Missions</h1>
      </div>

      <div className="relative z-10 flex-1 bg-card rounded-t-3xl px-6 pt-8 pb-24 overflow-y-auto">
        {loadingEdit ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
        <>
        <h2 className="text-2xl font-bold text-foreground text-center mb-6">{stepTitle()}</h2>

        {/* ═══ STEP 1: Location & Timing ═══ */}
        {step === 1 && (
          <>
            <h3 className="text-lg text-muted-foreground mb-3">à Partir d'ou ?</h3>
            <div className="space-y-4 mb-8">
              <SearchableDropdown label="Pays" placeholder="Sélectionnez un pays" items={countries} value={pays} onChange={handleCountryChange} loading={loadingCountries} error={errors.pays} />
              <SearchableDropdown label="Ville (facultatif)" placeholder="Sélectionnez une ville" items={cities} value={ville} onChange={(v) => setVille(v)} loading={loadingCities} disabled={!pays} />
            </div>
            <h3 className="text-lg text-muted-foreground mb-3">Quand ?</h3>
            {errors.timing && <p className="text-xs text-destructive mb-2">{errors.timing}</p>}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <Checkbox checked={timing === "asap"} onCheckedChange={() => { setTiming("asap"); if (errors.timing) setErrors((p) => { const n = { ...p }; delete n.timing; return n; }); }} />
                <span className="text-foreground">dès que possible</span>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox checked={timing === "date"} onCheckedChange={() => { setTiming("date"); if (errors.timing) setErrors((p) => { const n = { ...p }; delete n.timing; return n; }); }} />
                <span className="text-foreground">à partir de la date indiquée ci dessus.</span>
              </div>
            </div>
          </>
        )}

        {/* ═══ STEP 2: Product Category Selection ═══ */}
        {step === 2 && !isUnlisted && (
          <>
            {/* Breadcrumb path */}
            {categoryPath.length > 0 && (
              <div className="space-y-2 mb-6">
                {categoryPath.map((node, i) => (
                  <button
                    key={i}
                    onClick={() => { setCategoryPath((p) => p.slice(0, i + 1)); setSelectedLeaf(""); }}
                    className="block w-full text-center py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                    style={{ marginLeft: `${i * 16}px`, width: `calc(100% - ${i * 16}px)` }}
                  >
                    {node.label}
                  </button>
                ))}
              </div>
            )}

            {/* Current level items */}
            <div className="space-y-2 mb-6" style={{ marginLeft: `${categoryPath.length * 16}px` }}>
              {currentCategories().map((node) => (
                <button
                  key={node.label}
                  onClick={() => handleCategorySelect(node)}
                  className={`block w-full text-center py-3 border rounded-xl text-sm font-medium transition-colors ${
                    selectedLeaf === node.label
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  {node.label}
                </button>
              ))}
            </div>

            {/* Produit non référencé button */}
            <button
              onClick={() => { setIsUnlisted(true); setSelectedLeaf(""); setCategoryPath([]); }}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-full bg-[hsl(var(--chart-4))] text-primary-foreground text-lg font-medium mb-4"
            >
              Produit non référencé <ArrowRight size={20} />
            </button>
          </>
        )}

        {/* Unlisted product form */}
        {step === 2 && isUnlisted && (
          <div className="space-y-4 mb-6">
            <p className="text-muted-foreground">Décrivez le produit que vous recherchez :</p>
            <Input placeholder="Nom du produit" value={unlistedName} onChange={(e) => setUnlistedName(e.target.value)} />
          </div>
        )}

        {/* ═══ STEP 3: Photo Upload ═══ */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-6 mb-8">
            {photoPreview ? (
              <img src={photoPreview} alt="Produit" className="max-h-72 rounded-2xl object-contain" />
            ) : (
              <>
                <h3 className="text-xl font-semibold text-foreground text-left w-full">Ajouter une photo / image du produit</h3>
                <label className="w-full max-w-xs flex items-center justify-center py-6 rounded-2xl bg-accent text-accent-foreground cursor-pointer hover:opacity-90 transition-opacity shadow-lg">
                  <Camera size={48} />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </>
            )}
            {photoPreview && (
              <label className="text-sm text-primary underline cursor-pointer">
                Changer la photo
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            )}

            {/* EAN Scanner for demandeur */}
            <div className="w-full mt-2">
              <div className="flex items-center gap-2 mb-3">
                <ScanBarcode size={18} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Code-barres EAN (optionnel)</h3>
              </div>
              {eanCode ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <ScanBarcode size={16} className="text-primary shrink-0" />
                  <span className="text-sm font-mono text-foreground flex-1">{eanCode}</span>
                  <button onClick={() => setEanCode("")} className="text-xs text-destructive">Retirer</button>
                </div>
              ) : (
                <EanScanner
                  mode="scan"
                  onProductFound={(product) => {
                    setEanCode(product.ean_code);
                    if (product.product_name && !selectedLeaf && !unlistedName) {
                      setUnlistedName(product.product_name);
                      setIsUnlisted(true);
                    }
                    if (product.weight && !poids) {
                      setPoids(product.weight);
                    }
                  }}
                />
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Scannez le code-barres pour que le voyageur puisse vérifier le bon produit en magasin.
              </p>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Product Description ═══ */}
        {step === 4 && (
          <>
            <h3 className="text-xl text-muted-foreground mb-6">Décrivez le ou les produits ?</h3>
            {(() => {
              const currency = getCurrencyForCountry(pays);
              const units = getUnitsForCountry(pays);
              return (
                <>
                  <div className="space-y-4 mb-4">
                    <div className="relative">
                      <Input placeholder={units.dimensionPlaceholder} value={dimension} onChange={(e) => setDimension(e.target.value)} className="border-0 border-b border-primary/30 rounded-none px-0 pr-12 focus-visible:ring-0 focus-visible:border-primary" />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{units.dimension}</span>
                    </div>
                    <div className="relative">
                      <Input placeholder={units.weightPlaceholder} value={poids} onChange={(e) => setPoids(e.target.value)} className="border-0 border-b border-primary/30 rounded-none px-0 pr-12 focus-visible:ring-0 focus-visible:border-primary" />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{units.weight}</span>
                    </div>
                    <div className="relative">
                      <Input placeholder={`Prix max autorisé (${currency.code})`} value={prixMax} onChange={(e) => setPrixMax(e.target.value)} className="border-0 border-b border-primary/30 rounded-none px-0 pr-12 focus-visible:ring-0 focus-visible:border-primary" />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{currency.symbol}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    *Le montant de l'achat peut être en dessous du prix max autorisé dans ce cas vous recevrez la différence.<br />
                    Le débit se fait automatiquement au moment de l'achat par le voyageur. Montant en {currency.code} ({currency.symbol}).
                  </p>
                </>
              );
            })()}
          </>
        )}

        {/* ─── Navigation buttons ─── */}
        <div className="flex items-center justify-between pt-4">
          <button onClick={handleBack} className="text-lg text-muted-foreground hover:text-foreground transition-colors">
            Retour
          </button>
          <button onClick={handleNext} disabled={submitting} className="flex items-center gap-2 px-8 py-3 rounded-full bg-accent text-accent-foreground text-lg font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50">
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <>{step === 4 ? (editId ? "Enregistrer" : "Valider") : "Continuer"} <ArrowRight size={20} /></>}
          </button>
        </div>
        </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default NeeditMission;
