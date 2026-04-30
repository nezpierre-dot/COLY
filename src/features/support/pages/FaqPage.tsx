import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Search, Package, Plane, ShoppingCart, CreditCard, Shield, HelpCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { hapticLight } from "@/lib/haptics";
import { useTranslation } from "@/hooks/useTranslation";

interface FaqItem { q: string; a: string; }
interface FaqCategory { id: string; icon: React.ElementType; label: string; items: FaqItem[]; }

export default function FaqPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // FAQ content (Q/A stays in source FR — translated content via dedicated keys would balloon dict.
  // Category labels are localized via t().)
  const faqData: FaqCategory[] = [
    {
      id: "general", icon: HelpCircle, label: t("faq.cat.general"),
      items: [
        { q: "Comment fonctionne l'application ?", a: "Notre application connecte les voyageurs et les expéditeurs. Les voyageurs proposent leurs trajets et transportent des colis pour les expéditeurs. Les demandeurs peuvent aussi créer des missions NeedIt pour qu'un voyageur achète un produit à l'étranger." },
        { q: "Est-ce légal ?", a: "Oui, le transport de colis entre particuliers est légal tant que les produits respectent la réglementation douanière et les lois en vigueur. Nous vérifions l'identité des utilisateurs (KYC) pour garantir la sécurité." },
        { q: "Dans quels pays le service est-il disponible ?", a: "Le service est disponible dans le monde entier. Vous pouvez envoyer des colis ou créer des missions NeedIt vers n'importe quelle destination où un voyageur propose un trajet." },
      ],
    },
    {
      id: "envois", icon: Package, label: t("faq.cat.envois"),
      items: [
        { q: "Comment envoyer un colis ?", a: "Rendez-vous dans l'espace Expéditeur, cliquez sur 'Envoyer un coly', remplissez les informations (destination, taille, tarif proposé) et attendez qu'un transporteur accepte votre envoi." },
        { q: "Quelle taille de colis puis-je envoyer ?", a: "Les tailles vont de S (petit, type enveloppe) à XL (grand, type valise). Chaque voyageur décide des tailles qu'il peut transporter selon son espace disponible." },
        { q: "Que se passe-t-il si mon colis est endommagé ?", a: "Si vous avez souscrit l'option d'assurance lors de l'envoi, vous êtes couvert. Contactez notre support avec la preuve de livraison et les photos du dommage pour lancer une réclamation." },
        { q: "Comment suivre mon colis ?", a: "Chaque envoi dispose d'un suivi en temps réel. Vous recevez des notifications à chaque étape : acceptation, prise en charge, en transit, et livraison avec preuve photo." },
      ],
    },
    {
      id: "voyages", icon: Plane, label: t("faq.cat.voyages"),
      items: [
        { q: "Comment proposer un voyage ?", a: "Dans l'espace Transporteur, cliquez sur 'Ajouter un voyage'. Indiquez votre trajet (départ, arrivée), les dates, le moyen de transport et vos préférences." },
        { q: "Combien puis-je gagner en tant que voyageur ?", a: "Les gains dépendent du tarif proposé par l'expéditeur. En moyenne, un voyageur gagne entre 10€ et 80€ par colis transporté, selon la distance et la taille." },
        { q: "Puis-je annuler un voyage ?", a: "Oui, vous pouvez annuler un voyage tant qu'aucun colis n'a été pris en charge." },
      ],
    },
    {
      id: "needit", icon: ShoppingCart, label: t("faq.cat.needit"),
      items: [
        { q: "Qu'est-ce qu'une mission NeedIt ?", a: "NeedIt permet de demander à un voyageur d'acheter un produit spécifique à l'étranger." },
        { q: "Comment fixer le prix maximum ?", a: "Le prix max inclut le prix du produit + la commission du voyageur. Vous pouvez scanner le code-barres (EAN) pour vérifier le prix." },
        { q: "Et si le produit n'est pas disponible ?", a: "Le voyageur vous contactera via la messagerie intégrée pour proposer une alternative ou annuler la mission." },
      ],
    },
    {
      id: "paiement", icon: CreditCard, label: t("faq.cat.paiement"),
      items: [
        { q: "Quand suis-je payé en tant que voyageur ?", a: "Le paiement est déclenché après la confirmation de livraison par le destinataire (preuve photo)." },
        { q: "Quels moyens de paiement sont acceptés ?", a: "Nous acceptons les cartes bancaires (Visa, Mastercard), Apple Pay et les virements SEPA." },
        { q: "Y a-t-il des frais de service ?", a: "Une commission de service est appliquée sur chaque transaction. Le montant exact est indiqué avant validation." },
      ],
    },
    {
      id: "securite", icon: Shield, label: t("faq.cat.securite"),
      items: [
        { q: "Pourquoi dois-je vérifier mon identité (KYC) ?", a: "La vérification d'identité protège tous les utilisateurs contre la fraude." },
        { q: "Mes données sont-elles protégées ?", a: "Vos données personnelles sont chiffrées et stockées conformément au RGPD." },
        { q: "Comment signaler un problème ?", a: "Utilisez la section Aide > Contacter le support. Notre équipe traite chaque signalement sous 24h." },
      ],
    },
  ];
  const [search, setSearch] = useState("");
  const [openItem, setOpenItem] = useState<string | null>(null);

  const filtered = search.trim()
    ? faqData.map((cat) => ({ ...cat, items: cat.items.filter((i) => i.q.toLowerCase().includes(search.toLowerCase()) || i.a.toLowerCase().includes(search.toLowerCase())) })).filter((cat) => cat.items.length > 0)
    : faqData;

  return (
    <div className="page-shell">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="text-primary"><ArrowLeft size={28} /></button>
          <div>
            <h1 className="text-[22px] font-bold text-foreground">{t("faq.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("faq.subtitle")}</p>
          </div>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("faq.searchPlaceholder")} className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">{t("faq.noResults")} "{search}"</p>
          </div>
        )}

        {filtered.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Icon size={16} className="text-primary" /></div>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{cat.label}</h2>
              </div>
              <div className="space-y-2">
                {cat.items.map((item, idx) => {
                  const key = `${cat.id}-${idx}`;
                  const isOpen = openItem === key;
                  return (
                    <div key={key} className="bg-card border border-border rounded-2xl overflow-hidden">
                      <motion.button whileTap={{ scale: 0.99 }} onClick={() => { hapticLight(); setOpenItem(isOpen ? null : key); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                        <span className="flex-1 text-sm font-medium text-foreground">{item.q}</span>
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={16} className="text-muted-foreground shrink-0" /></motion.div>
                      </motion.button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="px-4 pb-4 border-t border-border pt-3"><p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p></div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
