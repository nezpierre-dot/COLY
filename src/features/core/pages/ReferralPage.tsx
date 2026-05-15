/**
 * ReferralPage — Programme de parrainage 2-sens (V14 → backend wiré V17).
 *
 * Route : /parrainage (ProtectedRoute)
 *
 * Mécanique (modèle points, aligné sur ReferralSection + le backend) :
 *  - Le parrain partage son code `profiles.referral_code`.
 *  - Le filleul s'inscrit via /signup?ref=CODE → useAuth appelle l'edge
 *    function `redeem-referral` → ligne `referrals` créée en statut 'pending'.
 *  - Au 1er colis livré (ou mission NeedIt complétée) du filleul, le trigger
 *    `release_referral_on_delivery` passe le parrainage en 'completed' :
 *    parrain +100 pts, filleul +50 pts (award_points_on_referral).
 *
 * Backend : migration 20260515093000_referral_redeem_release.sql
 *           + edge function supabase/functions/redeem-referral.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Gift, Copy, Check, Share2, Mail, MessageCircle,
  Users, Wallet, Sparkles, ArrowLeft, Package, Plane,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { haptic } from "@/hooks/useHaptic";

const REFERRER_POINTS = 100; // points crédités au parrain à la validation
const REFEREE_POINTS = 50;   // points de bienvenue pour le filleul

interface ReferralRow {
  id: string;
  referred_id: string;
  status: string;
  created_at: string;
}

export default function ReferralPage() {
  const { user } = useAuth();
  const [code, setCode] = useState<string>("");
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralUrl = code ? `https://nidit.fr/signup?ref=${code}` : "https://nidit.fr/signup";

  useEffect(() => {
    document.title = "Parrainage — Nidit";
  }, []);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      const [codeRes, refsRes] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("referrals")
          .select("id, referred_id, status, created_at")
          .eq("referrer_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (codeRes.data?.referral_code) setCode(codeRes.data.referral_code);

      const rows = (refsRes.data || []) as ReferralRow[];
      setReferrals(rows);

      // Resolve referred users' display names (best-effort, non-blocking)
      const ids = [...new Set(rows.map((r) => r.referred_id))];
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles_public" as any)
          .select("user_id, full_name")
          .in("user_id", ids);
        if (profs) {
          const map: Record<string, string> = {};
          (profs as any[]).forEach((p) => { map[p.user_id] = p.full_name || "Filleul"; });
          setNames(map);
        }
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const isValidated = (s: string) => s === "completed" || s === "credited";
  const validatedCount = referrals.filter((r) => isValidated(r.status)).length;
  const pendingCount = referrals.length - validatedCount;
  const earnedPoints = validatedCount * REFERRER_POINTS;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      haptic("success");
      toast.success("Lien copié — partage-le à tes amis !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier — sélectionne et copie manuellement.");
    }
  };

  const shareText = `Je te recommande Nidit pour envoyer tes colis via des voyageurs vérifiés. Avec mon code ${code} tu démarres avec ${REFEREE_POINTS} points fidélité.\n${referralUrl}`;

  const handleShareWhatsApp = () => {
    haptic("selection");
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleShareEmail = () => {
    haptic("selection");
    window.location.href = `mailto:?subject=${encodeURIComponent("Essaye Nidit avec mon parrainage")}&body=${encodeURIComponent(shareText)}`;
  };

  const handleNativeShare = async () => {
    haptic("selection");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Nidit — Parrainage", text: shareText, url: referralUrl });
      } catch {
        // user cancelled — silent
      }
    } else {
      handleCopy();
    }
  };

  return (
    <>
      <Helmet>
        <title>Parrainage — Nidit</title>
        <meta name="description" content="Invite tes amis sur Nidit : ton filleul démarre avec 50 points et tu gagnes 100 points à son 1er colis. Programme de parrainage 2-sens." />
      </Helmet>

      <div className="min-h-screen bg-background pb-28">
        <header className="px-5 pt-5 pb-3 flex items-center gap-2">
          <Link to="/my-account" aria-label="Retour" className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary outline-none">
            <ArrowLeft size={20} className="text-foreground" />
          </Link>
          <h1 className="text-base font-semibold text-foreground">Parrainage</h1>
        </header>

        <main className="px-5 max-w-2xl mx-auto">
          {/* Hero card */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card-future-glow p-6 sm:p-8 text-center relative overflow-hidden"
            aria-labelledby="referral-hero-title"
          >
            <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-50 blur-3xl pointer-events-none" style={{ background: "hsl(var(--secondary) / 0.4)" }} aria-hidden="true" />
            <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full opacity-50 blur-3xl pointer-events-none" style={{ background: "hsl(var(--primary) / 0.4)" }} aria-hidden="true" />
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-5 shadow-lg">
                <Gift size={32} className="text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="chip-info mb-4"><Sparkles className="w-3.5 h-3.5" aria-hidden="true" />Programme officiel</span>
              <h2 id="referral-hero-title" className="text-title-lg font-bold mb-3">Invite tes amis,<br />gagnez chacun des points fidélité</h2>
              <p className="text-body-base text-muted-foreground max-w-md mx-auto mb-6">
                Ton filleul démarre avec <strong className="text-foreground">+{REFEREE_POINTS} points</strong> à l'inscription.<br />
                Tu reçois <strong className="text-foreground">+{REFERRER_POINTS} points</strong> dès son 1<sup>er</sup> colis livré (ou 1<sup>er</sup> transport).
              </p>

              {/* Code & lien */}
              <div className="bg-card rounded-2xl border border-border/60 p-4 mb-5 text-left">
                <div className="text-overline mb-2">Ton code de parrainage</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-display-sm font-extrabold tracking-widest text-primary" style={{ fontFamily: "ui-monospace, monospace" }}>
                    {code || (loading ? "······" : "—")}
                  </span>
                  <button type="button" onClick={handleCopy} disabled={!code} className="btn-cta-secondary text-sm h-10 px-4 disabled:opacity-50" aria-label="Copier le lien">
                    {copied ? (<><Check size={16} aria-hidden="true" />Copié</>) : (<><Copy size={16} aria-hidden="true" />Copier</>)}
                  </button>
                </div>
                <div className="mt-3 text-caption-base text-muted-foreground break-all">{referralUrl}</div>
              </div>

              {/* Share buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={handleShareWhatsApp} disabled={!code} className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-[#25D366] text-white font-semibold hover:opacity-90 transition disabled:opacity-50">
                  <MessageCircle size={18} aria-hidden="true" />WhatsApp
                </button>
                <button type="button" onClick={handleShareEmail} disabled={!code} className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-card border border-border font-semibold hover:bg-muted transition disabled:opacity-50">
                  <Mail size={18} aria-hidden="true" />Email
                </button>
                <button type="button" onClick={handleNativeShare} disabled={!code} className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-card border border-border font-semibold hover:bg-muted transition disabled:opacity-50">
                  <Share2 size={18} aria-hidden="true" />Partager
                </button>
              </div>
            </div>
          </motion.section>

          {/* Stats */}
          <section className="grid grid-cols-2 gap-3 mt-6" aria-label="Statistiques parrainage">
            <div className="stat-card-future tone-primary">
              <div className="stat-icon"><Users size={20} aria-hidden="true" /></div>
              <span className="text-overline">Amis invités</span>
              <span className="stat-number text-title">{referrals.length}</span>
            </div>
            <div className="stat-card-future tone-success">
              <div className="stat-icon"><Wallet size={20} aria-hidden="true" /></div>
              <span className="text-overline">Points gagnés</span>
              <span className="stat-number text-title">{earnedPoints}</span>
            </div>
          </section>

          {/* Comment ça marche */}
          <section className="mt-8" aria-labelledby="how-title">
            <h3 id="how-title" className="text-title font-bold mb-4">Comment ça marche</h3>
            <ol className="space-y-3">
              {[
                { n: "1", t: "Partage ton lien", d: "Envoie ton code à tes amis (WhatsApp, email, etc.)." },
                { n: "2", t: "Ton ami s'inscrit", d: `Avec ton code, il démarre avec +${REFEREE_POINTS} points fidélité.` },
                { n: "3", t: `Premier colis livré → +${REFERRER_POINTS} points pour toi`, d: "Dès que ton filleul reçoit son 1er colis livré (ou complète son 1er transport), ton bonus est crédité automatiquement." },
              ].map((step) => (
                <li key={step.n} className="card-future p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-title-sm font-bold text-primary">{step.n}</span>
                  </div>
                  <div>
                    <div className="text-body-base font-bold text-foreground">{step.t}</div>
                    <div className="text-body-small text-muted-foreground mt-0.5">{step.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Filleuls */}
          <section className="mt-8" aria-labelledby="refs-title">
            <h3 id="refs-title" className="text-title font-bold mb-4">Mes filleuls</h3>
            {loading ? (
              <div className="card-future p-6 text-center text-body-small text-muted-foreground">Chargement…</div>
            ) : referrals.length === 0 ? (
              <div className="card-future p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Users size={20} className="text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-body-base font-semibold mb-1">Aucun filleul pour l'instant</p>
                <p className="text-body-small text-muted-foreground">Partage ton lien plus haut pour commencer à gagner.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {referrals.map((r) => {
                  const name = names[r.referred_id] || "Filleul";
                  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "F";
                  const validated = isValidated(r.status);
                  return (
                    <li key={r.id} className="card-future p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">{initials}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-body-base font-semibold truncate">{name}</div>
                        <div className="text-caption-base">
                          {validated
                            ? `1er colis livré · +${REFERRER_POINTS} pts`
                            : "Inscrit · en attente du 1er colis"}
                        </div>
                      </div>
                      {validated && (<span className="chip-success"><Check size={12} aria-hidden="true" />Validé</span>)}
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && pendingCount > 0 && (
              <p className="text-caption-base text-muted-foreground mt-2 italic">
                {pendingCount} parrainage{pendingCount > 1 ? "s" : ""} en attente de validation (1er colis livré).
              </p>
            )}
          </section>

          {/* Sub CTAs */}
          <section className="mt-8 grid sm:grid-cols-2 gap-3">
            <Link to="/send" className="card-future p-4 flex items-center gap-3 hover-lift group">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"><Package size={18} className="text-primary" aria-hidden="true" /></div>
              <div className="flex-1">
                <div className="font-bold text-body-base">Envoyer un colis</div>
                <div className="text-caption-base">Encourage tes amis sender</div>
              </div>
            </Link>
            <Link to="/new-trip" className="card-future p-4 flex items-center gap-3 hover-lift group">
              <div className="w-10 h-10 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0"><Plane size={18} className="text-secondary-foreground" aria-hidden="true" /></div>
              <div className="flex-1">
                <div className="font-bold text-body-base">Publier un trajet</div>
                <div className="text-caption-base">Bonus aussi si ton filleul devient voyageur</div>
              </div>
            </Link>
          </section>

          {/* Footer note */}
          <p className="text-caption-base text-muted-foreground text-center mt-8 mb-4">
            Les points sont crédités sur ton compte fidélité Nidit dès validation. Voir <Link to="/terms" className="link-fancy">conditions du programme</Link>.
          </p>
        </main>

        <BottomNav />
      </div>
    </>
  );
}
