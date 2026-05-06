import { useEffect, useState } from "react";
import { Key, Loader2, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { successFeedback } from "@/lib/successFeedback";

interface ConfirmationCodeEntryProps {
  itemId: string;
  itemType: "shipment" | "needit_mission";
  onConfirmed: () => void;
}

const formatRemaining = (target: Date) => {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
};

const ConfirmationCodeEntry = ({ itemId, itemType, onConfirmed }: ConfirmationCodeEntryProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      if (lockedUntil.getTime() <= Date.now()) {
        setLockedUntil(null);
        setAttemptsLeft(null);
      }
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const handleSubmit = async () => {
    if (code.length < 4) {
      toast.error("Code trop court");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("validate_confirmation_code" as any, {
        _item_id: itemId,
        _item_type: itemType,
        _code: code.trim(),
      });

      if (error) throw error;

      const result = data as { ok?: boolean; error?: string; attempts_left?: number; locked_until?: string } | boolean;

      // Backwards compat: legacy boolean response
      if (typeof result === "boolean") {
        if (result) {
          setSuccess(true);
          successFeedback("Mission finalisée !");
          toast.success("Mission finalisée ! Paiement débloqué 🎉");
          setTimeout(() => onConfirmed(), 1500);
        } else {
          toast.error("Code incorrect.");
        }
        return;
      }

      if (result?.ok) {
        setSuccess(true);
        successFeedback("Mission finalisée !");
        toast.success("Mission finalisée ! Paiement débloqué 🎉");
        setTimeout(() => onConfirmed(), 1500);
        return;
      }

      if (result?.error === "locked" && result.locked_until) {
        const until = new Date(result.locked_until);
        setLockedUntil(until);
        setAttemptsLeft(0);
        toast.error("Trop d'essais. Code bloqué temporairement.");
        return;
      }

      if (typeof result?.attempts_left === "number") {
        setAttemptsLeft(result.attempts_left);
        toast.error(
          result.attempts_left > 0
            ? `Code incorrect. Il te reste ${result.attempts_left} essai${result.attempts_left > 1 ? "s" : ""}.`
            : "Code incorrect.",
        );
      } else {
        toast.error("Code incorrect.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de validation");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-2xl p-5 flex flex-col items-center gap-3">
        <CheckCircle size={32} className="text-green-600" />
        <p className="text-sm font-bold text-green-700 dark:text-green-400">Mission finalisée !</p>
        <p className="text-xs text-green-600 dark:text-green-500">Le paiement sera débloqué sous peu.</p>
      </div>
    );
  }

  const isLocked = !!(lockedUntil && lockedUntil.getTime() > Date.now());
  const remaining = lockedUntil ? formatRemaining(lockedUntil) : null;

  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Key size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-foreground">Finaliser la mission</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Demande le code de confirmation au destinataire pour finaliser la livraison et débloquer ton paiement.
      </p>

      {isLocked && remaining && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <Lock size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Saisie bloquée temporairement</p>
            <p>Réessaie dans {remaining} (5 essais consécutifs ratés).</p>
          </div>
        </div>
      )}

      {!isLocked && attemptsLeft !== null && attemptsLeft > 0 && (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
          Il te reste {attemptsLeft} essai{attemptsLeft > 1 ? "s" : ""} avant blocage 15 min.
        </p>
      )}

      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Entrez le code (ex: A3F9B2)"
        className="text-center font-mono text-lg tracking-[0.2em] uppercase"
        maxLength={6}
        disabled={isLocked || loading}
      />
      <Button
        className="w-full rounded-xl"
        disabled={code.length < 4 || loading || isLocked}
        onClick={handleSubmit}
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin mr-2" /> Vérification...</>
        ) : isLocked ? (
          <><Lock size={14} className="mr-2" /> Bloqué {remaining ?? ""}</>
        ) : (
          <><Key size={14} className="mr-2" /> Valider le code</>
        )}
      </Button>
    </div>
  );
};

export default ConfirmationCodeEntry;
