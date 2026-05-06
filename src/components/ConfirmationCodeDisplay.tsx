import { useState, useEffect } from "react";
import { Key, Copy, CheckCircle, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Nido from "@/components/Nido";

interface ConfirmationCodeDisplayProps {
  itemId: string;
  itemType: "shipment" | "needit_mission";
}

const formatRemaining = (target: Date) => {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
};

const MAX_ATTEMPTS = 5;

const ConfirmationCodeDisplay = ({ itemId, itemType }: ConfirmationCodeDisplayProps) => {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [attempts, setAttempts] = useState<number>(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      if (lockedUntil.getTime() <= Date.now()) setLockedUntil(null);
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => {
    const generate = async () => {
      const table = itemType === "shipment" ? "shipments" : "needit_missions";
      const { data: existing } = await supabase
        .from(table as any)
        .select("status, confirmation_attempts, confirmation_locked_until")
        .eq("id", itemId)
        .maybeSingle();

      const status = (existing as any)?.status;
      if (status === "delivered" || status === "completed") {
        setCode(null);
        setLoading(false);
        return;
      }

      setAttempts((existing as any)?.confirmation_attempts ?? 0);
      const lu = (existing as any)?.confirmation_locked_until;
      if (lu) {
        const d = new Date(lu);
        if (d.getTime() > Date.now()) setLockedUntil(d);
      }

      const { data: codeData, error } = await supabase.rpc("generate_confirmation_code" as any, {
        _item_id: itemId,
        _item_type: itemType,
      });
      if (error) {
        toast.error("Erreur lors de la génération du code");
      } else {
        setCode(codeData as string);
        // Generation resets server-side counters
        setAttempts(0);
        setLockedUntil(null);
      }
      setLoading(false);
    };
    generate();
  }, [itemId, itemType]);

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-3 overflow-hidden">
      <div className="pointer-events-none absolute -top-3 -right-3 opacity-90">
        <Nido pose="celebrate" size="sm" animate="wiggle" />
      </div>
      <div className="flex items-center gap-2">
        <Key size={16} className="text-amber-600" />
        <h3 className="text-sm font-bold text-foreground">Code de confirmation</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Communiquez ce code au voyageur à la remise du {itemType === "shipment" ? "colis" : "produit"}. 
        Il devra le saisir pour finaliser la mission et débloquer le paiement.
      </p>
      <div className="flex items-center justify-center gap-3">
        <div className="bg-white dark:bg-background border-2 border-amber-300 dark:border-amber-700 rounded-xl px-6 py-3 font-mono text-2xl font-black tracking-[0.3em] text-foreground select-all">
          {code}
        </div>
        <button
          onClick={handleCopy}
          className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
        >
          {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
        </button>
      </div>
      <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center font-medium">
        ⚠️ Ne partagez ce code qu'au moment de la remise en main propre
      </p>
    </div>
  );
};

export default ConfirmationCodeDisplay;
