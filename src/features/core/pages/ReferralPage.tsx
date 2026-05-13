/**
 * ReferralPage — Programme de parrainage 2-sens (V14).
 *
 * Route : /parrainage (ProtectedRoute)
 *
 * Mécanique :
 *  - Sender invite un ami → 10 € à chacun à son 1er colis envoyé
 *  - Voyageur invite un voyageur → 20 € à chacun au 1er transport
 *
 * Backend à wirer (TODO côté user) :
 *  - Table `referrals` Supabase : { code, owner_id, redeemed_by, reward_eur, status, created_at }
 *  - Edge function `redeem-referral?code=...` qui crée la ligne et lock le bonus
 *  - Trigger Postgres sur `colis.delivered` qui libère le bonus dans le wallet
 *
 * Pour l'instant : génération de code déterministe depuis user.id (hash),
 * UI complète prête, mock des filleuls (sera remplacé par fetch Supabase).
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Gift, Copy, Check, Share2, Mail, MessageCircle, Send,
  Users, Wallet, Sparkles, ArrowLeft, Package, Plane,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { haptic } from "@/hooks/useHaptic";

// Génère un code de parrainage court et lisible depuis le user.id
function generateReferralCode(userId: string | null | undefined): string {
  if (!userId) return "NIDIT";
  // Hash simple : prend les 6 premiers caractères alphanumériques uppercased
  const hash = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
  return hash || "NIDIT";
}

interface ReferralStats {
  totalInvited: number;
  activeReferrals: number;
  earnedEUR: number;
  pendingEUR: number;
}

interface Referral {
  id: string;
  initials: string;
  firstName: string;
  status: "pending" | "signed-up" | "first-shipment";
  reward: number;
  date: string;
}

export default function ReferralPage() {
  const { user } = useAuth();
  const code = useMemo(() => generateReferralCode(user?.id), [user?.id]);
  const referralUrl = `https://nidit.fr/signup?ref=${code}`;
  const [copied, setCopied] = useState(false);

  // TODO V14.1 : remplacer par fetch Supabase
  const stats: ReferralStats = { totalInvited: 0, activeReferrals: 0, earnedEUR: 0, pendingEUR: 0 };
  const referrals: Referral[] = [];

  useEffect(() => {
    document.title = "Parrainage — Nidit";
  }, []);

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

  const shareText = `Je te recommande Nidit pour envoyer tes colis via des voyageurs vérifiés. Tu obtiens 10 € sur ton 1er envoi avec mon code : ${code}\n${referralUrl}`;

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
        <meta name="description" content="Invite tes amis sur Nidit et gagnez chacun 10 €. Programme de parrainage 2-sens." />
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
              <h2 id="referral-hero-title" className="text-title-lg font-bold mb-3">Invite tes amis,<br />gagnez chacun 10 € → 20 €</h2>
              <p className="text-body-base text-muted-foreground max-w-md mx-auto mb-6">
                Sender qui invite un sender : <strong className="text-foreground">10 € à chacun</strong> au 1<sup>er</sup> envoi de ton filleul.<br />
                Voyageur qui invite un voyageur : <strong className="text-foreground">20 € à chacun</strong> au 1<sup>er</sup> transport.
              </p>

              {/* Code & lien */}
              <div className="bg-card rounded-2xl border border-border/60 p-4 mb-5 text-left">
                <div className="text-overline mb-2">Ton code de parrainage</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-display-sm font-extrabold tracking-widest text-primary" style={{ fontFamily: "ui-monospace, monospace" }}>{code}</span>
                  <button type="button" onClick={handleCopy} className="btn-cta-secondary text-sm h-10 px-4" aria-label="Copier le lien">
                    {copied ? (<><Check size={16} aria-hidden="true" />Copié</>) : (<><Copy size={16} aria-hidden="true" />Copier</>)}
                  </button>
                </div>
                <div className="mt-3 text-caption-base text-muted-foreground break-all">{referralUrl}</div>
              </div>

              {/* Share buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={handleShareWhatsApp} className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-[#25D366] text-white font-semibold hover:opacity-90 transition">
                  <MessageCircle size={18} aria-hidden="true" />WhatsApp
                </button>
                <button type="button" onClick={handleShareEmail} className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-card border border-border font-semibold hover:bg-muted transition">
                  <Mail size={18} aria-hidden="true" />Email
                </button>
                <button type="button" onClick={handleNativeShare} className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full bg-card border border-border font-semibold hover:bg-muted transition">
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
              <span className="stat-number text-title">{stats.totalInvited}</span>
            </div>
            <div className="stat-card-future tone-success">
              <div className="stat-icon"><Wallet size={20} aria-hidden="true" /></div>
              <span className="text-overline">Gagné</span>
              <span className="stat-number text-title">{stats.earnedEUR} €</span>
            </div>
          </section>

          {/* Comment ça marche */}
          <section className="mt-8" aria-labelledby="how-title">
            <h3 id="how-title" className="text-title font-bold mb-4">Comment ça marche</h3>
            <ol className="space-y-3">
              {[
                { n: "1", t: "Partage ton lien", d: "Envoie ton code à tes amis (WhatsApp, email, etc.)." },
                { n: "2", t: "Ton ami s'inscrit", d: "Avec ton code, il bénéficie automatiquement de 10 € de bienvenue." },
                { n: "3", t: "Premier envoi → 10 € pour toi", d: "Dès que ton filleul effectue son 1er envoi (ou 20 € s'il devient voyageur), tu reçois ton bonus." },
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
            {referrals.length === 0 ? (
              <div className="card-future p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Users size={20} className="text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-body-base font-semibold mb-1">Aucun filleul pour l'instant</p>
                <p className="text-body-small text-muted-foreground">Partage ton lien plus haut pour commencer à gagner.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {referrals.map((r) => (
                  <li key={r.id} className="card-future p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">{r.initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-body-base font-semibold">{r.firstName}</div>
                      <div className="text-caption-base">{r.status === "pending" ? "En attente d'inscription" : r.status === "signed-up" ? "Inscrit · pas encore d'envoi" : `1er envoi réalisé · +${r.reward} €`}</div>
                    </div>
                    {r.status === "first-shipment" && (<span className="chip-success"><Check size={12} aria-hidden="true" />Validé</span>)}
                  </li>
                ))}
              </ul>
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
                <div className="text-caption-base">+20 € si ton filleul devient voyageur</div>
              </div>
            </Link>
          </section>

          {/* Footer note */}
          <p className="text-caption-base text-muted-foreground text-center mt-8 mb-4">
            Les bonus sont crédités sur ton portefeuille Nidit dès validation. Voir <Link to="/terms" className="link-fancy">conditions du programme</Link>.
          </p>
        </main>

        <BottomNav />
      </div>
    </>
  );
}
