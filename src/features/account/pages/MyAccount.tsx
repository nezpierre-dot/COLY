import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Camera, Pencil, X, Save, ChevronDown, User, Settings, Shield, CreditCard, HelpCircle, ShieldCheck, Lock, Star, Plane, Package, TrendingUp, Award, BadgeCheck, Coins, Globe, Rocket, ShoppingCart, Trophy, Wallet, BarChart3 } from "lucide-react";
import TrustBadgesDisplay from "@/components/TrustBadgesDisplay";
import ReferralSection from "@/components/ReferralSection";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useTranslation } from "@/hooks/useTranslation";
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
  const { t } = useTranslation();
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
  const [activityDates, setActivityDates] = useState<string[]>([]);
  const [trustBadges, setTrustBadges] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_rating", { _user_id: user.id }).then(({ data }) => {
      if (data && data.length > 0 && data[0].total_ratings > 0) setRating(data[0]);
    });
    supabase.from("profiles").select("bio, avatar_url, kyc_status, trust_badges").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setBio((data as any).bio || "");
        if ((data as any).avatar_url) setAvatar((data as any).avatar_url);
        setKycStatus(data.kyc_status || "pending");
        setTrustBadges((data as any).trust_badges || []);
      }
    });
    // Compute and update trust badges
    supabase.rpc("compute_trust_badges", { _user_id: user.id }).then(({ data }) => {
      if (data) {
        setTrustBadges(data as string[]);
        supabase.from("profiles").update({ trust_badges: data } as any).eq("user_id", user.id);
      }
    });
    Promise.all([
      supabase.from("voyages").select("id, created_at", { count: "exact" }).eq("user_id", user.id),
      supabase.from("shipments").select("id, tarif, created_at", { count: "exact" }).eq("user_id", user.id),
      supabase.from("needit_missions").select("id, created_at", { count: "exact", head: false }).eq("user_id", user.id),
      supabase.from("shipments").select("tarif").eq("voyageur_id", user.id).eq("status", "delivered"),
    ]).then(([v, s, m, earned]) => {
      setStats({
        voyages: v.count || 0,
        shipments: s.count || 0,
        missions: m.count || 0,
      });
      const total = (earned.data || []).reduce((sum, sh) => {
        const num = parseFloat(sh.tarif?.replace(/[^0-9.,]/g, "").replace(",", ".") || "0");
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
      setTotalEarned(total);
      // Collect all activity dates
      const dates: string[] = [];
      (v.data || []).forEach((item: any) => dates.push(item.created_at));
      (s.data || []).forEach((item: any) => dates.push(item.created_at));
      (m.data || []).forEach((item: any) => dates.push(item.created_at));
      setActivityDates(dates);
    });
  }, [user]);

  // Activity chart data (last 30 days)
  const activityChartData = useMemo(() => {
    const now = new Date();
    const days: { name: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      const count = activityDates.filter(dt => dt?.startsWith(key)).length;
      days.push({ name: label, value: count });
    }
    return days;
  }, [activityDates]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t("account.avatarTooLarge")); return; }

    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast.error(t("account.uploadError")); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();

    await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("user_id", user.id);
    setAvatar(publicUrl);
    hapticSuccess();
    toast.success(t("account.avatarUpdated"));
  };

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), phone: phone.trim() },
    });
    await supabase.from("profiles").update({ bio: bio.trim() } as any).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else { hapticSuccess(); toast.success(t("account.profileUpdated")); setEditing(false); }
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
    ...(kycStatus === "verified" ? [{ icon: <BadgeCheck size={14} className="text-emerald-400" />, label: t("account.badge.verified"), highlight: true }] : []),
    ...(stats.voyages >= 1 ? [{ icon: <Plane size={14} className="text-primary" />, label: t("account.badge.firstFlight") }] : []),
    ...(stats.voyages >= 10 ? [{ icon: <Globe size={14} className="text-blue-400" />, label: t("account.badge.globeTrotter") }] : []),
    ...(stats.shipments >= 5 ? [{ icon: <Package size={14} className="text-accent" />, label: t("account.badge.activeSender") }] : []),
    ...(stats.shipments >= 20 ? [{ icon: <Rocket size={14} className="text-purple-400" />, label: t("account.badge.sendExpert") }] : []),
    ...(stats.missions >= 3 ? [{ icon: <ShoppingCart size={14} className="text-secondary" />, label: t("account.badge.needitHunter") }] : []),
    ...(stats.missions >= 10 ? [{ icon: <Trophy size={14} className="text-amber-400" />, label: t("account.badge.tenMissions") }] : []),
    ...(totalEarned >= 100 ? [{ icon: <Wallet size={14} className="text-emerald-400" />, label: t("account.badge.earned100") }] : []),
    ...(rating && rating.average_score >= 4.5 ? [{ icon: <Star size={14} className="text-amber-400" />, label: t("account.badge.topRated") }] : []),
  ];

  const accordionSections = [
    {
      id: "profile",
      icon: User,
      label: t("account.myProfile"),
      items: [
        { label: t("account.myInfo"), onClick: () => navigate("/my-info") },
      ],
    },
    {
      id: "settings",
      icon: Settings,
      label: t("account.settingsLabel"),
      items: [
        { label: "Paramètres utilisateur", onClick: () => navigate("/voyageur-settings") },
        { label: t("account.appSettings"), onClick: () => navigate("/settings") },
      ],
    },
    {
      id: "finance",
      icon: CreditCard,
      label: t("account.finance"),
      items: [
        { label: t("account.accounting"), onClick: () => navigate("/comptabilite") },
      ],
    },
    {
      id: "security",
      icon: Lock,
      label: t("account.securitySection"),
      items: [
        { label: t("account.privacy"), onClick: () => navigate("/confidentialite") },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px) + 16px)" }}>
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
            {fullName || t("account.user")}
            </h1>
            <p className="text-white/70 text-xs mt-0.5 text-on-gradient">
              {isVoyageur ? t("account.voyageur") : t("account.sender")} · N°{userId.toUpperCase()}
            </p>

            {bio && !editing && (
              <p className="text-white/70 text-xs mt-1.5 line-clamp-2 italic">"{bio}"</p>
            )}

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
                <span className="text-white/40 text-xs">({rating.total_ratings} {t("account.reviews")})</span>
              </div>
            ) : (
              <p className="text-white/40 text-xs mt-2">{t("account.notRated")}</p>
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
            { value: stats.voyages, label: t("account.voyages"), icon: Plane },
            { value: stats.shipments, label: t("account.sends"), icon: Package },
            { value: stats.missions, label: t("account.missionsStat"), icon: TrendingUp },
            { value: `${totalEarned.toFixed(0)}€`, label: t("account.earned"), icon: Coins },
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
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("account.badges")}</h3>
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

        {/* Recent activity chart */}
        {activityChartData.some(d => d.value > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-4 mb-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <BarChart3 size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">{t("account.recentActivity") || "Activité récente"}</span>
              </div>
              <span className="text-xs text-muted-foreground">30j</span>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityChartData}>
                  <defs>
                    <linearGradient id="colorProfileActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorProfileActivity)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
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
                  <h3 className="text-lg font-semibold text-foreground">{t("account.editInfo")}</h3>
                  <button onClick={() => setEditing(false)} className="text-muted-foreground"><X size={16} /></button>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t("account.fullName")}</label>
                  <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("account.namePlaceholder")} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t("account.bio")}</label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={2}
                    maxLength={120}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t("account.bioPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground text-right mt-0.5">{bio.length}/120</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t("account.phoneLabel")}</label>
                  <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t("account.emailLabel")}</label>
                  <p className="text-sm text-muted-foreground py-2">{email}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  {t("common.save")}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust Badges */}
        {trustBadges.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck size={14} className="text-primary" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Badges de confiance</h3>
            </div>
            <TrustBadgesDisplay badges={trustBadges} />
          </div>
        )}

        {/* Referral Section */}
        <div className="mb-6">
          <ReferralSection />
        </div>

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

        {/* FAQ / Help */}
        <div className="flex gap-4 mb-4">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/faq")} className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2">
            <HelpCircle size={20} /> FAQ
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/aide")} className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2">
            <HelpCircle size={20} /> {t("account.helpLabel")}
          </motion.button>
        </div>

        {/* 2FA Security Prompt */}
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{t("account.protectAccount")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("account.protectAccountDesc")}
              </p>
              <button
                onClick={() => toast.info(t("account.2FASoon"))}
                className="mt-2 text-xs font-semibold text-accent hover:underline flex items-center gap-1"
              >
                <Lock size={11} /> {t("account.enable2FA")} →
              </button>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-colors"
        >
          {t("common.logout")}
        </motion.button>

        {/* Logout confirmation dialog */}
        <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <AlertDialogContent className="max-w-sm mx-auto rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("account.logoutConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("account.logoutDesc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("common.logout")}
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
