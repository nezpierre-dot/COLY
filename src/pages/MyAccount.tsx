import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Camera, Pencil, X, Save, ChevronDown, User, Settings, Shield, CreditCard, HelpCircle, ShieldCheck, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MyAccount = () => {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const userId = user?.id?.slice(0, 6) || "000000";
  const meta = user?.user_metadata || {};

  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState(meta.full_name || "");
  const [phone, setPhone] = useState(meta.phone || "");
  const [email] = useState(user?.email || "");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image trop volumineuse (max 5 Mo)"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), phone: phone.trim() },
    });
    if (error) toast.error(error.message);
    else { toast.success("Profil mis à jour"); setEditing(false); }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleAccordion = (id: string) => setOpenAccordion(openAccordion === id ? null : id);

  const inputClass = "w-full border-b border-muted-foreground/30 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none bg-transparent text-sm";

  const accordionSections = [
    {
      id: "profile",
      icon: User,
      label: "Mon Profil",
      items: [
        { label: "Mes informations", onClick: () => navigate("/my-info") },
      ],
    },
    {
      id: "settings",
      icon: Settings,
      label: "Réglages",
      items: [
        { label: "Réglage voyageur", onClick: () => navigate("/voyageur-settings") },
        { label: "Réglage expéditeur", onClick: () => navigate("/settings") },
        { label: "Paramètres de l'application", onClick: () => navigate("/settings") },
      ],
    },
    {
      id: "finance",
      icon: CreditCard,
      label: "Finance & Comptabilité",
      items: [
        { label: "Comptabilité", onClick: () => navigate("/comptabilite") },
      ],
    },
    {
      id: "security",
      icon: Lock,
      label: "Sécurité",
      items: [
        { label: "Confidentialité / Mentions légales", onClick: () => navigate("/confidentialite") },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <h1 className="text-[28px] font-bold text-foreground mb-2">Mon Compte</h1>
        <p className="text-sm text-muted-foreground mb-8">Gérez votre profil et vos paramètres</p>

        {/* Avatar + Info with inline edit */}
        <div className="flex items-start gap-5 mb-8">
          <div className="relative shrink-0">
            <div
              className="w-28 h-28 rounded-2xl bg-muted flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={() => fileRef.current?.click()}
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-muted-foreground">👤</span>
              )}
              <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                <Camera size={22} className="text-white" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="flex-1 space-y-2.5">
            <div>
              <p className="text-base font-bold text-foreground">Voyageur</p>
              <p className="text-xs text-muted-foreground">N°{userId.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Expéditeur</p>
              <p className="text-xs text-muted-foreground">N°{(parseInt(userId, 16) % 999999).toString().padStart(6, "0")}</p>
            </div>
          </div>

          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
          >
            {editing ? <Save size={20} /> : <Pencil size={20} />}
          </button>
        </div>

        {/* Inline edit panel */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-muted/50 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Modifier mes informations</h3>
                  <button onClick={() => setEditing(false)} className="text-muted-foreground"><X size={16} /></button>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Nom complet</label>
                  <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Prénom Nom" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Téléphone</label>
                  <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <p className="text-sm text-muted-foreground py-2">{email}</p>
                </div>
                <button
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Accordion sections */}
        <div className="space-y-3 mb-8">
          {accordionSections.map((section) => {
            const isOpen = openAccordion === section.id;
            const Icon = section.icon;
            return (
              <div key={section.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => toggleAccordion(section.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <span className="flex-1 text-base font-semibold text-foreground">{section.label}</span>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border divide-y divide-border">
                        {section.items.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={item.onClick}
                            className="w-full text-left px-4 py-3.5 text-sm text-foreground hover:bg-muted/50 transition-colors pl-14"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* FAQ / Aide */}
        <div className="flex gap-4 mb-4">
          <button className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2">
            <HelpCircle size={20} /> FAQ
          </button>
          <button className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2">
            <HelpCircle size={20} /> Aide
          </button>
        </div>

        {/* 2FA Security Prompt */}
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Protégez votre compte</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Activez l'authentification à deux facteurs (2FA) pour renforcer la sécurité de votre compte.
              </p>
              <button
                onClick={() => toast.info("La double authentification sera bientôt disponible")}
                className="mt-2 text-xs font-semibold text-accent hover:underline flex items-center gap-1"
              >
                <Lock size={11} /> Activer la 2FA →
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-colors"
        >
          Se déconnecter
        </button>

        {/* Logout confirmation dialog */}
        <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir vous déconnecter de votre compte ? Vous devrez vous reconnecter pour accéder à vos données.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Déconnexion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <BottomNav />
    </div>
  );
};

export default MyAccount;
