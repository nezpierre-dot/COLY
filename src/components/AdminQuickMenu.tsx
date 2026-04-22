import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Gavel, Users, Settings, Tags, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Counts {
  disputes: number;
  pendingMatching: number;
  unreadAlerts: number;
}

const AdminQuickMenu = () => {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({ disputes: 0, pendingMatching: 0, unreadAlerts: 0 });

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const [disputesRes, pendShipRes, pendMissRes, alertsRes] = await Promise.all([
        supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "investigating"]),
        supabase.from("shipments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("needit_missions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("admin_alerts").select("id", { count: "exact", head: true }).eq("is_read", false),
      ]);
      setCounts({
        disputes: disputesRes.count ?? 0,
        pendingMatching: (pendShipRes.count ?? 0) + (pendMissRes.count ?? 0),
        unreadAlerts: alertsRes.count ?? 0,
      });
    };
    load();
  }, [isAdmin]);

  if (!isAdmin) return null;

  const totalToProcess = counts.disputes + counts.pendingMatching + counts.unreadAlerts;

  const shortcuts = [
    { label: "Litiges", icon: Gavel, badge: counts.disputes, tab: "disputes", color: "text-warning" },
    { label: "Matching", icon: Users, badge: counts.pendingMatching, tab: "matching", color: "text-accent" },
    { label: "Catégories", icon: Tags, badge: 0, tab: "config", color: "text-primary" },
    { label: "Utilisateurs", icon: Users, badge: 0, tab: "users", color: "text-primary" },
    { label: "Paramètres", icon: Settings, badge: 0, tab: "config", color: "text-muted-foreground" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/15 transition-colors"
        aria-label="Menu admin rapide"
      >
        <Shield size={13} />
        <span>Admin</span>
        {totalToProcess > 0 && (
          <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {totalToProcess > 99 ? "99+" : totalToProcess}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 mt-2 w-64 z-50 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-destructive/5 to-transparent">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Shield size={13} className="text-destructive" /> Espace administrateur
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {totalToProcess > 0
                    ? `${totalToProcess} élément${totalToProcess > 1 ? "s" : ""} à traiter`
                    : "Aucune action requise ✨"}
                </p>
              </div>
              <div className="p-1.5">
                {shortcuts.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      navigate(`/admin?tab=${s.tab}`);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left"
                  >
                    <s.icon size={15} className={s.color} />
                    <span className="flex-1 text-sm font-medium text-foreground">{s.label}</span>
                    {s.badge > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold flex items-center justify-center">
                        {s.badge > 99 ? "99+" : s.badge}
                      </span>
                    )}
                    <ChevronRight size={13} className="text-muted-foreground" />
                  </button>
                ))}
                <button
                  onClick={() => {
                    navigate("/admin");
                    setOpen(false);
                  }}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 transition-colors"
                >
                  Ouvrir le tableau de bord complet →
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminQuickMenu;
