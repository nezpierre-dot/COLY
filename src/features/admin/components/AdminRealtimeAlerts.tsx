import { useState, useEffect } from "react";
import { AlertTriangle, AlertCircle, Info, Bell, Check, X, RefreshCw, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface AdminAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
  resolved_at: string | null;
  created_at: string;
}

const SEVERITY_CONFIG: Record<string, { icon: any; bg: string; border: string; text: string; badge: string }> = {
  critical: { icon: AlertTriangle, bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", badge: "bg-destructive text-destructive-foreground" },
  warning: { icon: AlertCircle, bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-600", badge: "bg-yellow-500 text-white" },
  info: { icon: Info, bg: "bg-primary/10", border: "border-primary/30", text: "text-primary", badge: "bg-primary text-primary-foreground" },
};

const AdminRealtimeAlerts = () => {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [thresholdAlerts, setThresholdAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadAlerts();
    checkThresholds();

    // Realtime subscription
    const channel = supabase
      .channel("admin-alerts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_alerts" },
        (payload) => {
          const newAlert = payload.new as AdminAlert;
          setAlerts((prev) => [newAlert, ...prev]);
          
          // Show toast for critical/warning
          if (newAlert.severity === "critical") {
            toast.error(`🚨 ${newAlert.title}`, { description: newAlert.message, duration: 10000 });
          } else if (newAlert.severity === "warning") {
            toast.warning(`⚠️ ${newAlert.title}`, { description: newAlert.message, duration: 8000 });
          } else {
            toast.info(newAlert.title, { description: newAlert.message });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAlerts = async () => {
    const { data } = await supabase
      .from("admin_alerts" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setAlerts(data as any);
    setLoading(false);
  };

  const checkThresholds = async () => {
    setChecking(true);
    const { data } = await supabase.rpc("admin_check_thresholds" as any);
    if (data && Array.isArray(data)) setThresholdAlerts(data);
    setChecking(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("admin_alerts" as any).update({ is_read: true } as any).eq("id", id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  const resolveAlert = async (id: string) => {
    await supabase.from("admin_alerts" as any).update({ resolved_at: new Date().toISOString(), is_read: true } as any).eq("id", id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved_at: new Date().toISOString(), is_read: true } : a)));
  };

  const markAllRead = async () => {
    const unreadIds = alerts.filter((a) => !a.is_read).map((a) => a.id);
    if (!unreadIds.length) return;
    await supabase.from("admin_alerts" as any).update({ is_read: true } as any).in("id", unreadIds);
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    toast.success("Toutes les alertes marquées comme lues");
  };

  const unreadCount = alerts.filter((a) => !a.is_read && !a.resolved_at).length;
  const activeAlerts = alerts.filter((a) => !a.resolved_at);
  const resolvedAlerts = alerts.filter((a) => a.resolved_at);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Threshold Check Banner */}
      {thresholdAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield size={14} className="text-destructive" /> Seuils critiques atteints
            </h3>
            <Button size="sm" variant="outline" onClick={checkThresholds} disabled={checking} className="text-xs h-7">
              <RefreshCw size={10} className={`mr-1 ${checking ? "animate-spin" : ""}`} /> Revérifier
            </Button>
          </div>
          {thresholdAlerts.map((ta, i) => {
            const cfg = SEVERITY_CONFIG[ta.severity] || SEVERITY_CONFIG.warning;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${cfg.bg} border ${cfg.border} rounded-2xl p-4`}
              >
                <div className="flex items-start gap-3">
                  <Icon size={18} className={cfg.text} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${cfg.text}`}>{ta.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${cfg.badge}`}>
                        {ta.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{ta.message}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {thresholdAlerts.length === 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 flex items-center gap-3">
          <Check size={18} className="text-accent" />
          <div>
            <p className="text-sm font-semibold text-accent">Tous les indicateurs sont normaux</p>
            <p className="text-xs text-muted-foreground">Aucun seuil critique n'est dépassé actuellement.</p>
          </div>
          <Button size="sm" variant="outline" onClick={checkThresholds} disabled={checking} className="ml-auto text-xs h-7">
            <RefreshCw size={10} className={`mr-1 ${checking ? "animate-spin" : ""}`} /> Vérifier
          </Button>
        </div>
      )}

      {/* Active Alerts (realtime) */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bell size={14} className="text-primary" /> Alertes en temps réel
            {unreadCount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h3>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead} className="text-xs h-7">
              Tout marquer lu
            </Button>
          )}
        </div>

        {activeAlerts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Aucune alerte active</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            <AnimatePresence>
              {activeAlerts.map((alert) => {
                const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`flex items-start gap-3 py-3 px-4 rounded-xl border ${
                      alert.is_read ? "bg-muted/20 border-border" : `${cfg.bg} ${cfg.border}`
                    }`}
                  >
                    <Icon size={14} className={`mt-0.5 ${alert.is_read ? "text-muted-foreground" : cfg.text}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-semibold ${alert.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                          {alert.title}
                        </p>
                        <span className={`text-[8px] px-1 py-0.5 rounded-full font-bold ${cfg.badge}`}>
                          {alert.severity}
                        </span>
                        {!alert.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {new Date(alert.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!alert.is_read && (
                        <button onClick={() => markAsRead(alert.id)} className="p-1 rounded-lg hover:bg-muted transition-colors" title="Marquer comme lu">
                          <Check size={12} className="text-muted-foreground" />
                        </button>
                      )}
                      <button onClick={() => resolveAlert(alert.id)} className="p-1 rounded-lg hover:bg-muted transition-colors" title="Résoudre">
                        <X size={12} className="text-muted-foreground" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Resolved */}
      {resolvedAlerts.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground">Alertes résolues ({resolvedAlerts.length})</h3>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {resolvedAlerts.slice(0, 20).map((alert) => (
              <div key={alert.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/20">
                <Check size={10} className="text-accent" />
                <p className="text-[11px] text-muted-foreground flex-1 truncate">{alert.title}</p>
                <span className="text-[10px] text-muted-foreground/60">
                  {new Date(alert.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRealtimeAlerts;
