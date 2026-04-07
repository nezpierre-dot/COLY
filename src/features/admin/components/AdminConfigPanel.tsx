import { useState, useEffect } from "react";
import { Settings, Save, Trophy, DollarSign, Bell, ShieldAlert, Ban, RotateCcw, CheckCircle, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface ConfigItem {
  id: string;
  config_key: string;
  config_value: any;
  description: string;
}

const AdminConfigPanel = () => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Moderation
  const [userSearch, setUserSearch] = useState("");
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [moderating, setModerating] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const { data } = await supabase.from("platform_config").select("*").order("config_key");
    if (data) {
      setConfigs(data as any);
      const vals: Record<string, string> = {};
      data.forEach((c: any) => {
        vals[c.config_key] = typeof c.config_value === "object" ? JSON.stringify(c.config_value, null, 2) : String(c.config_value);
      });
      setEditValues(vals);
    }
    setLoading(false);
  };

  const saveConfig = async (key: string) => {
    setSaving(key);
    try {
      let value: any = editValues[key];
      try { value = JSON.parse(value); } catch { /* keep as string */ }
      
      const { error } = await supabase
        .from("platform_config")
        .update({ config_value: value, updated_at: new Date().toISOString() } as any)
        .eq("config_key", key);
      
      if (error) throw error;
      
      // Log config change to audit
      await supabase.from("admin_audit_log" as any).insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: "config_update",
        target_type: "config",
        target_id: key,
        details: { config_key: key },
      });
      
      toast.success(`Configuration "${key}" sauvegardée`);
      await loadConfigs();
    } catch (err: any) {
      toast.error(err.message || "Erreur de sauvegarde");
    } finally {
      setSaving(null);
    }
  };

  const searchUsers = async () => {
    if (!userSearch.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, kyc_status, suspended_at, suspension_reason")
      .or(`full_name.ilike.%${userSearch}%,user_id.eq.${userSearch.length === 36 ? userSearch : "00000000-0000-0000-0000-000000000000"}`)
      .limit(10);
    setFoundUsers(data || []);
    setSearching(false);
  };

  const moderateUser = async (userId: string, action: string, reason?: string) => {
    setModerating(userId);
    try {
      const { data, error } = await supabase.rpc("admin_moderate_user" as any, {
        _target_user_id: userId,
        _action: action,
        _reason: reason || null,
      });
      if (error) throw error;
      toast.success(
        action === "suspend" ? "Utilisateur suspendu" :
        action === "unsuspend" ? "Utilisateur rétabli" :
        "Points réinitialisés"
      );
      await searchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erreur de modération");
    } finally {
      setModerating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group configs
  const pointsConfigs = configs.filter(c => c.config_key.startsWith("points_") || c.config_key === "level_thresholds");
  const commissionConfigs = configs.filter(c => c.config_key === "commission_rates");
  const notifConfigs = configs.filter(c => c.config_key === "notifications_enabled");

  return (
    <div className="space-y-6">
      {/* Points & Levels */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy size={14} className="text-primary" /> Seuils de points & niveaux
        </h3>
        <div className="space-y-3">
          {pointsConfigs.map((c) => (
            <ConfigField
              key={c.config_key}
              config={c}
              value={editValues[c.config_key] || ""}
              onChange={(v) => setEditValues((prev) => ({ ...prev, [c.config_key]: v }))}
              onSave={() => saveConfig(c.config_key)}
              saving={saving === c.config_key}
            />
          ))}
        </div>
      </div>

      {/* Commissions */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <DollarSign size={14} className="text-primary" /> Gestion des commissions
        </h3>
        <p className="text-xs text-muted-foreground">Taux de commission par niveau (en %). Modifiez le JSON ci-dessous.</p>
        {commissionConfigs.map((c) => (
          <ConfigField
            key={c.config_key}
            config={c}
            value={editValues[c.config_key] || ""}
            onChange={(v) => setEditValues((prev) => ({ ...prev, [c.config_key]: v }))}
            onSave={() => saveConfig(c.config_key)}
            saving={saving === c.config_key}
            isJson
          />
        ))}
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell size={14} className="text-primary" /> Paramètres notifications
        </h3>
        {notifConfigs.map((c) => {
          let parsed: Record<string, boolean> = {};
          try { parsed = typeof c.config_value === "object" ? c.config_value : JSON.parse(c.config_value); } catch {}
          
          return (
            <div key={c.config_key} className="space-y-3">
              {Object.entries(parsed).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-xs font-medium text-foreground capitalize">{key.replace(/_/g, " ")}</p>
                  </div>
                  <Switch
                    checked={val}
                    onCheckedChange={(checked) => {
                      const updated = { ...parsed, [key]: checked };
                      setEditValues((prev) => ({ ...prev, [c.config_key]: JSON.stringify(updated) }));
                      // Auto-save
                      supabase
                        .from("platform_config")
                        .update({ config_value: updated, updated_at: new Date().toISOString() } as any)
                        .eq("config_key", c.config_key)
                        .then(({ error }) => {
                          if (error) toast.error("Erreur");
                          else toast.success(`${key} ${checked ? "activé" : "désactivé"}`);
                        });
                    }}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* User Moderation */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert size={14} className="text-destructive" /> Modération utilisateurs
        </h3>

        <div className="flex gap-2">
          <Input
            placeholder="Rechercher par nom ou ID..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            className="text-sm"
          />
          <Button size="sm" onClick={searchUsers} disabled={searching}>
            <Search size={14} />
          </Button>
        </div>

        {foundUsers.length > 0 && (
          <div className="space-y-2">
            {foundUsers.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 border border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name || "Sans nom"}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{u.user_id.substring(0, 12)}...</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${u.kyc_status === "verified" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                      KYC: {u.kyc_status}
                    </span>
                    {u.suspended_at && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive flex items-center gap-1">
                        <Ban size={8} /> Suspendu
                      </span>
                    )}
                  </div>
                  {u.suspension_reason && (
                    <p className="text-[10px] text-destructive mt-1">Raison : {u.suspension_reason}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {u.suspended_at ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={moderating === u.user_id}
                      onClick={() => moderateUser(u.user_id, "unsuspend")}
                      className="text-xs h-8"
                    >
                      <CheckCircle size={12} className="mr-1" /> Rétablir
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={moderating === u.user_id}
                      onClick={() => {
                        const reason = prompt("Raison de la suspension :");
                        if (reason !== null) moderateUser(u.user_id, "suspend", reason);
                      }}
                      className="text-xs h-8"
                    >
                      <Ban size={12} className="mr-1" /> Suspendre
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={moderating === u.user_id}
                    onClick={() => {
                      if (confirm("Réinitialiser les points de cet utilisateur à 0 ?")) {
                        moderateUser(u.user_id, "reset_points");
                      }
                    }}
                    className="text-xs h-8"
                  >
                    <RotateCcw size={12} className="mr-1" /> Reset pts
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {userSearch && foundUsers.length === 0 && !searching && (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun utilisateur trouvé</p>
        )}
      </div>
    </div>
  );
};

const ConfigField = ({
  config,
  value,
  onChange,
  onSave,
  saving,
  isJson = false,
}: {
  config: ConfigItem;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  isJson?: boolean;
}) => {
  const isMultiLine = isJson || value.includes("{");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground">{config.config_key.replace(/_/g, " ")}</p>
          {config.description && (
            <p className="text-[10px] text-muted-foreground">{config.description}</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="text-xs h-7 px-2.5"
        >
          <Save size={10} className="mr-1" />
          {saving ? "..." : "Sauver"}
        </Button>
      </div>
      {isMultiLine ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full text-xs font-mono bg-muted/50 border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm font-mono h-9"
        />
      )}
    </div>
  );
};

export default AdminConfigPanel;
