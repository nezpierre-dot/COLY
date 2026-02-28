import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Camera, Pencil, X, Save, ChevronDown, User, Settings, Shield, CreditCard, HelpCircle, ShieldCheck, Lock, Star, Plane, Package, TrendingUp, Award, BadgeCheck, Coins, Globe, Rocket, ShoppingCart, Trophy, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
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
  const isVoyageur = roles.includes("voyageur");

  const userId = user?.id?.slice(0, 6) || "000000";
  const meta = user?.user_metadata || {};

  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState(meta.full_name || "");
  const [phone, setPhone] = useState(meta.phone || "");
  const [bio, setBio] = useState("");
  const [email] = useState(user?.email || "");
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  // Stats & rating
  const [rating, setRating] = useState<{ average_score: number; total_ratings: number } | null>(null);
  const [stats, setStats] = useState({ voyages: 0, shipments: 0, missions: 0 });
  const [kycStatus, setKycStatus] = useState("pending");
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Load rating
    supabase.rpc("get_user_rating", { _user_id: user.id }).then(({ data }) => {
      if (data && data.length > 0 && data[0].total_ratings > 0) setRating(data[0]);
    });
    // Load profile (bio, avatar, kyc)
    supabase.from("profiles").select("bio, avatar_url, kyc_status").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setBio((data as any).bio || "");
        if ((data as any).avatar_url) setAvatar((data as any).avatar_url);
        setKycStatus(data.kyc_status || "pending");
      }
    });
    // Load stats + earnings
    Promise.all([
      supabase.from("voyages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("shipments").select("id, tarif", { count: "exact" }).eq("user_id", user.id),
      supabase.from("needit_missions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      // Shipments where user is voyageur (earned money)
      supabase.from("shipments").select("tarif").eq("voyageur_id", user.id).eq("status", "delivered"),
    ]).then(([v, s, m, earned]) => {
      setStats({
        voyages: v.count || 0,
        shipments: s.count || 0,
        missions: m.count || 0,
      });
      // Sum up earned tarifs
      const total = (earned.data || []).reduce((sum, sh) => {
        const num = parseFloat(sh.tarif?.replace(/[^0-9.,]/g, "").replace(",", ".") || "0");
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
      setTotalEarned(total);
    });
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image trop volumineuse (max 5 Mo)"); return; }

    // Preview immediately
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);

    // Upload to storage
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Erreur upload avatar"); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();

    // Save to profile
    await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("user_id", user.id);
    setAvatar(publicUrl);
    hapticSuccess();
    toast.success("Photo de profil mise à jour");
  };

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), phone: phone.trim() },
    });
    // Save bio to profile
    await supabase.from("profiles").update({ bio: bio.trim() } as any).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else { hapticSuccess(); toast.success("Profil mis à jour"); setEditing(false); }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleAccordion = (id: string) => { hapticLight(); setOpenAccordion(openAccordion === id ? null : id); };

  const inputClass = "w-full border-b border-muted-foreground/30 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none bg-transparent text-sm";

  // Badges
  const badges = [
    ...(kycStatus === "verified" ? [{ icon: <BadgeCheck size={14} className="text-emerald-400" />, label: "Vérifié", highlight: true }] : []),
    ...(stats.voyages >= 1 ? [{ icon: <Plane size={14} className="text-primary" />, label: "Premier vol" }] : []),
    ...(stats.voyages >= 10 ? [{ icon: <Globe size={14} className="text-blue-400" />, label: "Globe-trotter" }] : []),
    ...(stats.shipments >= 5 ? [{ icon: <Package size={14} className="text-accent" />, label: "Expéditeur actif" }] : []),
    ...(stats.shipments >= 20 ? [{ icon: <Rocket size={14} className="text-purple-400" />, label: "Expert envoi" }] : []),
    ...(stats.missions >= 3 ? [{ icon: <ShoppingCart size={14} className="text-secondary" />, label: "Chasseur NeedIt" }] : []),
    ...(stats.missions >= 10 ? [{ icon: <Trophy size={14} className="text-amber-400" />, label: "10 missions" }] : []),
    ...(totalEarned >= 100 ? [{ icon: <Wallet size={14} className="text-emerald-400" />, label: "100€ gagnés" }] : []),
    ...(rating && rating.average_score >= 4.5 ? [{ icon: <Star size={14} className="text-amber-400" />, label: "Top noté" }] : []),
  ];

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
      {/* Profile Hero Banner */}
      <div
        className="relative overflow-hidden px-6 pt-12 pb-8"
        style={{
          background: "linear-gradient(to bottom, #005BB5, #007AFF, rgba(52, 199, 89, 0.12))"
        }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute bottom-0 -left-6 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative z-10 flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="w-24 h-24 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden cursor-pointer group backdrop-blur-sm"
              onClick={() => fileRef.current?.click()}
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-white/60" />
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                <Camera size={24} className="text-white" />
              </div>
            </motion.div>
            {kycStatus === "verified" ? (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-background">
                <BadgeCheck size={14} className="text-white" />
              </div>
            ) : (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center border-2 border-background">
                <CheckCircle2 size={14} className="text-white" />
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Name, bio & rating */}
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-xl font-bold text-white truncate text-on-gradient">
              {fullName || "Utilisateur"}
            </h1>
            <p className="text-white/70 text-xs mt-0.5 text-on-gradient">
              {isVoyageur ? "Voyageur" : "Expéditeur"} · N°{userId.toUpperCase()}
            </p>

            {/* Bio */}
            {bio && !editing && (
              <p className="text-white/70 text-xs mt-1.5 line-clamp-2 italic">"{bio}"</p>
            )}

            {/* Star rating */}
            {rating ? (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      className={s <= Math.round(rating.average_score) ? "text-amber-400" : "text-white/20"}
                      fill={s <= Math.round(rating.average_score) ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <span className="text-white/80 text-xs font-semibold">{rating.average_score}</span>
                <span className="text-white/40 text-xs">({rating.total_ratings} avis)</span>
              </div>
            ) : (
              <p className="text-white/40 text-xs mt-2">Pas encore noté</p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { hapticLight(); editing ? handleSave() : setEditing(true); }}
            className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
          >
            {editing ? <Save size={20} /> : <Pencil size={20} />}
          </motion.button>
        </div>
      </div>

      <div className="px-6 -mt-4 relative z-10">
        {/* Quick stats row */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { value: stats.voyages, label: "Voyages", icon: Plane },
            { value: stats.shipments, label: "Envois", icon: Package },
            { value: stats.missions, label: "Missions", icon: TrendingUp },
            { value: `${totalEarned.toFixed(0)}€`, label: "Gagnés", icon: Coins },
          ].map((s) => (
            <motion.div
              key={s.label}
              whileTap={{ scale: 0.97 }}
              className="bg-card border border-border rounded-2xl p-3 text-center shadow-sm"
            >
              <s.icon size={16} className="text-primary mx-auto mb-1" />
              <p className="text-base font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-2">
              <Award size={14} className="text-accent" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Badges</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {badges.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 400, damping: 20 }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    (b as any).highlight
                      ? "bg-emerald-500/15 border-emerald-500/30"
                      : "bg-accent/10 border-accent/20"
                  }`}
                >
                  <span className="shrink-0">{(b as any).icon}</span>
                  <span className="text-xs font-semibold text-foreground">{b.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

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
                  <label className="text-xs text-muted-foreground">Bio</label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={2}
                    maxLength={120}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Décrivez-vous en quelques mots…"
                  />
                  <p className="text-xs text-muted-foreground text-right mt-0.5">{bio.length}/120</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Téléphone</label>
                  <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <p className="text-sm text-muted-foreground py-2">{email}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Enregistrer
                </motion.button>
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
                <motion.button
                  whileTap={{ scale: 0.99 }}
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
                </motion.button>
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
                          <motion.button
                            key={idx}
                            whileTap={{ scale: 0.98 }}
                            onClick={item.onClick}
                            className="w-full text-left px-4 py-3.5 text-sm text-foreground hover:bg-muted/50 transition-colors pl-14"
                          >
                            {item.label}
                          </motion.button>
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
          <motion.button whileTap={{ scale: 0.97 }} className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2">
            <HelpCircle size={20} /> FAQ
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2">
            <HelpCircle size={20} /> Aide
          </motion.button>
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

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-colors"
        >
          Se déconnecter
        </motion.button>

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
