import { useState } from "react";
import { Key, Loader2, CheckCircle } from "lucide-react";
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

const ConfirmationCodeEntry = ({ itemId, itemType, onConfirmed }: ConfirmationCodeEntryProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

      if (data === true) {
        setSuccess(true);
        successFeedback("Mission finalisée !");
        toast.success("Mission finalisée ! Paiement débloqué 🎉");
        // Notify owner by email
        const deliveredStatus = itemType === "needit_mission" ? "completed" : "delivered";
        supabase.functions.invoke("notify-status-change", {
          body: { item_id: itemId, item_type: itemType, new_status: deliveredStatus },
        }).catch(() => {});
        setTimeout(() => onConfirmed(), 1500);
      } else {
        toast.error("Code incorrect. Vérifiez auprès du destinataire.");
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

  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Key size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-foreground">Finaliser la mission</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Demandez le code de confirmation au destinataire pour finaliser la livraison et débloquer votre paiement.
      </p>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Entrez le code (ex: A3F9B2)"
        className="text-center font-mono text-lg tracking-[0.2em] uppercase"
        maxLength={6}
      />
      <Button
        className="w-full rounded-xl"
        disabled={code.length < 4 || loading}
        onClick={handleSubmit}
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin mr-2" /> Vérification...</>
        ) : (
          <><Key size={14} className="mr-2" /> Valider le code</>
        )}
      </Button>
    </div>
  );
};

export default ConfirmationCodeEntry;
