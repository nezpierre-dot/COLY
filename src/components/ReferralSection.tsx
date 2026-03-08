import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Gift, Users, CheckCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface Referral {
  id: string;
  referred_id: string;
  bonus_amount: number;
  status: string;
  created_at: string;
}

const ReferralSection = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalBonus, setTotalBonus] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.referral_code) setReferralCode(data.referral_code);
      });

    supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setReferrals(data as Referral[]);
          setTotalBonus(data.filter(r => r.status === "credited").reduce((s, r) => s + Number(r.bonus_amount), 0));
        }
      });
  }, [user]);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Code copié !");
  };

  const shareCode = () => {
    const text = `Rejoins Nidit avec mon code ${referralCode} et gagne 10€ de bonus ! 🎁`;
    if (navigator.share) {
      navigator.share({ title: "Nidit - Parrainage", text }).catch(() => {});
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gift size={18} className="text-accent" />
        <h3 className="text-base font-bold text-foreground">Parrainage</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Invitez vos amis et gagnez <span className="font-bold text-success">10€</span> par filleul inscrit !
      </p>

      {/* Code display */}
      <div className="flex gap-2">
        <Input
          value={referralCode}
          readOnly
          className="rounded-xl font-mono font-bold text-center tracking-widest text-foreground"
        />
        <Button variant="outline" size="icon" onClick={copyCode} className="rounded-xl shrink-0">
          <Copy size={16} />
        </Button>
        <Button variant="outline" size="icon" onClick={shareCode} className="rounded-xl shrink-0">
          <Share2 size={16} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <Users size={16} className="text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{referrals.length}</p>
          <p className="text-xs text-muted-foreground">Filleuls</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <CheckCircle size={16} className="text-success mx-auto mb-1" />
          <p className="text-lg font-bold text-success">{totalBonus}€</p>
          <p className="text-xs text-muted-foreground">Bonus gagnés</p>
        </div>
      </div>

      {/* Referral list */}
      {referrals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historique</h4>
          {referrals.slice(0, 5).map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <span className="text-xs text-foreground">Filleul inscrit</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${r.status === "credited" ? "text-success" : "text-warning"}`}>
                  {r.status === "credited" ? "+10€" : "En attente"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReferralSection;
