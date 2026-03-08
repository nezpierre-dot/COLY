import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, AlertTriangle, Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserShipment {
  id: string;
  ref: string;
  label: string;
}

const DISPUTE_REASONS = [
  { value: "damaged", label: "Colis endommagé" },
  { value: "missing", label: "Colis non reçu" },
  { value: "wrong_item", label: "Mauvais article" },
  { value: "partial", label: "Contenu incomplet" },
  { value: "other", label: "Autre" },
];

const DisputesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<UserShipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myDisputes, setMyDisputes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: s } = await supabase
        .from("shipments")
        .select("id, arrival_city, status")
        .or(`user_id.eq.${user.id},voyageur_id.eq.${user.id}`)
        .in("status", ["delivered", "accepted", "picked_up", "in_transit"]);
      if (s) {
        setShipments(s.map((x) => ({
          id: x.id,
          ref: "COLY-" + x.id.slice(0, 8).toUpperCase(),
          label: `COLY-${x.id.slice(0, 8).toUpperCase()} → ${x.arrival_city}`,
        })));
      }
      const { data: d } = await supabase
        .from("disputes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (d) setMyDisputes(d);
    };
    load();
  }, [user]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user || !selectedShipment || !reason || !description.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("shipment-photos")
          .upload(path, photoFile);
        if (!upErr) {
          const { data: urlData } = await supabase.storage
            .from("shipment-photos")
            .createSignedUrl(path, 60 * 60 * 24 * 365);
          photoUrl = urlData?.signedUrl ?? null;
        }
      }

      const { error } = await supabase.from("disputes").insert({
        shipment_id: selectedShipment,
        user_id: user.id,
        reason,
        description: description.trim(),
        photo_url: photoUrl,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Litige soumis avec succès");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      open: { label: "En attente", cls: "bg-warning/10 text-warning" },
      investigating: { label: "En cours", cls: "bg-primary/10 text-primary" },
      resolved: { label: "Résolu", cls: "bg-success/10 text-success" },
      refunded: { label: "Remboursé", cls: "bg-accent/10 text-accent" },
    };
    const c = map[s] || { label: s, cls: "bg-muted text-muted-foreground" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>{c.label}</span>;
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Litige soumis</h2>
          <p className="text-sm text-muted-foreground">Notre équipe examinera votre demande sous 48h.</p>
          <Button onClick={() => navigate("/dashboard")} className="rounded-xl">Retour au tableau de bord</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <AlertTriangle size={18} className="text-warning" /> Litiges
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-foreground">Ouvrir un litige</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Colis concerné *</label>
            <Select value={selectedShipment} onValueChange={setSelectedShipment}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner un colis" /></SelectTrigger>
              <SelectContent>
                {shipments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Motif *</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner un motif" /></SelectTrigger>
              <SelectContent>
                {DISPUTE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème en détail..."
              className="min-h-[100px] rounded-xl"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Photo preuve (optionnel)</label>
            <label className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
              {photoPreview ? (
                <img src={photoPreview} alt="Preuve" className="h-full object-cover rounded-lg" />
              ) : (
                <div className="text-center">
                  <Camera size={20} className="text-muted-foreground mx-auto mb-1" />
                  <span className="text-xs text-muted-foreground">Ajouter une photo</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedShipment || !reason || !description.trim()}
            className="w-full rounded-xl gap-2"
          >
            <Send size={16} /> {submitting ? "Envoi en cours..." : "Soumettre le litige"}
          </Button>
        </div>

        {/* My disputes */}
        {myDisputes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-foreground">Mes litiges</h2>
            {myDisputes.map((d) => (
              <div key={d.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-foreground">
                    COLY-{d.shipment_id.slice(0, 8).toUpperCase()}
                  </span>
                  {statusLabel(d.status)}
                </div>
                <p className="text-xs text-muted-foreground">{DISPUTE_REASONS.find((r) => r.value === d.reason)?.label ?? d.reason}</p>
                <p className="text-sm text-foreground">{d.description}</p>
                {d.resolution && (
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-foreground">Résolution :</p>
                    <p className="text-xs text-muted-foreground">{d.resolution}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DisputesPage;
