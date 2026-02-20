import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

interface FieldDef {
  key: string;
  label: string;
  editable: boolean;
  value: string;
}

const MyInfo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const meta = user?.user_metadata || {};

  const [fields, setFields] = useState<FieldDef[]>([
    { key: "last_name", label: "Nom", editable: false, value: "" },
    { key: "first_name", label: "Prénom", editable: false, value: "" },
    { key: "email", label: "Adresse Mail", editable: true, value: user?.email || "" },
    { key: "phone", label: "N° Téléphone", editable: true, value: meta.phone || "" },
    { key: "country", label: "Pays de Résidence", editable: true, value: meta.country || "" },
    { key: "city", label: "Ville", editable: true, value: meta.city || "" },
    { key: "postal_code", label: "Code Postale", editable: true, value: meta.postal_code || "" },
    { key: "region", label: "Département / Région", editable: true, value: meta.region || "" },
    { key: "address", label: "Adresse (N°rue et Nom rue)", editable: true, value: meta.address || "" },
  ]);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (meta.full_name) {
      const parts = (meta.full_name as string).split(" ");
      setFields((prev) =>
        prev.map((f) => {
          if (f.key === "first_name") return { ...f, value: parts[0] || "" };
          if (f.key === "last_name") return { ...f, value: parts.slice(1).join(" ") || "" };
          return f;
        })
      );
    }
  }, []);

  const startEdit = (key: string) => {
    const field = fields.find((f) => f.key === key);
    if (!field) return;
    setEditingKey(key);
    setEditValue(field.value);
  };

  const saveField = async () => {
    if (!editingKey) return;
    setFields((prev) =>
      prev.map((f) => (f.key === editingKey ? { ...f, value: editValue.trim() } : f))
    );

    // Save to user metadata
    const updatedFields = fields.map((f) =>
      f.key === editingKey ? { ...f, value: editValue.trim() } : f
    );
    const dataToSave: Record<string, string> = {};
    updatedFields.forEach((f) => {
      if (f.key !== "email") dataToSave[f.key] = f.value;
    });
    dataToSave.full_name = `${updatedFields.find((f) => f.key === "first_name")?.value || ""} ${updatedFields.find((f) => f.key === "last_name")?.value || ""}`.trim();

    const { error } = await supabase.auth.updateUser({ data: dataToSave });
    if (error) toast.error(error.message);
    else toast.success("Mis à jour");
    setEditingKey(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-6 pt-12">
        <button onClick={() => navigate("/my-account")} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-foreground mb-2">Mon Compte</h1>

        <div className="bg-secondary/30 rounded-2xl py-4 px-6 text-center mb-6">
          <h2 className="text-lg font-bold text-foreground">Mes Informations</h2>
        </div>

        <div className="space-y-1">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center justify-between border-b border-secondary/50 py-3.5">
              {editingKey === f.key ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveField}
                  onKeyDown={(e) => e.key === "Enter" && saveField()}
                  className="flex-1 bg-transparent text-foreground text-sm focus:outline-none border-b-2 border-primary"
                />
              ) : (
                <span className={`text-sm ${f.value ? "text-foreground" : "text-muted-foreground"}`}>
                  {f.value || f.label}
                </span>
              )}
              {f.editable && editingKey !== f.key && (
                <button
                  onClick={() => startEdit(f.key)}
                  className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-bold shadow-sm"
                >
                  Modifier
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default MyInfo;
