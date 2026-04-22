import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Mail, FileText, BookOpen, ExternalLink, ChevronRight, Shield, Zap, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";
import { hapticLight } from "@/lib/haptics";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

export default function AidePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const guides = [
    {
      icon: Zap,
      title: "Démarrage rapide",
      desc: "Créez votre premier envoi ou voyage en 2 minutes.",
      steps: [
        "Inscrivez-vous et vérifiez votre identité (KYC)",
        "Choisissez votre rôle : Voyageur ou Demandeur",
        "Voyageur : publiez un voyage • Demandeur : envoyez un colis ou créez une mission NeedIt",
        "Communiquez avec votre contact via la messagerie intégrée",
        "Confirmez la livraison avec une preuve photo",
      ],
    },
    {
      icon: Shield,
      title: "Sécuriser mes envois",
      desc: "Conseils pour protéger vos colis et transactions.",
      steps: [
        "Vérifiez toujours le profil et les avis du voyageur / expéditeur",
        "Activez l'option assurance pour les objets de valeur",
        "Prenez des photos du colis avant et après remise",
        "Utilisez uniquement la messagerie intégrée (traçabilité)",
        "Ne partagez jamais vos identifiants de paiement",
      ],
    },
    {
      icon: Clock,
      title: "Suivi & livraison",
      desc: "Comprendre chaque étape du suivi de votre colis.",
      steps: [
        "En attente : votre colis attend un voyageur",
        "Accepté : un voyageur a pris en charge votre colis",
        "En transit : le colis voyage avec le voyageur",
        "Livré : le destinataire a confirmé la réception (preuve photo)",
        "Terminé : le paiement est libéré au voyageur",
      ],
    },
  ];

  const contactOptions = [
    {
      icon: MessageCircle, label: t("help.liveChat"), desc: t("help.liveChatDesc"),
      action: () => toast.info(t("help.liveChatSoon")),
      color: "text-primary", bgColor: "bg-primary/10",
    },
    {
      icon: Mail, label: t("help.emailLabel"), desc: "support@nidit.app",
      action: () => window.open("mailto:support@nidit.app", "_blank"),
      color: "text-emerald-500", bgColor: "bg-emerald-500/10",
    },
    {
      icon: FileText, label: t("help.faqLabel"), desc: t("help.faqDesc"),
      action: "faq" as const,
      color: "text-amber-500", bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="page-shell">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-5 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary"><ArrowLeft size={28} /></button>
          <div>
            <h1 className="text-[22px] font-bold text-foreground">{t("help.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("help.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-7">
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t("help.contactSupport")}</h2>
          <div className="space-y-2.5">
            {contactOptions.map((opt, i) => {
              const Icon = opt.icon;
              return (
                <motion.button key={i} whileTap={{ scale: 0.98 }} onClick={() => { hapticLight(); if (opt.action === "faq") navigate("/faq"); else if (typeof opt.action === "function") opt.action(); }} className="w-full flex items-center gap-3.5 bg-card border border-border rounded-2xl px-4 py-3.5 text-left hover:bg-muted/30 transition-colors">
                  <div className={`w-10 h-10 rounded-xl ${opt.bgColor} flex items-center justify-center shrink-0`}><Icon size={20} className={opt.color} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t("help.guides")}</h2>
          <div className="space-y-4">
            {guides.map((guide, i) => {
              const Icon = guide.icon;
              return (
                <div key={i} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Icon size={18} className="text-primary" /></div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{guide.title}</h3>
                      <p className="text-xs text-muted-foreground">{guide.desc}</p>
                    </div>
                  </div>
                  <ol className="space-y-2 pl-1">
                    {guide.steps.map((step, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{j + 1}</span>
                        <span className="leading-snug">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t("help.usefulLinks")}</h2>
          <div className="space-y-2">
            {[
              { label: t("help.termsOfUse"), route: "/terms" },
              { label: t("help.privacyLegal"), route: "/confidentialite" },
              { label: t("help.verifyIdentity"), route: "/kyc" },
            ].map((link, i) => (
              <motion.button key={i} whileTap={{ scale: 0.98 }} onClick={() => { hapticLight(); navigate(link.route); }} className="w-full flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3.5 text-left hover:bg-muted/30 transition-colors">
                <span className="text-sm font-medium text-foreground">{link.label}</span>
                <ExternalLink size={14} className="text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        </section>

        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">Nidit · Version 1.0.0</p>
          <p className="text-xs text-muted-foreground mt-0.5">© 2026 Tous droits réservés</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
