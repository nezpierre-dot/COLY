import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronDown, Loader2, Search, Camera, ScanBarcode, Info, Heart, MapPin, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { successFeedback } from "@/lib/successFeedback";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrencyForCountry, getUnitsForCountry } from "@/hooks/useLocaleUnits";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EanScanner from "@/components/EanScanner";
import { useTranslation } from "@/hooks/useTranslation";
import { localizeCountry } from "@/lib/geoLocalization";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import ReminderDialog, { type ReminderInfo } from "@/components/ReminderDialog";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecentLocations, POPULAR_COUNTRIES } from "@/hooks/useRecentLocations";

type CategoryNode = { label: string; children?: CategoryNode[]; };

// Categories stay in French for now, or could be translated with keys
const PRODUCT_CATEGORIES: CategoryNode[] = [
  { label: "ALIMENTATION / BOISSONS", children: [{ label: "Épicerie fine" }, { label: "Produits secs / Conserves" }] },
  { label: "HIGH-TECH / ÉLECTRONIQUE", children: [{ label: "Smartphones" }, { label: "Ordinateurs" }] },
  // ... (rest of categories, simplified for brevity but logic handles full tree)
];

const fetchCountries = async (): Promise<string[]> => {
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries");
    const json = await res.json();
    return json.data ? (json.data as { country: string }[]).map((c) => c.country).sort() : [];
  } catch { return []; }
};

const fetchCities = async (country: string): Promise<string[]> => {
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries/cities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country }) });
    const json = await res.json();
    return json.data ? (json.data as string[]).sort() : [];
  } catch { return []; }
};

const SearchableDropdown = ({ label, placeholder, items, value, onChange, loading, disabled, error, displayFn, popularItems = [], recentItems = [] }: any) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const display = displayFn ?? ((v: string) => v);
  const filtered = search ? items.filter((i: string) => i.toLowerCase().includes(search.toLowerCase()) || display(i).toLowerCase().includes(search.toLowerCase())) : items;
  const validPopular = popularItems.filter((p: string) => items.includes(p));
  const validRecent = recentItems.filter((r: string) => items.includes(r) && !validPopular.includes(r));
  const hasSearch = search.length > 0;
  const showSections = !hasSearch && (validPopular.length > 0 || validRecent.length > 0);
  const remaining = !hasSearch ? items.filter((o: string) => !validPopular.includes(o) && !validRecent.includes(o)).slice(0, 30) : [];
  const renderBtn = (item: string) => (
    <button key={item} onClick={() => { onChange(item); setOpen(false); setSearch(""); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted">{display(item)}</button>
  );
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button disabled={disabled} className={`w-full flex items-center justify-between border-b py-3 text-left bg-transparent transition-colors disabled:opacity-50 ${error ? "border-destructive text-destructive" : "border-primary/30 focus:border-primary"} ${value ? "text-foreground" : "text-muted-foreground"}`}>
            <span className="truncate">{loading ? "Chargement..." : value ? display(value) : placeholder}</span>
            {loading ? <Loader2 size={16} className="animate-spin text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border border-border shadow-lg z-50" align="start">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border"><Search size={14} /><input className="flex-1 text-sm bg-transparent focus:outline-none" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus /></div>
          <div className="max-h-60 overflow-y-auto">
            {hasSearch ? (
              filtered.length === 0 ? <div className="px-4 py-2.5 text-sm text-muted-foreground">Aucun résultat</div> : filtered.slice(0, 50).map(renderBtn)
            ) : showSections ? (
              <>
                {validRecent.length > 0 && (<><div className="px-4 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Récents</div>{validRecent.map(renderBtn)}</>)}
                {validPopular.length > 0 && (<><div className="px-4 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Populaires</div>{validPopular.map(renderBtn)}</>)}
                {remaining.length > 0 && (<><div className="px-4 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">A – Z</div>{remaining.map(renderBtn)}</>)}
              </>
            ) : filtered.slice(0, 50).map(renderBtn)}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

const NeeditMission = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addProduct } = useFavorites();
  const { t } = useTranslation();
  const { language } = useLanguagePreference();
  const countryDisplay = useCallback((v: string) => localizeCountry(v, language), [language]);
  const { recentCountries, getRecentCitiesForCountry } = useRecentLocations();
  const [submitting, setSubmitting] = useState(false);
  const [createdReminderInfo, setCreatedReminderInfo] = useState<ReminderInfo | null>(null);
  const [showCustomsWarning, setShowCustomsWarning] = useState(false);
  const [customsAccepted, setCustomsAccepted] = useState(false);
  const [showReminderPrompt, setShowReminderPrompt] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [step, setStep] = useState(1);
  const [pays, setPays] = useState("");
  const [ville, setVille] = useState("");
  const [timing, setTiming] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [categoryPath, setCategoryPath] = useState<CategoryNode[]>([]);
  const [selectedLeaf, setSelectedLeaf] = useState("");
  const [isUnlisted, setIsUnlisted] = useState(false);
  const [unlistedName, setUnlistedName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [dimension, setDimension] = useState("");
  const [poids, setPoids] = useState("");
  const [prixMax, setPrixMax] = useState("");
  const [eanCode, setEanCode] = useState("");
  const [autoAccept, setAutoAccept] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupAccessCode, setPickupAccessCode] = useState("");
  useEffect(() => { fetchCountries().then((data) => { setCountries(data); setLoadingCountries(false); }); }, []);

  useEffect(() => {
    if (!editId || !user) return;
    const loadMission = async () => {
      const { data, error } = await supabase.from("needit_missions").select("*").eq("id", editId).eq("user_id", user.id).single();
      if (error || !data) { toast.error(t("needit.notFound")); navigate("/mes-missions-needit"); return; }
      if (data.status !== "pending") { toast.error(t("needit.onlyPendingEdit")); navigate("/mes-missions-needit"); return; }
      setPays(data.country || ""); setVille(data.city || ""); setTiming(data.timing || ""); setIsUnlisted(data.is_unlisted || false);
      setUnlistedName(data.unlisted_description || data.product_name || ""); setSelectedLeaf(data.is_unlisted ? "" : (data.product_name || ""));
      setPhotoPreview(data.photo_url || null); setDimension(data.dimension || ""); setPoids(data.poids || ""); setPrixMax(data.prix_max || ""); setEanCode(data.ean_code || "");
      setAutoAccept((data as any).auto_accept ?? false);
      setPickupAddress((data as any).pickup_address || "");
      setPickupAccessCode((data as any).pickup_access_code || "");
      if (data.country) { setLoadingCities(true); fetchCities(data.country).then((c) => { setCities(c); setLoadingCities(false); }); }
      setLoadingEdit(false);
    };
    loadMission();
  }, [editId, user]);

  const handleCountryChange = useCallback((country: string) => {
    setPays(country); setVille(""); setCities([]);
    if (errors.pays) setErrors((p) => { const n = { ...p }; delete n.pays; return n; });
    if (country) { setLoadingCities(true); fetchCities(country).then((data) => { setCities(data); setLoadingCities(false); }); }
  }, [errors.pays]);

  const currentCategories = () => (categoryPath.length === 0 ? PRODUCT_CATEGORIES : categoryPath[categoryPath.length - 1].children || []);
  const handleCategorySelect = (node: CategoryNode) => { if (node.children) { setCategoryPath((p) => [...p, node]); setSelectedLeaf(""); } else setSelectedLeaf(node.label); };
  const handleCategoryBack = () => { setCategoryPath((p) => p.slice(0, -1)); setSelectedLeaf(""); };
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setPhotoFile(file); const reader = new FileReader(); reader.onloadend = () => setPhotoPreview(reader.result as string); reader.readAsDataURL(file); } };

  const validateStep1 = () => {
    const e: Record<string, string> = {}; if (!pays.trim()) e.pays = t("needit.countryReq"); if (!ville.trim()) e.ville = t("needit.cityReq") || "La ville est obligatoire"; if (!timing) e.timing = t("needit.timingReq");
    setErrors(e); if (Object.keys(e).length > 0) { toast.error(t("sendcoly.fillRequired")); return false; } return true;
  };
  const validateStep2 = () => {
    if (!selectedLeaf && !isUnlisted) { toast.error(t("needit.selectProduct")); return false; }
    if (isUnlisted && !unlistedName.trim()) { toast.error(t("needit.describeProduct")); return false; } return true;
  };

  const handleNext = async () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) {
      if (!customsAccepted) {
        setShowCustomsWarning(true);
        return;
      }
      setStep(3);
    }
    else if (step === 3) setStep(4);
    else if (step === 4) {
      if (!prixMax.trim()) { setErrors({ prixMax: t("needit.budgetRequired") }); toast.error(t("needit.budgetRequired")); return; }
      const finalPrixMax = prixMax === "__devis__" ? "Sur devis" : prixMax;
      if (!user) { toast.error(t("needit.mustBeLoggedIn")); return; }
      setSubmitting(true);
      try {
        let photo_url: string | null = null;
        if (photoFile) {
          const ext = photoFile.name.split(".").pop(); const path = `${user.id}/${Date.now()}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("shipment-photos").upload(path, photoFile);
          if (!uploadErr) { const { data } = await supabase.storage.from("shipment-photos").createSignedUrl(path, 60 * 60 * 24 * 90); photo_url = data?.signedUrl ?? null; }
        }
        const pathLabels = categoryPath.map((n) => n.label); if (selectedLeaf) pathLabels.push(selectedLeaf);
        const missionData = { country: pays, city: ville || null, timing, category_path: pathLabels.length > 0 ? pathLabels : undefined, product_name: isUnlisted ? unlistedName : selectedLeaf, is_unlisted: isUnlisted, unlisted_description: isUnlisted ? unlistedName : null, photo_url: photo_url ?? photoPreview, dimension: dimension || null, poids: poids || null, prix_max: finalPrixMax || null, ean_code: eanCode || null, auto_accept: autoAccept, pickup_address: pickupAddress || null, pickup_access_code: pickupAccessCode || null };
        if (editId) {
          await supabase.from("needit_missions").update(missionData as any).eq("id", editId).eq("user_id", user.id);
          successFeedback(t("needit.missionUpdated"), { description: t("needit.missionUpdatedDesc") });
          navigate("/mes-missions-needit");
        } else {
          const { data: inserted } = await supabase.from("needit_missions").insert({ user_id: user.id, ...missionData } as any).select("id").single();
          supabase.functions.invoke("notify-match", { body: { type: "mission", record_id: inserted.id } }).catch(() => {});
          successFeedback(t("needit.missionCreated"), { description: t("needit.missionCreatedDesc") });
          setCreatedReminderInfo({
            itemType: "needit_mission",
            itemId: inserted.id,
            departureCity: ville || pays,
            arrivalCity: pays,
            departureDate: new Date().toISOString().split("T")[0],
          });
          setShowReminderPrompt(true);
        }
      } catch { toast.error(editId ? t("needit.updateError") : t("needit.createError")); } finally { setSubmitting(false); }
    }
  };

  const handleBack = () => { if (step === 1) navigate(editId ? "/mes-missions-needit" : "/dashboard"); else if (step === 2 && categoryPath.length > 0) handleCategoryBack(); else setStep((s) => s - 1); };
  const stepTitle = () => step === 1 ? t("needit.infoTitle") : step === 2 ? (categoryPath.length === 0 ? t("needit.products") : t("needit.productInfo")) : t("needit.infoTitle");

  return (
    <div className="flex min-h-screen flex-col bg-primary relative overflow-hidden">
      <div className="absolute top-12 left-1/2 -translate-x-1/3 w-40 h-40 rounded-full bg-primary-foreground/10" />
      <div className="relative z-10 px-6 pt-12 pb-6"><h1 className="text-4xl font-bold text-primary-foreground leading-tight">{editId ? t("needit.editTitle") : "NeedIt"}<br />{t("needit.missionWord")}</h1></div>
      <div className="relative z-10 flex-1 bg-card rounded-t-3xl px-6 pt-8 pb-24 overflow-y-auto">
        {loadingEdit ? <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-primary" /></div> : (
          <>
            <h2 className="text-2xl font-bold text-foreground text-center mb-6">{stepTitle()}</h2>
            {step === 1 && (
              <>
                <h3 className="text-lg text-muted-foreground mb-3">{t("needit.fromWhere")}</h3>
                <div className="space-y-4 mb-8">
                  <SearchableDropdown label={t("sendcoly.country")} placeholder={t("trip.selectCountry")} items={countries} value={pays} onChange={handleCountryChange} loading={loadingCountries} error={errors.pays} displayFn={countryDisplay} popularItems={POPULAR_COUNTRIES} recentItems={recentCountries} />
                  <SearchableDropdown label={t("sendcoly.city")} placeholder={t("trip.selectCity")} items={cities} value={ville} onChange={(v: string) => { setVille(v); if (errors.ville) setErrors((p) => { const n = { ...p }; delete n.ville; return n; }); }} loading={loadingCities} disabled={!pays} error={errors.ville} recentItems={getRecentCitiesForCountry(pays)} />
                </div>
                <h3 className="text-lg text-muted-foreground mb-3">{t("needit.when")}</h3>
                {errors.timing && <p className="text-xs text-destructive mb-2">{errors.timing}</p>}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3"><Checkbox checked={timing === "asap"} onCheckedChange={() => setTiming("asap")} /><span className="text-foreground">{t("needit.asap")}</span></div>
                  <div className="flex items-center gap-3"><Checkbox checked={timing === "date"} onCheckedChange={() => setTiming("date")} /><span className="text-foreground">{t("needit.fromDate")}</span></div>
                </div>
              </>
            )}
            {step === 2 && !isUnlisted && (
              <>
                {categoryPath.length > 0 && <div className="space-y-2 mb-6">{categoryPath.map((node, i) => (<button key={i} onClick={() => { setCategoryPath((p) => p.slice(0, i + 1)); setSelectedLeaf(""); }} className="block w-full text-center py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">{node.label}</button>))}</div>}
                <div className="space-y-2 mb-6">{currentCategories().map((node) => (<button key={node.label} onClick={() => handleCategorySelect(node)} className={`block w-full text-center py-3 border rounded-xl text-sm font-medium transition-colors ${selectedLeaf === node.label ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-muted/50"}`}>{node.label}</button>))}</div>
                <button onClick={() => { setIsUnlisted(true); setSelectedLeaf(""); setCategoryPath([]); }} className="w-full flex items-center justify-center gap-3 py-4 rounded-full bg-[hsl(var(--chart-4))] text-primary-foreground text-lg font-medium mb-4">{t("needit.unlistedProduct")} <ArrowRight size={20} /></button>
              </>
            )}
            {step === 2 && isUnlisted && (
              <div className="space-y-4 mb-6"><p className="text-muted-foreground">{t("needit.describeSearch")}</p><Input placeholder={t("needit.productName")} value={unlistedName} onChange={(e) => setUnlistedName(e.target.value)} /></div>
            )}
            {step === 3 && (
              <div className="flex flex-col items-center gap-6 mb-8">
                {photoPreview ? <img src={photoPreview} alt="Produit" className="max-h-72 rounded-2xl object-contain" /> : <><h3 className="text-xl font-semibold text-foreground text-left w-full">{t("needit.addPhoto")}</h3><label className="w-full max-w-xs flex items-center justify-center py-6 rounded-2xl bg-accent text-accent-foreground cursor-pointer hover:opacity-90 transition-opacity shadow-lg"><Camera size={48} /><input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} /></label></>}
                {photoPreview && <label className="text-sm text-primary underline cursor-pointer">{t("needit.changePhoto")}<input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} /></label>}
                <div className="w-full mt-2">
                  <div className="flex items-center gap-2 mb-3"><ScanBarcode size={18} className="text-primary" /><h3 className="text-sm font-semibold text-foreground">{t("needit.eanOptional")}</h3></div>
                  {eanCode ? <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20"><ScanBarcode size={16} className="text-primary shrink-0" /><span className="text-sm font-mono text-foreground flex-1">{eanCode}</span><button onClick={() => setEanCode("")} className="text-xs text-destructive">{t("needit.remove")}</button></div> : <EanScanner mode="scan" onProductFound={(p) => { setEanCode(p.ean_code); if (p.product_name && !selectedLeaf && !unlistedName) { setUnlistedName(p.product_name); setIsUnlisted(true); } if (p.weight && !poids) setPoids(p.weight); }} />}
                  <p className="text-xs text-muted-foreground mt-2">{t("needit.eanHelp")}</p>
                </div>
              </div>
            )}
            {step === 4 && (
              <>
                <h3 className="text-xl text-muted-foreground mb-6">{t("needit.describeProducts")}</h3>
                {(() => {
                  const currency = getCurrencyForCountry(pays);
                  const units = getUnitsForCountry(pays);
                  return (
                    <>
                      <div className="space-y-4 mb-4">
                        <div className="relative"><Input placeholder={units.dimensionPlaceholder} value={dimension} onChange={(e) => setDimension(e.target.value)} className="border-0 border-b border-primary/30 rounded-none px-0 pr-12 focus-visible:ring-0 focus-visible:border-primary" /><span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{units.dimension}</span></div>
                        <div className="relative"><Input placeholder={units.weightPlaceholder} value={poids} onChange={(e) => setPoids(e.target.value)} className="border-0 border-b border-primary/30 rounded-none px-0 pr-12 focus-visible:ring-0 focus-visible:border-primary" /><span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{units.weight}</span></div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <p className="text-xs text-muted-foreground">{t("needit.budgetLabel")} <span className="text-destructive">*</span></p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild><Info size={12} className="text-muted-foreground cursor-help" /></TooltipTrigger>
                                <TooltipContent className="max-w-[250px] text-xs">{t("needit.budgetTooltip")}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="space-y-2">
                            <button onClick={() => { setPrixMax(prixMax === "__devis__" ? "" : prixMax); if (prixMax === "__devis__") setPrixMax(""); }} className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${prixMax && prixMax !== "__devis__" ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"}`}>
                              <p className="font-medium text-foreground">Tarif fixe</p>
                              <p className="text-xs text-muted-foreground">Vous définissez le budget maximum</p>
                            </button>
                            {prixMax !== "__devis__" && (
                              <div className="relative pl-4">
                                <Input placeholder={`${t("missions.priceMax")} (${currency.code})`} value={prixMax} onChange={(e) => { setPrixMax(e.target.value); if (errors.prixMax) setErrors(p => { const n = {...p}; delete n.prixMax; return n; }); }} className={`border-0 border-b rounded-none px-0 pr-12 focus-visible:ring-0 ${errors.prixMax ? "border-destructive" : "border-primary/30 focus-visible:border-primary"}`} />
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{currency.symbol}</span>
                              </div>
                            )}
                            <button onClick={() => setPrixMax("__devis__")} className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${prixMax === "__devis__" ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"}`}>
                              <p className="font-medium text-foreground">Sur devis</p>
                              <p className="text-xs text-muted-foreground">Le voyageur proposera un prix</p>
                            </button>
                          </div>
                          {errors.prixMax && <p className="text-xs mt-1" style={{ color: "#FF453A" }}>{errors.prixMax}</p>}
                        </div>
                      </div>

                      {/* Auto accept toggle */}
                      <div className="flex items-center justify-between bg-muted/50 rounded-2xl p-4 mb-4">
                        <div className="flex-1 mr-3">
                          <p className="text-sm font-semibold text-foreground">{t("needit.autoAcceptLabel")}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t("needit.autoAcceptHint")}</p>
                        </div>
                        <Switch checked={autoAccept} onCheckedChange={setAutoAccept} className="data-[state=checked]:bg-[#0D84FF]" />
                      </div>

                      {/* Pickup address fields */}
                      <div className="space-y-3 mb-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <MapPin size={14} className="text-primary" /> Adresse de récupération
                        </h4>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <p className="text-xs text-muted-foreground">Adresse complète <span className="text-destructive">*</span></p>
                          </div>
                          <Input
                            placeholder="Ex : 12 rue de la Paix, 75002 Paris"
                            value={pickupAddress}
                            onChange={(e) => { setPickupAddress(e.target.value); if (errors.pickupAddress) setErrors(p => { const n = {...p}; delete n.pickupAddress; return n; }); }}
                            className={`border-0 border-b rounded-none px-0 focus-visible:ring-0 ${errors.pickupAddress ? "border-destructive" : "border-primary/30 focus-visible:border-primary"}`}
                          />
                          {errors.pickupAddress && <p className="text-xs mt-1 text-destructive">{errors.pickupAddress}</p>}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Code d'accès / étage / interphone (optionnel)</p>
                          <Input
                            placeholder="Ex : Bât. B, 3ème étage, code 1234"
                            value={pickupAccessCode}
                            onChange={(e) => setPickupAccessCode(e.target.value)}
                            className="border-0 border-b border-primary/30 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                          />
                        </div>
                      </div>
                      {prixMax && (
                        <div className="text-center mb-2">
                          <span className="text-lg font-bold" style={{ color: "#30D158" }}>{prixMax === "__devis__" ? "Sur devis" : `${t("needit.budgetMax")} : ${prixMax} ${currency.symbol}`}</span>
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t("needit.priceNote")}<br />{t("needit.debitNote")}</p>

                      {/* Save as favorite product */}
                      {!editId && (
                        <button
                          type="button"
                          onClick={async () => {
                            const pathLabels = categoryPath.map((n) => n.label);
                            if (selectedLeaf) pathLabels.push(selectedLeaf);
                            await addProduct({
                              product_name: isUnlisted ? (unlistedName || "Produit") : (selectedLeaf || "Produit"),
                              country: pays,
                              city: ville || null,
                              category_path: pathLabels,
                              prix_max: prixMax || null,
                              poids: poids || null,
                              dimension: dimension || null,
                              photo_url: photoPreview || null,
                              ean_code: eanCode || null,
                              is_unlisted: isUnlisted,
                              unlisted_description: isUnlisted ? unlistedName : null,
                            });
                            toast.success(t("favorites.productSaved"));
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent/10 text-accent font-semibold text-sm hover:bg-accent/20 transition-colors mb-2"
                        >
                          <Heart size={16} /> {t("favorites.saveProduct")}
                        </button>
                      )}
                    </>
                  );
                })()}
              </>
            )}
            <div className="flex items-center justify-between pt-4">
              <button onClick={handleBack} className="text-lg text-muted-foreground hover:text-foreground transition-colors">{t("common.back")}</button>
              <button onClick={handleNext} disabled={submitting} className="flex items-center gap-2 px-8 py-3 rounded-full text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50" style={{ backgroundColor: "#30D158" }}>{submitting ? <Loader2 size={20} className="animate-spin" /> : <>{step === 4 ? (editId ? t("needit.save") : t("needit.validate")) : t("common.next")} <ArrowRight size={20} /></>}</button>
            </div>
          </>
        )}
      </div>
      <BottomNav />

      {createdReminderInfo && (
        <ReminderDialog
          info={createdReminderInfo}
          open={showReminderPrompt}
          onOpenChange={(open) => {
            setShowReminderPrompt(open);
            if (!open) navigate("/mes-missions-needit");
          }}
        />
      )}

      <Dialog open={showCustomsWarning} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle size={20} className="text-amber-500" /> ⚠️ Informations douanières
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2 leading-relaxed">
              Selon la destination, certains produits sont limités ou interdits (cigarettes max 200 unités hors UE, alcool, parfums, etc.). Vérifiez les quotas douaniers avant d'envoyer.
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={() => { setCustomsAccepted(true); setShowCustomsWarning(false); setStep(3); }}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm mt-2"
          >
            J'ai compris et je continue
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NeeditMission;
