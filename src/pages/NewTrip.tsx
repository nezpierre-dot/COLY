import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Plane, Train, Car, Bus, Ship, Bike, Check, Loader2, ChevronDown } from "lucide-react";
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

/** Searchable dropdown that only renders visible items (max 50 shown) */
const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options.slice(0, 50);
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 50);
  }, [options, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(!open); setSearch(""); } }}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-md shadow-lg">
          <div className="p-2">
            <Input
              autoFocus
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Aucun résultat</div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { onChange(item); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/80 transition-colors ${
                    item === value ? "bg-primary/10 font-medium" : ""
                  }`}
                >
                  {item}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TRANSPORT_METHODS = [
  { value: "avion", label: "Avion", icon: Plane },
  { value: "train", label: "Train", icon: Train },
  { value: "voiture", label: "Voiture", icon: Car },
  { value: "bus", label: "Bus", icon: Bus },
  { value: "bateau", label: "Bateau / Ferry", icon: Ship },
  { value: "velo", label: "Vélo / E-Bike", icon: Bike },
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
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // Step 1
  const [tripType, setTripType] = useState<"new" | "favorite" | null>(null);

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

  const fetchCities = (country: string, setter: (c: string[]) => void) => {
    setter([]);
    if (!country) return;
    fetch("https://countriesnow.space/api/v0.1/countries/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country }),
    })
      .then((r) => r.json())
      .then((res) => { if (res?.data) setter(res.data.sort()); })
      .catch(() => {});
  };

  const handleDepartureCountry = (v: string) => {
    setDepartureCountry(v);
    setDepartureCity("");
    fetchCities(v, setDepartureCities);
  };

  const handleArrivalCountry = (v: string) => {
    setArrivalCountry(v);
    setArrivalCity("");
    fetchCities(v, setArrivalCities);
  };
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

  // Step 5 – NeedIt
  const [acceptNeedit, setAcceptNeedit] = useState(false);
  const [needitBudget, setNeeditBudget] = useState("");
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
      case 1: return tripType !== null;
      case 2: return departureDate && departureCity;
      case 3: return arrivalCity;
      case 4: return selectedTransports.length > 0;
      case 5: return true;
      default: return false;
    }
  };

  const [submitting, setSubmitting] = useState(false);

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
    }).select("id").single();
    setSubmitting(false);
    if (error) {
      toast.error("Erreur lors de la création du voyage");
    } else {
      successFeedback("Voyage publié !", { description: "Les demandeurs sur cet axe seront notifiés." });
      // Trigger match notifications
      supabase.functions.invoke("notify-match", { body: { type: "voyage", record_id: data.id } }).catch(() => {});
      navigate("/dashboard");
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <div
        className="px-6 pt-12 pb-6 rounded-b-3xl"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
      >
        <h1 className="text-3xl font-extrabold text-primary-foreground leading-tight">
          Je partage mon<br />bagage !
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
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm min-h-[320px]">
          {/* Step 1 – Trip type */}
          {step === 1 && (
            <div className="space-y-4">
              <button
                onClick={() => setTripType("new")}
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
                  Nouveau Trajet non enregistré
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
                  Je choisi un de mes trajets favoris
                </span>
              </button>
            </div>
          )}

          {/* Step 2 – Departure */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Information de voyage</h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-sm">Date de Départ</Label>
                  <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Heure de Départ</Label>
                  <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Pays de Départ</Label>
                  <SearchableSelect value={departureCountry} onChange={handleDepartureCountry} options={countries} placeholder="Sélectionner un pays" />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Ville de Départ</Label>
                  <SearchableSelect value={departureCity} onChange={setDepartureCity} options={departureCities} placeholder={departureCountry ? "Sélectionner une ville" : "Choisir un pays d'abord"} disabled={!departureCountry} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Adresse de Départ</Label>
                  <Input placeholder="123 rue…" value={departureAddress} onChange={(e) => setDepartureAddress(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 – Arrival */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Information de voyage</h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-sm">Date d'Arrivée</Label>
                  <Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Heure d'Arrivée</Label>
                  <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Pays d'Arrivée</Label>
                  <SearchableSelect value={arrivalCountry} onChange={handleArrivalCountry} options={countries} placeholder="Sélectionner un pays" />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Ville d'Arrivée</Label>
                  <SearchableSelect value={arrivalCity} onChange={setArrivalCity} options={arrivalCities} placeholder={arrivalCountry ? "Sélectionner une ville" : "Choisir un pays d'abord"} disabled={!arrivalCountry} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Adresse d'Arrivée</Label>
                  <Input placeholder="456 avenue…" value={arrivalAddress} onChange={(e) => setArrivalAddress(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4 – Transport & Options */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-foreground">Information de voyage</h2>

              <div>
                <Label className="text-muted-foreground text-sm mb-2 block">Sélectionner le(s) moyen(s) de transport</Label>
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
    </div>
  );
};

export default NewTrip;
