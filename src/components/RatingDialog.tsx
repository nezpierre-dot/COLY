import { useState } from "react";
import { Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface RatingDialogProps {
  open: boolean;
  onClose: () => void;
  shipmentId: string;
  ratedUserId: string;
  raterRole: "demandeur" | "voyageur";
}

const RatingDialog = ({ open, onClose, shipmentId, ratedUserId, raterRole }: RatingDialogProps) => {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const label = raterRole === "demandeur"
    ? "Comment s'est passée la livraison par le voyageur ?"
    : "Comment s'est passée l'expérience avec l'expéditeur ?";

  const scoreLabels = ["", "Mauvais", "Passable", "Bien", "Très bien", "Excellent"];

  const handleSubmit = async () => {
    if (!user || score === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("ratings" as any).insert({
      shipment_id: shipmentId,
      rater_id: user.id,
      rated_id: ratedUserId,
      score,
      comment: comment.trim() || null,
      rater_role: raterRole,
    });
    if (error) {
      toast.error("Erreur lors de l'envoi de la note");
    } else {
      toast.success("Merci pour votre évaluation !");
      onClose();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-center">Évaluer la livraison</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <p className="text-sm text-muted-foreground text-center leading-relaxed">{label}</p>

          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setScore(star)}
                className="transition-transform hover:scale-110 active:scale-95"
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

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              Plus tard
            </Button>
            <Button
              className="flex-1 rounded-xl"
              disabled={score === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Envoi…" : "Envoyer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingDialog;
