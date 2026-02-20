import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import AuthLayout from "@/components/AuthLayout";
import BottomNav from "@/components/BottomNav";

const SendColy = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [accounting, setAccounting] = useState({ rib: false, ribLater: false, card: false, cardLater: false });
  const [departure, setDeparture] = useState({ date: "", pays: "", ville: "" });

  const inputClass = "w-full border-b border-muted-foreground/30 py-3 text-foreground placeholder:text-muted-foreground focus:border-coly-blue focus:outline-none bg-transparent";

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
        <h1 className="text-4xl font-bold text-white leading-tight">j'envoi un<br />coly !</h1>
      </div>

      <div className="relative z-10 flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-24">
        {step === 1 ? (
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-foreground">Comptabilité</h2>

            <div className="bg-muted rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox checked={accounting.rib} onCheckedChange={() => setAccounting({ ...accounting, rib: !accounting.rib, ribLater: false })} className="mt-1" />
                <span className="text-sm text-foreground">J'enregistre un rib pour recevoir le versement des trajets.</span>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox checked={accounting.ribLater} onCheckedChange={() => setAccounting({ ...accounting, ribLater: !accounting.ribLater, rib: false })} className="mt-1" />
                <span className="text-sm text-foreground">Je le ferai plus tard</span>
              </div>
            </div>

            <div className="bg-muted rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox checked={accounting.card} onCheckedChange={() => setAccounting({ ...accounting, card: !accounting.card, cardLater: false })} className="mt-1" />
                <span className="text-sm text-foreground">J'enregistre ma carte bancaire</span>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox checked={accounting.cardLater} onCheckedChange={() => setAccounting({ ...accounting, cardLater: !accounting.cardLater, card: false })} className="mt-1" />
                <span className="text-sm text-foreground">Je le ferai plus tard</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-foreground">Information Expédition Départ</h2>
            <div>
              <label className="text-xs text-muted-foreground">Date de Départ Souhaité</label>
              <input className={inputClass} type="date" value={departure.date} onChange={(e) => setDeparture({ ...departure, date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Pays de Départ</label>
              <input className={inputClass} placeholder="France" value={departure.pays} onChange={(e) => setDeparture({ ...departure, pays: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ville de Départ</label>
              <input className={inputClass} placeholder="Marseille" value={departure.ville} onChange={(e) => setDeparture({ ...departure, ville: e.target.value })} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-8">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate("/dashboard"))}
            className="text-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            Retour
          </button>
          <button
            onClick={() => (step < 2 ? setStep(step + 1) : navigate("/dashboard"))}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-coly-orange text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            Continuer <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SendColy;
