import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plane, Train, Car, Bus, Ship, Bike, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "@/hooks/useTranslation";

interface FieldDef { key: string; label: string; editable: boolean; value: string; }

const TRANSPORT_OPTIONS = [
  { value: "voiture", icon: Car },
  { value: "train", icon: Train },
  { value: "avion", icon: Plane },
  { value: "bus", icon: Bus },
  { value: "bateau", icon: Ship },
  { value: "velo", icon: Bike },
];

const MyInfo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const meta = user?.user_metadata || {};

  const [fields, setFields] = useState<FieldDef[]>([
    { key: "last_name", label: t("myinfo.lastName"), editable: false, value: "" },
    { key: "first_name", label: t("myinfo.firstName"), editable: false, value: "" },
    { key: "email", label: t("myinfo.email"), editable: true, value: user?.email || "" },
    { key: "phone", label: t("myinfo.phone"), editable: true, value: meta.phone || "" },
    { key: "country", label: t("myinfo.residenceCountry"), editable: true, value: meta.country || "" },
    { key: "city", label: t("myinfo.city"), editable: true, value: meta.city || "" },
    { key: "postal_code", label: t("myinfo.postalCode"), editable: true, value: meta.postal_code || "" },
    { key: "region", label: t("myinfo.region"), editable: true, value: meta.region || "" },
    { key: "address", label: t("myinfo.address"), editable: true, value: meta.address || "" },
  ]);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Preferred transports
  const [preferredTransports, setPreferredTransports] = useState<string[]>([]);
  const [loadingTransports, setLoadingTransports] = useState(true);

  useEffect(() => {
    if (meta.full_name) {
      const parts = (meta.full_name as string).split(" ");
      setFields((prev) => prev.map((f) => {
        if (f.key === "first_name") return { ...f, value: parts[0] || "" };
        if (f.key === "last_name") return { ...f, value: parts.slice(1).join(" ") || "" };
        return f;
      }));
    }
  }, []);

  // Load preferred transports from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("preferred_transports").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data?.preferred_transports) {
          setPreferredTransports(data.preferred_transports);
        }
        setLoadingTransports(false);
      });
  }, [user]);

  const toggleTransport = async (value: string) => {
    const updated = preferredTransports.includes(value)
      ? preferredTransports.filter((t) => t !== value)
      : [...preferredTransports, value];
    setPreferredTransports(updated);
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ preferred_transports: updated } as any).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success(t("myinfo.transportsSaved"));
  };

  const startEdit = (key: string) => {
    const field = fields.find((f) => f.key === key);
    if (!field) return;
    setEditingKey(key);
    setEditValue(field.value);
  };

  const saveField = async () => {
    if (!editingKey) return;
    setFields((prev) => prev.map((f) => (f.key === editingKey ? { ...f, value: editValue.trim() } : f)));
    const updatedFields = fields.map((f) => f.key === editingKey ? { ...f, value: editValue.trim() } : f);
    const dataToSave: Record<string, string> = {};
    updatedFields.forEach((f) => { if (f.key !== "email") dataToSave[f.key] = f.value; });
    dataToSave.full_name = `${updatedFields.find((f) => f.key === "first_name")?.value || ""} ${updatedFields.find((f) => f.key === "last_name")?.value || ""}`.trim();
    const { error } = await supabase.auth.updateUser({ data: dataToSave });
    if (error) toast.error(error.message);
    else toast.success(t("myinfo.updated"));
    setEditingKey(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/my-account")} className="text-muted-foreground mb-4"><ArrowLeft size={24} /></button>
        <h1 className="text-3xl font-bold text-foreground mb-2">{t("myinfo.title")}</h1>
        <div className="bg-secondary/30 rounded-2xl py-4 px-6 text-center mb-6">
          <h2 className="text-lg font-bold text-foreground">{t("myinfo.section")}</h2>
        </div>
        <div className="space-y-1">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center justify-between border-b border-secondary/50 py-3.5">
              {editingKey === f.key ? (
                <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveField} onKeyDown={(e) => e.key === "Enter" && saveField()} className="flex-1 bg-transparent text-foreground text-sm focus:outline-none border-b-2 border-primary" />
              ) : (
                <span className={`text-sm ${f.value ? "text-foreground" : "text-muted-foreground"}`}>{f.value || f.label}</span>
              )}
              {f.editable && editingKey !== f.key && (
                <button onClick={() => startEdit(f.key)} className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-bold shadow-sm">{t("myinfo.edit")}</button>
              )}
            </div>
          ))}
        </div>

        {/* Preferred transports */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-foreground mb-1">{t("myinfo.preferredTransports")}</h3>
          <p className="text-xs text-muted-foreground mb-3">{t("myinfo.preferredTransportsHint")}</p>
          <div className="grid grid-cols-3 gap-2">
            {TRANSPORT_OPTIONS.map((opt) => {
              const selected = preferredTransports.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleTransport(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${
                    selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <opt.icon size={20} className={selected ? "text-primary" : "text-muted-foreground"} />
                  <span className={`text-xs font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                    {t(`transport.${opt.value}`)}
                  </span>
                  {selected && <Check size={12} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default MyInfo;
