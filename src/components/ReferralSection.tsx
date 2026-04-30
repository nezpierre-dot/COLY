import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Gift, Users, CheckCircle, Share2, Sparkles, Trophy, ArrowRight, Mail, MessageCircle } from "lucide-react";
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

const REFERRER_BONUS = 10;
const REFEREE_BONUS = 10;

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

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://nidit.fr";
  const inviteLink = `${baseUrl}/signup?ref=${referralCode}`;
  const shareText = `🎁 Rejoins Nidit avec mon code ${referralCode} et reçois ${REFEREE_BONUS}€ offerts dès ton inscription ! Envoie ou ramène un colis dans le monde entier en toute confiance.`;

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Code copié ! 🎁");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Lien d'invitation copié !");
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: "Nidit - 10€ offerts", text: shareText, url: inviteLink }).catch(() => {});
    } else {
      copyLink();
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${inviteLink}`)}`, "_blank");
  };

  const shareEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent("10€ offerts sur Nidit 🎁")}&body=${encodeURIComponent(`${shareText}\n\n${inviteLink}`)}`;
  };

  const validatedCount = referrals.filter(r => r.status === "credited").length;
  const pendingCount = referrals.filter(r => r.status !== "credited").length;
  const nextMilestone = validatedCount < 5 ? 5 : validatedCount < 10 ? 10 : validatedCount < 25 ? 25 : 50;
  const progress = Math.min(100, (validatedCount / nextMilestone) * 100);

  return (
    <div className="space-y-4">
      {/* Hero card — rewards */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-success/15 p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-success/20 blur-2xl" />

        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/20 p-2 text-primary">
              <Gift size={18} />
            </div>
            <h3 className="text-base font-bold">Parraine & gagne</h3>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
              <Sparkles size={10} /> Double bonus
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-background/60 p-3 backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tu reçois</div>
              <div className="mt-1 text-2xl font-extrabold text-success">+{REFERRER_BONUS}€</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">par filleul actif</div>
            </div>
            <div className="rounded-2xl bg-background/60 p-3 backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ton ami reçoit</div>
              <div className="mt-1 text-2xl font-extrabold text-primary">+{REFEREE_BONUS}€</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">à l'inscription</div>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            🚀 <span className="font-semibold text-foreground">Sans plafond.</span> Plus tu parraines, plus tu gagnes — utilisable sur tes envois ou retirable.
          </p>
        </div>
      </div>

      {/* Code + share */}
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ton code de parrainage</div>
        <div className="mt-2 flex gap-2">
          <Input
            value={referralCode}
            readOnly
            className="rounded-xl border-primary/30 bg-primary/5 font-mono text-lg font-bold text-center tracking-[0.3em] text-primary h-12"
          />
          <Button variant="outline" size="icon" onClick={copyCode} className="rounded-xl shrink-0 h-12 w-12">
            <Copy size={18} />
          </Button>
        </div>

        <Button onClick={shareNative} className="mt-3 w-full gap-2 rounded-xl" size="lg">
          <Share2 size={16} />
          Inviter mes amis
          <ArrowRight size={14} />
        </Button>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={shareWhatsApp} className="gap-1.5 rounded-xl text-xs">
            <MessageCircle size={14} className="text-success" /> WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={shareEmail} className="gap-1.5 rounded-xl text-xs">
            <Mail size={14} /> Email
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5 rounded-xl text-xs">
            <Copy size={14} /> Lien
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <Users size={16} className="text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{referrals.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Filleuls</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <CheckCircle size={16} className="text-success mx-auto mb-1" />
          <p className="text-lg font-bold text-success">{validatedCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Validés</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <Trophy size={16} className="text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{totalBonus}€</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gagnés</p>
        </div>
      </div>

      {/* Milestone progress */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold">Prochain palier</span>
          <span className="text-xs font-bold text-primary">{validatedCount}/{nextMilestone} 🎁</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-success"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Atteins {nextMilestone} parrainages validés pour débloquer un <span className="font-semibold text-foreground">badge exclusif</span> ✨
        </p>
      </div>

      {/* Recent referrals */}
      {referrals.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Historique récent</h4>
          <div className="space-y-1">
            {referrals.slice(0, 5).map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <span className="text-xs">Filleul inscrit</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${r.status === "credited" ? "text-success" : "text-amber-500"}`}>
                    {r.status === "credited" ? `+${REFERRER_BONUS}€` : "En attente"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          {pendingCount > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground italic">
              {pendingCount} parrainage{pendingCount > 1 ? "s" : ""} en attente de validation (1ʳᵉ livraison)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferralSection;
