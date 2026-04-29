import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Pencil, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { useTranslation } from "@/hooks/useTranslation";

interface FavAddress {
  id: string;
  label: string | null;
  address: string;
  access_code: string | null;
  created_at: string;
}

const FavoriteAddresses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<FavAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCode, setEditCode] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("favorite_addresses" as any)
      .select("id, label, address, access_code, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setAddresses(data as any[]);
        setLoading(false);
      });
  }, [user]);

  const startEdit = (addr: FavAddress) => {
    hapticLight();
    setEditingId(addr.id);
    setEditLabel(addr.label || "");
    setEditAddress(addr.address);
    setEditCode(addr.access_code || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editAddress.trim()) {
      toast.error(t("favAddr.errEmpty"));
      return;
    }
    const { error } = await supabase
      .from("favorite_addresses" as any)
      .update({
        label: editLabel.trim() || null,
        address: editAddress.trim(),
        access_code: editCode.trim() || null,
      } as any)
      .eq("id", editingId!);

    if (error) {
      toast.error(t("favAddr.errUpdate"));
      return;
    }

    setAddresses((prev) =>
      prev.map((a) =>
        a.id === editingId
          ? { ...a, label: editLabel.trim() || null, address: editAddress.trim(), access_code: editCode.trim() || null }
          : a
      )
    );
    setEditingId(null);
    hapticSuccess();
    toast.success(t("favAddr.updated"));
  };

  const deleteAddress = async (id: string) => {
    const { error } = await supabase
      .from("favorite_addresses" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(t("favAddr.errDelete"));
      return;
    }

    setAddresses((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
    hapticSuccess();
    toast.success(t("favAddr.deleted"));
  };

  return (
    <div className="min-h-screen bg-gradient-soft" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px) + 16px)" }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t("favAddr.title")}</h1>
      </div>

      <div className="px-4 py-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <MapPin size={28} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">{t("favAddr.empty")}</p>
            <p className="text-muted-foreground/60 text-xs">
              {t("favAddr.emptyHint")}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {addresses.map((addr) => (
              <motion.div
                key={addr.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-card border border-border rounded-2xl p-4 space-y-2"
              >
                {editingId === addr.id ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("favAddr.labelOptional")}</label>
                      <input
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:border-primary"
                        placeholder={t("favAddr.labelPlaceholder")}
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("favAddr.address")} <span className="text-destructive">*</span></label>
                      <input
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:border-primary"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("favAddr.accessCode")}</label>
                      <input
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:border-primary"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1.5"
                      >
                        <Save size={14} /> {t("favAddr.save")}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-medium"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin size={16} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          {addr.label && (
                            <p className="text-xs font-semibold text-primary mb-0.5">{addr.label}</p>
                          )}
                          <p className="text-sm font-medium text-foreground">{addr.address}</p>
                          {addr.access_code && (
                            <p className="text-xs text-muted-foreground mt-0.5">🔑 {addr.access_code}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(addr)}
                          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                          <Pencil size={14} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeletingId(addr.id)}
                          className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </button>
                      </div>
                    </div>

                    {/* Delete confirmation */}
                    <AnimatePresence>
                      {deletingId === addr.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
                            <p className="text-xs text-destructive flex-1">{t("favAddr.confirmDelete")}</p>
                            <button
                              onClick={() => deleteAddress(addr.id)}
                              className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium"
                            >
                              {t("favAddr.delete")}
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium"
                            >
                              {t("favAddr.cancel")}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default FavoriteAddresses;
