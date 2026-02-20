import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Plane, Train, Car, Bus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getCurrencyForCountry, getUnitsForCountry } from "@/hooks/useLocaleUnits";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const TRANSPORT_METHODS = [
  { value: "avion", label: "Avion", icon: Plane },
  { value: "train", label: "Train", icon: Train },
  { value: "voiture", label: "Voiture", icon: Car },
  { value: "bus", label: "Bus", icon: Bus },
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
  // Step 4 – Transport & options
  const [transportMethod, setTransportMethod] = useState("");
  const [canPickup, setCanPickup] = useState(false);
  const [canMove, setCanMove] = useState(false);
  const [deliverToAddress, setDeliverToAddress] = useState(false);

  // Step 5 – NeedIt
  const [acceptNeedit, setAcceptNeedit] = useState(false);
  const [needitBudget, setNeeditBudget] = useState("");

  const canContinue = () => {
    switch (step) {
      case 1: return tripType !== null;
      case 2: return departureDate && departureCity;
      case 3: return arrivalCity;
      case 4: return !!transportMethod;
      case 5: return true;
      default: return false;
    }
  };

  const handleSubmit = () => {
    // For now just show success and go back
    toast.success("Voyage créé avec succès !");
    navigate("/dashboard");
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
                  <Label className="text-muted-foreground text-sm">Ville de Départ</Label>
                  <Input placeholder="Paris" value={departureCity} onChange={(e) => setDepartureCity(e.target.value)} />
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
                  <Input placeholder="France" value={arrivalCountry} onChange={(e) => setArrivalCountry(e.target.value)} />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Ville d'Arrivée</Label>
                  <Input placeholder="Casablanca" value={arrivalCity} onChange={(e) => setArrivalCity(e.target.value)} />
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
                <Label className="text-muted-foreground text-sm mb-2 block">Sélectionner le moyen de transports</Label>
                <RadioGroup value={transportMethod} onValueChange={setTransportMethod} className="grid grid-cols-2 gap-2">
                  {TRANSPORT_METHODS.map((t) => (
                    <label
                      key={t.value}
                      className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                        transportMethod === t.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={t.value} className="sr-only" />
                      <t.icon size={18} className="text-primary" />
                      <span className="text-sm font-medium text-foreground">{t.label}</span>
                    </label>
                  ))}
                </RadioGroup>
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
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Montant du budget Needit pour ce trajet ({currency.code})
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Ex: 500"
                      value={needitBudget}
                      onChange={(e) => setNeeditBudget(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      {currency.symbol}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    *Je dois définir le plafond à ne pas dépasser qui correspond à mon budget.
                  </p>
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
          disabled={!canContinue()}
          className="bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-full flex items-center gap-2 disabled:opacity-40 transition-opacity"
        >
          {step === TOTAL_STEPS ? "Valider" : "Continuer"} <ArrowRight size={18} />
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default NewTrip;
