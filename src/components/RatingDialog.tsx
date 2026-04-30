import { useState } from "react";
import { Star, Camera, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import SuccessCheck from "@/components/SuccessCheck";

interface RatingDialogProps {
  open: boolean;
  onClose: () => void;
  shipmentId: string;
  ratedUserId: string;
  raterRole: "demandeur" | "voyageur";
}

const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per photo

const RatingDialog = ({ open, onClose, shipmentId, ratedUserId, raterRole }: RatingDialogProps) => {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const label = raterRole === "demandeur"
    ? "Comment s'est passée la livraison par le voyageur ?"
    : "Comment s'est passée l'expérience avec ce membre ?";

  const scoreLabels = ["", "Mauvais", "Passable", "Bien", "Très bien", "Excellent"];

  const handleAddPhotos = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    const accepted: File[] = [];
    Array.from(files).slice(0, remaining).forEach((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`"${f.name}" n'est pas une image`);
        return;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" dépasse 5 Mo`);
        return;
      }
      accepted.push(f);
    });
    if (accepted.length === 0) return;
    setPhotos((prev) => [...prev, ...accepted]);
    accepted.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => setPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
    hapticLight();
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (!user || photos.length === 0) return [];
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${shipmentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("rating-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("rating-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const reset = () => {
    setScore(0);
    setHovered(0);
    setComment("");
    setPhotos([]);
    setPreviews([]);
  };

  const handleSubmit = async () => {
    if (!user || score === 0) return;
    setSubmitting(true);
    try {
      const photo_urls = await uploadPhotos();
      const { error } = await supabase.from("ratings" as any).insert({
        shipment_id: shipmentId,
        rater_id: user.id,
        rated_id: ratedUserId,
        score,
        comment: comment.trim() || null,
        rater_role: raterRole,
        photo_urls,
      });
      if (error) throw error;
      hapticSuccess();
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        toast.success("Merci pour votre évaluation !");
        reset();
        onClose();
      }, 1200);
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'envoi de la note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-center">Évaluer la livraison</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex justify-center">
            <SuccessCheck show={submitted} size={56} />
          </div>
          {!submitted && <p className="text-sm text-muted-foreground text-center leading-relaxed">{label}</p>}

          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => { setScore(star); hapticLight(); }}
                className="transition-transform hover:scale-110 active:scale-95"
                aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
              >
                <Star
                  size={36}
                  className={`transition-colors ${
                    star <= (hovered || score)
                      ? "fill-accent text-accent"
                      : "fill-muted text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          {(hovered || score) > 0 && (
            <p className="text-center text-sm font-semibold text-accent animate-in fade-in duration-200">
              {scoreLabels[hovered || score]}
            </p>
          )}

          {/* Comment */}
          <Textarea
            placeholder="Un commentaire (optionnel)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none text-sm rounded-xl"
            rows={3}
            maxLength={300}
          />

          {/* Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Photos ({photos.length}/{MAX_PHOTOS})
              </span>
              <span className="text-[11px] text-muted-foreground/70">Optionnel · 5 Mo max</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {previews.map((src, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
                  <img src={src} alt={`Aperçu ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition"
                    aria-label="Retirer la photo"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition text-muted-foreground"
                  aria-label="Ajouter une photo"
                >
                  <Camera size={20} />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { handleAddPhotos(e.target.files); e.target.value = ""; }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { reset(); onClose(); }}>
              Plus tard
            </Button>
            <Button
              className="flex-1 rounded-xl"
              disabled={score === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Envoi…</span>
              ) : "Envoyer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingDialog;
