import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const NeeditMission = () => {
  const navigate = useNavigate();
  const [pays, setPays] = useState("");
  const [ville, setVille] = useState("");
  const [timing, setTiming] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const inputClass = (field: string) =>
    `w-full border-b py-3 text-foreground placeholder:text-muted-foreground focus:outline-none bg-transparent transition-colors ${
      errors[field] ? "border-destructive" : "border-coly-blue/30 focus:border-coly-blue"
    }`;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!pays.trim()) e.pays = "Pays requis";
    if (!timing) e.timing = "Veuillez choisir une option";
    setErrors(e);
    if (Object.keys(e).length > 0) { toast.error("Veuillez compléter les champs requis"); return false; }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    toast.success("Mission NeedIt créée !");
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col bg-coly-blue relative overflow-hidden">
      <div className="absolute top-12 left-1/2 -translate-x-1/3 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute top-28 right-10 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
        ))}
      </div>

      <div className="relative z-10 px-6 pt-12 pb-6">
        <h1 className="text-4xl font-bold text-white leading-tight">NeedIt<br />Missions</h1>
      </div>

      <div className="relative z-10 flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-24">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Information NeedIt</h2>

        <h3 className="text-lg text-muted-foreground mb-3">à Partir d'ou ?</h3>
        <div className="space-y-4 mb-8">
          <div>
            <input className={inputClass("pays")} placeholder="Pays" value={pays} onChange={(e) => { setPays(e.target.value); if (errors.pays) setErrors(p => { const n = {...p}; delete n.pays; return n; }); }} />
            {errors.pays && <p className="text-xs text-destructive mt-1">{errors.pays}</p>}
          </div>
          <input className={inputClass("")} placeholder="Ville (facultatif)" value={ville} onChange={(e) => setVille(e.target.value)} />
        </div>

        <h3 className="text-lg text-muted-foreground mb-3">Quand ?</h3>
        {errors.timing && <p className="text-xs text-destructive mb-2">{errors.timing}</p>}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <Checkbox checked={timing === "asap"} onCheckedChange={() => { setTiming("asap"); if (errors.timing) setErrors(p => { const n = {...p}; delete n.timing; return n; }); }} />
            <span className="text-foreground">dès que possible</span>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={timing === "date"} onCheckedChange={() => { setTiming("date"); if (errors.timing) setErrors(p => { const n = {...p}; delete n.timing; return n; }); }} />
            <span className="text-foreground">à partir de la date indiquée ci dessus.</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <button onClick={() => navigate("/dashboard")} className="text-lg text-muted-foreground hover:text-foreground transition-colors">
            Retour
          </button>
          <button onClick={handleSubmit} className="flex items-center gap-2 px-8 py-3 rounded-full bg-coly-orange text-white text-lg font-medium hover:opacity-90 transition-opacity shadow-lg">
            Continuer <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default NeeditMission;
