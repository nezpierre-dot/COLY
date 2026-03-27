import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { fetchCitiesByCountry, getCountryISO } from "@/lib/citySearch";
import { getPopularCities } from "@/lib/popularCities";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Plane, Train, Car, Bus, Ship, Bike, Check, Loader2, Star } from "lucide-react";
import { localizeCountry } from "@/lib/geoLocalization";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { useTransportFeasibility } from "@/hooks/useTransportFeasibility";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { getCurrencyForCountry, getUnitsForCountry } from "@/hooks/useLocaleUnits";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { successFeedback } from "@/lib/successFeedback";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";
import ReminderDialog, { type ReminderInfo } from "@/components/ReminderDialog";
import SearchableSelect from "@/components/SearchableSelect";
import { useRecentLocations, POPULAR_COUNTRIES } from "@/hooks/useRecentLocations";
import { useFavorites } from "@/hooks/useFavorites";



const getTransportMethods = (t: (k: string) => string) => [
  { value: "avion", label: t("transport.avion"), icon: Plane },
  { value: "train", label: t("transport.train"), icon: Train },
  { value: "voiture", label: t("transport.voiture"), icon: Car },
  { value: "bus", label: t("transport.bus"), icon: Bus },
  { value: "bateau", label: t("transport.bateau"), icon: Ship },
  { value: "velo", label: t("transport.velo"), icon: Bike },
];

const CURRENCIES = [
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "CAD", symbol: "CA$" },
  { code: "CHF", symbol: "CHF" },
  { code: "MAD", symbol: "MAD" },
  { code: "XOF", symbol: "CFA" },
  { code: "XAF", symbol: "CFA" },
  { code: "DZD", symbol: "DZD" },
  { code: "TND", symbol: "TND" },
  { code: "INR", symbol: "₹" },
  { code: "JPY", symbol: "¥" },
  { code: "CNY", symbol: "¥" },
  { code: "BRL", symbol: "R$" },
  { code: "NGN", symbol: "₦" },
  { code: "ZAR", symbol: "R" },
  { code: "TRY", symbol: "₺" },
  { code: "AED", symbol: "AED" },
  { code: "SAR", symbol: "SAR" },
  { code: "AUD", symbol: "A$" },
  { code: "MXN", symbol: "MX$" },
  { code: "KRW", symbol: "₩" },
  { code: "RUB", symbol: "₽" },
  { code: "THB", symbol: "฿" },
];

const TOTAL_STEPS = 5;

const NewTrip = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language } = useLanguagePreference();
  const countryDisplay = useCallback((v: string) => localizeCountry(v, language), [language]);
  const { recentCountries, recentCities } = useRecentLocations();
  const { routes: favoriteRoutes, loadingRoutes: loadingFavorites } = useFavorites();
  const TRANSPORT_METHODS = getTransportMethods(t);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Step 1
  const [tripType, setTripType] = useState<"new" | "favorite" | null>(null);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(null);
  // Step 2 – Departure
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [departureCountry, setDepartureCountry] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [departureAddress, setDepartureAddress] = useState("");

  // Step 3 – Arrival
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [arrivalCity, setArrivalCity] = useState("");
  const [arrivalCountry, setArrivalCountry] = useState("");
  const [arrivalAddress, setArrivalAddress] = useState("");

  // Locale units based on arrival country
  const currency = useMemo(() => getCurrencyForCountry(arrivalCountry), [arrivalCountry]);
  const units = useMemo(() => getUnitsForCountry(arrivalCountry), [arrivalCountry]);

  // Countries & cities
  const [countries, setCountries] = useState<string[]>([]);
  const [departureCities, setDepartureCities] = useState<string[]>([]);
  const [arrivalCities, setArrivalCities] = useState<string[]>([]);

  useEffect(() => {
    fetch("https://countriesnow.space/api/v0.1/countries")
      .then((r) => r.json())
      .then((res) => {
        if (res?.data) {
          const sorted = res.data.map((c: any) => c.country).sort();
          setCountries(sorted);
        }
      })
      .catch(() => {});
  }, []);

  const searchDepartureCities = useCallback(async (q: string) => fetchCitiesByCountry(departureCountry, q), [departureCountry]);
  const searchArrivalCities = useCallback(async (q: string) => fetchCitiesByCountry(arrivalCountry, q), [arrivalCountry]);

  const handleDepartureCountry = (v: string) => {
    setDepartureCountry(v);
    setDepartureCity("");
    setDepartureCities([]);
  };

  const handleArrivalCountry = (v: string) => {
    setArrivalCountry(v);
    setArrivalCity("");
    setArrivalCities([]);
  };

  // Pre-fill arrival from URL params (when redirected from unmatched accept)
  useEffect(() => {
    const prefillCountry = searchParams.get("arrival_country");
    const prefillCity = searchParams.get("arrival_city");
    if (prefillCountry) {
      setArrivalCountry(prefillCountry);
      if (prefillCity) {
        setArrivalCity(prefillCity);
      }
    }
  }, []);

  // Step 4 – Transport & options (multi-select)
  const [selectedTransports, setSelectedTransports] = useState<string[]>([]);
  const disabledTransports = useTransportFeasibility(departureCountry, departureCity, arrivalCountry, arrivalCity);

  // Remove disabled transports from selection
  useEffect(() => {
    setSelectedTransports((prev) => prev.filter((t) => !disabledTransports[t]));
  }, [disabledTransports]);

  const toggleTransport = (value: string) => {
    if (disabledTransports[value]) return;
    setSelectedTransports((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };
  const [canPickup, setCanPickup] = useState(false);
  const [canMove, setCanMove] = useState(false);
  const [deliverToAddress, setDeliverToAddress] = useState(false);
  const [cutoffHours, setCutoffHours] = useState("24");

  // Step 5 – NeedIt
  const [acceptNeedit, setAcceptNeedit] = useState(false);
  const [needitBudget, setNeeditBudget] = useState("");
  const [maxWeightKg, setMaxWeightKg] = useState("");
  const [maxItems, setMaxItems] = useState("");
  const [volumeType, setVolumeType] = useState<"liters" | "dimensions">("liters");
  const [volumeLiters, setVolumeLiters] = useState("");
  const [capacityDimensions, setCapacityDimensions] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    const c = getCurrencyForCountry(arrivalCountry);
    return c.code;
  });

  // Update currency when arrival country changes
  useEffect(() => {
    const c = getCurrencyForCountry(arrivalCountry);
    setSelectedCurrency(c.code);
  }, [arrivalCountry]);

  const canContinue = () => {
    switch (step) {
      case 1: return tripType === "new" || (tripType === "favorite" && selectedFavoriteId !== null);
      case 2: return departureDate && departureCity;
      case 3: return arrivalCity;
      case 4: return selectedTransports.length > 0;
      case 5: return true;
      default: return false;
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const [createdReminderInfo, setCreatedReminderInfo] = useState<ReminderInfo | null>(null);
  const [showReminderPrompt, setShowReminderPrompt] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("voyages").insert({
      user_id: user.id,
      departure_country: departureCountry,
      departure_city: departureCity,
      departure_address: departureAddress || null,
      departure_date: departureDate,
      departure_time: departureTime || null,
      arrival_country: arrivalCountry,
      arrival_city: arrivalCity,
      arrival_address: arrivalAddress || null,
      arrival_date: arrivalDate || null,
      arrival_time: arrivalTime || null,
      transport_method: selectedTransports.join(","),
      can_pickup: canPickup,
      can_move: canMove,
      deliver_to_address: deliverToAddress,
      accept_needit: acceptNeedit,
      needit_budget: needitBudget || null,
      max_weight_kg: maxWeightKg ? parseFloat(maxWeightKg) : null,
      max_items: maxItems ? parseInt(maxItems) : null,
      capacity_volume_liters: volumeType === "liters" && volumeLiters ? parseFloat(volumeLiters) : null,
      capacity_dimensions: volumeType === "dimensions" && capacityDimensions ? capacityDimensions.trim() : null,
      cutoff_hours: parseInt(cutoffHours) || 24,
    } as any).select("id").single();
    setSubmitting(false);
    if (error) {
      toast.error(t("trip.errorCreate"));
    } else {
      successFeedback(t("trip.published"), { description: t("trip.publishedDesc") });
      // Trigger match notifications
      supabase.functions.invoke("notify-match", { body: { type: "voyage", record_id: data.id } }).catch(() => {});

      // If redirected from unmatched accept flow, go straight back to dashboard
      if (searchParams.get("arrival_country")) {
        toast.success(t("dashboard.voyageCreatedNowAccept") || "Voyage créé ! Vous pouvez maintenant accepter l'élément matché.");
        navigate("/dashboard");
        return;
      }

      // Show reminder prompt
      setCreatedReminderInfo({
        itemType: "voyage",
        itemId: data.id,
        departureCity: departureCity,
        arrivalCity: arrivalCity,
        departureDate: departureDate,
        departureTime: departureTime || null,
      });
      setShowReminderPrompt(true);
    }
  };

  const handleNext = () => {
    setDirection(1);
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    setDirection(-1);
    if (step > 1) setStep(step - 1);
    else navigate("/dashboard");
  };

  const stepVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <div
        className="px-6 pt-12 pb-6 rounded-b-3xl"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
      >
        <h1 className="text-3xl font-extrabold text-primary-foreground leading-tight whitespace-pre-line">
          {t("trip.shareTitle")}
        </h1>
        {/* Step indicator */}
        <div className="flex gap-1.5 mt-4">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? "bg-primary-foreground" : "bg-primary-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-6">
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm min-h-[320px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
          {/* Step 1 – Trip type */}
          {step === 1 && (
            <div className="space-y-4">
              <button
                onClick={() => { setTripType("new"); setSelectedFavoriteId(null); }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                  tripType === "new"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  tripType === "new" ? "border-primary bg-primary" : "border-muted-foreground"
                }`}>
                  {tripType === "new" && <Check size={12} className="text-primary-foreground" />}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {t("trip.newTrip")}
                </span>
              </button>

              <button
                onClick={() => setTripType("favorite")}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                  tripType === "favorite"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  tripType === "favorite" ? "border-primary bg-primary" : "border-muted-foreground"
                }`}>
                  {tripType === "favorite" && <Check size={12} className="text-primary-foreground" />}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {t("trip.favoriteTrip")}
                </span>
              </button>

              {/* Favorite routes list */}
              {tripType === "favorite" && (
                <div className="space-y-2 pt-2">
                  {loadingFavorites ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="animate-spin text-muted-foreground" size={20} />
                    </div>
                  ) : favoriteRoutes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("trip.noFavoriteRoutes")}
                    </p>
                  ) : (
                    favoriteRoutes.map((route) => (
                      <button
                        key={route.id}
                        onClick={() => {
                          setSelectedFavoriteId(route.id);
                          setDepartureCity(route.from_city);
                          setArrivalCity(route.to_city);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          selectedFavoriteId === route.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <Star size={16} className={selectedFavoriteId === route.id ? "text-primary fill-primary" : "text-muted-foreground"} />
                        <span className="text-sm font-medium text-foreground">
                          {route.from_city} → {route.to_city}
                        </span>
                        {selectedFavoriteId === route.id && (
                          <Check size={14} className="ml-auto text-primary" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2 – Departure */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">{t("trip.travelInfo")}</h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.departDate")} <span className="text-destructive">*</span></Label>
                  <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.departTime")}</Label>
                  <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.departCountry")} <span className="text-destructive">*</span></Label>
                  <SearchableSelect value={departureCountry} onChange={handleDepartureCountry} options={countries} placeholder={t("trip.selectCountry")} displayFn={countryDisplay} popularItems={POPULAR_COUNTRIES} recentItems={recentCountries} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.departCity")} <span className="text-destructive">*</span></Label>
                  <SearchableSelect value={departureCity} onChange={setDepartureCity} options={departureCities} placeholder={departureCountry ? t("trip.selectCity") : t("trip.chooseCountryFirst")} disabled={!departureCountry} recentItems={recentCities} onSearch={departureCountry ? searchDepartureCities : undefined} popularItems={getPopularCities(getCountryISO(departureCountry) || "")} popularLabel="Grandes villes" />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.departAddress")}</Label>
                  <Input placeholder="123 rue…" value={departureAddress} onChange={(e) => setDepartureAddress(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 – Arrival */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">{t("trip.travelInfo")}</h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.arrivalDate")}</Label>
                  <Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.arrivalTime")}</Label>
                  <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.arrivalCountry")} <span className="text-destructive">*</span></Label>
                  <SearchableSelect value={arrivalCountry} onChange={handleArrivalCountry} options={countries} placeholder={t("trip.selectCountry")} displayFn={countryDisplay} popularItems={POPULAR_COUNTRIES} recentItems={recentCountries} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.arrivalCity")} <span className="text-destructive">*</span></Label>
                  <SearchableSelect value={arrivalCity} onChange={setArrivalCity} options={arrivalCities} placeholder={arrivalCountry ? t("trip.selectCity") : t("trip.chooseCountryFirst")} disabled={!arrivalCountry} recentItems={recentCities} onSearch={arrivalCountry ? searchArrivalCities : undefined} popularItems={getPopularCities(getCountryISO(arrivalCountry) || "")} popularLabel="Grandes villes" />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.arrivalAddress")}</Label>
                  <Input placeholder="456 avenue…" value={arrivalAddress} onChange={(e) => setArrivalAddress(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 – Transport & Options */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-foreground">{t("trip.travelInfo")}</h2>

              <div>
                <Label className="text-muted-foreground text-sm mb-2 block">{t("trip.selectTransport")} <span className="text-destructive">*</span></Label>
                <TooltipProvider delayDuration={0}>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSPORT_METHODS.map((t) => {
                      const isDisabled = !!disabledTransports[t.value];
                      const isSelected = selectedTransports.includes(t.value);
                      const card = (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => toggleTransport(t.value)}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-colors relative overflow-hidden ${
                            isDisabled
                              ? "border-muted cursor-not-allowed opacity-40"
                              : isSelected
                                ? "border-primary bg-primary/5 cursor-pointer"
                                : "border-border hover:bg-muted/50 cursor-pointer"
                          }`}
                        >
                          <div className="relative">
                            <t.icon size={18} className={isDisabled ? "text-muted-foreground" : "text-primary"} />
                            {isDisabled && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[140%] h-[1.5px] bg-muted-foreground rotate-45 -translate-x-[10%]" />
                              </div>
                            )}
                          </div>
                          <span className={`text-sm font-medium ${isDisabled ? "text-muted-foreground line-through decoration-muted-foreground/60" : "text-foreground"}`}>
                            {t.label}
                          </span>
                          {isSelected && !isDisabled && (
                            <Check size={14} className="ml-auto text-primary" />
                          )}
                        </button>
                      );

                      if (isDisabled) {
                        return (
                          <Tooltip key={t.value}>
                            <TooltipTrigger asChild>{card}</TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-xs text-center">
                              {disabledTransports[t.value]}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      return card;
                    })}
                  </div>
                </TooltipProvider>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    Je peux récupérer un/des colis sur le trajet
                  </span>
                  <Switch checked={canPickup} onCheckedChange={setCanPickup} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    Je peux me déplacer pour récupérer un/des colis avant mon départ
                  </span>
                  <Switch checked={canMove} onCheckedChange={setCanMove} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    Je remets le/les colis à l'adresse d'arrivée uniquement
                  </span>
                  <Switch checked={deliverToAddress} onCheckedChange={setDeliverToAddress} />
                </div>
              </div>

              {/* Cutoff hours */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-sm font-semibold text-foreground">⏰ Fermeture du voyage aux matchs</Label>
                <p className="text-xs text-muted-foreground">Le voyage ne sera plus visible pour les demandeurs avant ce délai de départ.</p>
                <Select value={cutoffHours} onValueChange={setCutoffHours}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 heures avant</SelectItem>
                    <SelectItem value="12">12 heures avant</SelectItem>
                    <SelectItem value="24">24 heures avant (recommandé)</SelectItem>
                    <SelectItem value="48">48 heures avant</SelectItem>
                    <SelectItem value="72">72 heures avant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Capacity section */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground">{t("trip.capacityTitle")}</h3>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.maxWeight")}</Label>
                  <Input
                    type="number"
                    placeholder={t("trip.maxWeightPlaceholder")}
                    value={maxWeightKg}
                    onChange={(e) => setMaxWeightKg(e.target.value)}
                    min="0"
                    step="0.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("trip.maxWeightHint")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">{t("trip.maxItems")}</Label>
                  <Input
                    type="number"
                    placeholder={t("trip.maxItemsPlaceholder")}
                    value={maxItems}
                    onChange={(e) => setMaxItems(e.target.value)}
                    min="1"
                    step="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("trip.maxItemsHint")}</p>
                </div>

                {/* Dimensions visuelles */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">Taille maximale d'un colis</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "S", icon: "📦", desc: "Enveloppe", dim: "30×20×5 cm" },
                      { label: "M", icon: "🎒", desc: "Sac à dos", dim: "40×30×20 cm" },
                      { label: "L", icon: "🧳", desc: "Valise cabine", dim: "55×40×20 cm" },
                      { label: "XL", icon: "📦", desc: "Grande valise", dim: "70×50×30 cm" },
                    ].map((size) => (
                      <button
                        key={size.label}
                        type="button"
                        onClick={() => setCapacityDimensions(size.dim)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                          capacityDimensions === size.dim
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <span className="text-2xl">{size.icon}</span>
                        <span className="text-xs font-bold">{size.label}</span>
                        <span className="text-[10px] leading-tight text-center">{size.desc}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {capacityDimensions ? `Dimensions : ${capacityDimensions}` : "Sélectionnez la taille max acceptée"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 – NeedIt */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-foreground">Information de voyage</h2>

              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground font-medium">
                  J'accepte de recevoir les missions *Needit
                </span>
                <Switch checked={acceptNeedit} onCheckedChange={setAcceptNeedit} />
              </div>

              <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground mb-1">*Needit : Recevoir des ordres de Missions</p>
                <p>
                  Vous recevrez des demandes d'achat de produits. Vous devrez acheter le ou les produits
                  et vous recevrez le remboursement ainsi que la commission dès la remise du ou des produits.
                </p>
              </div>

              {acceptNeedit && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground text-sm">Devise</Label>
                    <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner une devise" /></SelectTrigger>
                      <SelectContent className="bg-card border border-border z-50 max-h-60">
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">
                      Montant du budget Needit pour ce trajet
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="Ex: 500"
                        value={needitBudget}
                        onChange={(e) => setNeeditBudget(e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                        {CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || "$"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      *Je dois définir le plafond à ne pas dépasser qui correspond à mon budget.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer nav */}
      <div className="px-6 pt-4 flex items-center justify-between">
        <button onClick={handleBack} className="text-muted-foreground font-medium text-sm">
          Retour
        </button>
        <button
          onClick={handleNext}
          disabled={!canContinue() || submitting}
          className="bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-full flex items-center gap-2 disabled:opacity-40 transition-opacity"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
          {step === TOTAL_STEPS ? "Valider" : "Continuer"} {!submitting && <ArrowRight size={18} />}
        </button>
      </div>

      <BottomNav />

      {/* Reminder prompt after creation */}
      {createdReminderInfo && (
        <ReminderDialog
          info={createdReminderInfo}
          open={showReminderPrompt}
          onOpenChange={(open) => {
            setShowReminderPrompt(open);
            if (!open) navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
};

export default NewTrip;
