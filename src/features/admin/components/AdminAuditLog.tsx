import { useState, useEffect } from "react";
import { History, User, Settings, Ban, RotateCcw, CheckCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface AuditEntry {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  suspend: { icon: Ban, label: "Suspension", color: "text-destructive" },
  unsuspend: { icon: CheckCircle, label: "Rétablissement", color: "text-accent" },
  reset_points: { icon: RotateCcw, label: "Reset points", color: "text-primary" },
  config_update: { icon: Settings, label: "Modification config", color: "text-primary" },
};

const AdminAuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLog();
  }, []);

  const loadLog = async () => {
    const { data } = await supabase.rpc("admin_get_audit_log" as any, { _limit: 200 });
    if (data) setEntries(data as any);
    setLoading(false);
  };

  const exportCSV = () => {
    if (!entries.length) return;
    const headers = ["Date", "Admin", "Action", "Type", "Cible", "Détails"];
    const rows = entries.map(e => [
      new Date(e.created_at).toLocaleString("fr-FR"),
      e.admin_name,
      ACTION_CONFIG[e.action]?.label || e.action,
      e.target_type,
      e.target_id?.substring(0, 12) || "",
      JSON.stringify(e.details),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History size={14} className="text-primary" /> Historique d'audit admin
          </h3>
          {entries.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportCSV} className="text-xs h-7">
              <Download size={10} className="mr-1" /> Export CSV
            </Button>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Aucune action enregistrée</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {entries.map((e) => {
              const cfg = ACTION_CONFIG[e.action] || { icon: User, label: e.action, color: "text-muted-foreground" };
              const Icon = cfg.icon;
              return (
                <div key={e.id} className="flex items-start gap-3 py-3 px-4 rounded-xl bg-muted/30 border border-border">
                  <div className={`mt-0.5 ${cfg.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{cfg.label}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(e.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Par <span className="font-medium text-foreground">{e.admin_name}</span>
                      {e.target_id && (
                        <> • Cible : <span className="font-mono">{e.target_id.substring(0, 12)}...</span></>
                      )}
                    </p>
                    {e.details?.reason && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Raison : <span className="text-foreground">{e.details.reason}</span>
                      </p>
                    )}
                    {e.details?.config_key && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Clé : <span className="font-mono text-foreground">{e.details.config_key}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLog;
