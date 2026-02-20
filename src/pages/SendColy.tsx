import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";

const SIZES = [
  { id: "S", label: "S : Poids Max 1kg", dim: "217×150×50" },
  { id: "M", label: "M : Poids Max 3kg", dim: "230×130×100" },
  { id: "L", label: "L : Poids Max 5kg", dim: "315×210×157" },
  { id: "XL", label: "XL : Poids Max 7kg", dim: "383×250×195" },
  { id: "XXL", label: "XXL : Poids Max 10kg", dim: "400×425×200" },
  { id: "other", label: "Autres", dim: "" },
];

const SendColy = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 1 - Date
  const [date, setDate] = useState("");
  // Step 2 - Départ
  const [departMethod, setDepartMethod] = useState<string>("");
  const [departCity, setDepartCity] = useState("");
  const [relayPoint, setRelayPoint] = useState("");
  // Step 3 - Arrivée
  const [arrCity, setArrCity] = useState("");
  const [arrCountry, setArrCountry] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactPrenom, setContactPrenom] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactMail, setContactMail] = useState("");
  // Step 4 - Photo
  const [photo, setPhoto] = useState<string | null>(null);
  // Step 5 - Dimension
  const [size, setSize] = useState("S");
  // Step 6 - Tarif
  const [tarif, setTarif] = useState<string>("");
  // Step 7 - Assurance
  const [insured, setInsured] = useState<boolean | null>(null);

  const inputClass = "w-full border-b border-coly-blue/30 py-3 text-foreground placeholder:text-muted-foreground focus:border-coly-blue focus:outline-none bg-transparent";
  const totalSteps = 8;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Information Expédition</h2>
            <div>
              <label className="text-xs text-coly-blue font-medium">Date</label>
              <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <span className="text-xs text-muted-foreground">DD/MM/YYYY</span>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Information Expédition Départ</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Checkbox checked={departMethod === "main"} onCheckedChange={() => setDepartMethod("main")} className="mt-1" />
                <div>
                  <span className="text-foreground">Remis en main propre</span>
                  <p className="text-xs text-muted-foreground mt-1">• En cas d'impossibilité le remise en main propre sera appliqué par défaut.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox checked={departMethod === "address"} onCheckedChange={() => setDepartMethod("address")} className="mt-1" />
                <span className="text-foreground">A Venir récupérer à cette adresse :</span>
              </div>
              {departMethod === "address" && (
                <input className={inputClass} placeholder="Adresse de récupération" value={departCity} onChange={(e) => setDepartCity(e.target.value)} />
              )}
              <div className="flex items-start gap-3">
                <Checkbox checked={departMethod === "relay"} onCheckedChange={() => setDepartMethod("relay")} className="mt-1" />
                <span className="text-foreground">Dépôt en point relais</span>
              </div>
              {departMethod === "relay" && (
                <div className="space-y-3 pl-9">
                  <input className={inputClass} placeholder="par ville : ..." value={departCity} onChange={(e) => setDepartCity(e.target.value)} />
                  <Select value={relayPoint} onValueChange={setRelayPoint}>
                    <SelectTrigger className="rounded-xl border-muted">
                      <SelectValue placeholder="Points relais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relay1">Point Relais 1</SelectItem>
                      <SelectItem value="relay2">Point Relais 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Information Expédition Arrivée</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Ville d'Arrivée</label>
                <input className={inputClass} placeholder="" value={arrCity} onChange={(e) => setArrCity(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Pays d'Arrivée</label>
                <input className={inputClass} placeholder="" value={arrCountry} onChange={(e) => setArrCountry(e.target.value)} />
              </div>
              <p className="text-sm text-muted-foreground pt-2">Contact remise en main arrivée :</p>
              <input className={inputClass} placeholder="Nom" value={contactNom} onChange={(e) => setContactNom(e.target.value)} />
              <input className={inputClass} placeholder="Prénom" value={contactPrenom} onChange={(e) => setContactPrenom(e.target.value)} />
              <input className={inputClass} placeholder="Téléphone" value={contactTel} onChange={(e) => setContactTel(e.target.value)} />
              <input className={inputClass} placeholder="Mail (facultatif)" value={contactMail} onChange={(e) => setContactMail(e.target.value)} />
            </div>
          </>
        );

      case 4:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-6">Je prend en photo mon colis</h2>
            <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-[300px]">
              {photo ? (
                <img src={photo} alt="Colis" className="w-full max-h-80 object-cover rounded-2xl" />
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-64 py-5 rounded-2xl bg-coly-orange text-foreground font-medium text-lg flex items-center justify-center gap-4 hover:opacity-90 transition-opacity shadow-lg"
                >
                  <Camera size={32} className="text-foreground" />
                  <ArrowRight size={24} />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </div>
          </>
        );

      case 5:
        return (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-2">Dimension du colis</h2>
            <p className="text-sm text-muted-foreground mb-4">(en mm)</p>
            <div className="space-y-3">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${size === s.id ? "bg-muted border border-foreground/20" : "bg-muted/50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${size === s.id ? "bg-foreground border-foreground" : "border-muted-foreground/40"}`}>
                      {size === s.id && <span className="text-white text-xs font-bold">✕</span>}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{s.label}</span>
                      {s.dim && <p className="text-xs text-muted-foreground ml-2">dimension : {s.dim}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        );

      case 6:
        return (
          <>
            <p className="text-sm text-muted-foreground text-center mb-8">*Le paiement est effectué à la remise du colis.</p>
            <div className="space-y-4">
              <button
                onClick={() => setTarif("standard")}
                className={`w-full py-6 px-6 rounded-2xl text-white font-bold text-lg flex items-center justify-between transition-opacity ${tarif === "standard" ? "opacity-100" : "opacity-80"} bg-coly-orange`}
              >
                <div><p>ENVOI STANDARD</p><p>18.99€</p></div>
                <ArrowRight size={24} />
              </button>
              <button
                onClick={() => setTarif("express")}
                className={`w-full py-6 px-6 rounded-2xl text-white font-bold text-lg flex items-center justify-between transition-opacity ${tarif === "express" ? "opacity-100" : "opacity-80"}`}
                style={{ background: "hsl(33 40% 65%)" }}
              >
                <div><p>ENVOI EXPRESS</p><p>24.99€</p></div>
                <ArrowRight size={24} />
              </button>
              <button
                onClick={() => setTarif("custom")}
                className={`w-full py-6 px-6 rounded-2xl text-white font-bold text-lg flex items-center justify-between transition-opacity ${tarif === "custom" ? "opacity-100" : "opacity-80"}`}
                style={{ background: "hsl(33 30% 55%)" }}
              >
                <div><p>Le tarifs ne me</p><p>conviens pas</p></div>
                <ArrowRight size={24} />
              </button>
            </div>
          </>
        );

      case 7:
        return (
          <>
            <div className="bg-muted rounded-2xl p-8 text-center mb-12">
              <p className="text-lg text-foreground leading-relaxed">
                Souhaitez vous assurer votre colis avec notre partenaire AXA assurance ?
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setInsured(true)}
                className={`flex-1 py-4 rounded-2xl font-bold text-lg text-white transition-opacity ${insured === true ? "opacity-100" : "opacity-75"} bg-coly-orange`}
              >
                OUI
              </button>
              <button
                onClick={() => setInsured(false)}
                className={`flex-1 py-4 rounded-2xl font-bold text-lg text-white transition-opacity ${insured === false ? "opacity-100" : "opacity-75"} bg-coly-orange`}
              >
                NON
              </button>
            </div>
          </>
        );

      case 8:
        return (
          <>
            <div className="border border-border rounded-2xl p-6">
              <p className="text-sm text-muted-foreground">Comparatif</p>
              <h3 className="text-xl font-bold text-foreground mb-4">Grille Tarifaire</h3>
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Star size={18} className="text-foreground mt-0.5" />
                  <div>
                    <p className="font-bold text-foreground">COLY : 18.99€</p>
                    <p className="text-sm text-muted-foreground">Envoi standard</p>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-foreground">UPS : 24.99€</p>
                  <p className="text-sm text-muted-foreground">Envoi standard</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">FEDEX : 22.50€</p>
                  <p className="text-sm text-muted-foreground">Envoi standard</p>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="font-medium text-foreground ml-6">DHL : 12.10€</p>
                  <p className="text-sm text-muted-foreground ml-6">Envoi entre 2 à 5 jours</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">ENVOI STANDARD</p>
                  <p className="text-sm text-muted-foreground">Envoi entre 12h et 48h</p>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-coly-blue relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-12 left-1/2 -translate-x-1/3 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute top-28 right-10 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
        ))}
      </div>

      <div className="relative z-10 px-6 pt-12 pb-6">
        <h1 className="text-4xl font-bold text-white leading-tight">
          {step === 8 ? "TARIFS" : "j'envoi un\ncoly !"}
        </h1>
      </div>

      <div className="relative z-10 flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-24">
        {renderStep()}

        <div className="flex items-center justify-between pt-8">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate("/dashboard"))}
            className="text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            Retour
          </button>
          {step !== 7 && (
            <button
              onClick={() => (step < totalSteps ? setStep(step + 1) : navigate("/dashboard"))}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-coly-orange text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg"
            >
              Continuer <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SendColy;
