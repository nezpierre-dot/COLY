import { useState, useRef } from "react";
import { Camera, MapPin, Loader2, X, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { addWatermark } from "@/lib/watermark";
import { compressImage } from "@/lib/compressImage";

interface PickupProofUploadProps {
  itemId: string;
  itemType: "shipment" | "needit_mission";
  onProofUploaded: () => void;
}

const PickupProofUpload = ({ itemId, itemType, onProofUploaded }: PickupProofUploadProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error("Géolocalisation non supportée"); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); toast.success("Position enregistrée"); },
      () => { setGeoLoading(false); toast.error("Impossible d'obtenir la position"); },
      { timeout: 10000 }
    );
  };

  const handleConfirmPickup = async () => {
    if (!photo || !user) return;
    setUploading(true);
    try {
      const compressed = await compressImage(photo, { maxSizeMB: 0.5, maxWidthOrHeight: 1280 });
      const { file: watermarked, proofId } = await addWatermark(compressed, coords);
      const path = `pickup-proofs/${itemId}/${Date.now()}-${photo.name}`;
      const { error: uploadErr } = await supabase.storage.from("shipment-photos").upload(path, watermarked);
      if (uploadErr) throw uploadErr;

      const { data: signed } = await supabase.storage.from("shipment-photos").createSignedUrl(path, 60 * 60 * 24 * 90);
      const photoUrl = signed?.signedUrl ?? "";

      const { error: proofErr } = await supabase.from("pickup_proofs" as any).insert({
        shipment_id: itemId,
        photo_url: photoUrl,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        uploaded_by: user.id,
      });
      if (proofErr) throw proofErr;

      // Store proof verification record
      await supabase.from("proof_verifications" as any).insert({
        proof_id: proofId,
        shipment_id: itemId,
        proof_type: "pickup",
        photo_url: photoUrl,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        uploaded_by: user.id,
      });

      // Update status to picked_up
      if (itemType === "shipment") {
        await supabase.from("shipments").update({ status: "picked_up" } as any).eq("id", itemId);
      } else {
        await supabase.from("needit_missions").update({ status: "picked_up" } as any).eq("id", itemId);
      }

      // Fraud detection via AI
      try {
        const { data: fraudResult } = await supabase.functions.invoke("fraud-check", {
          body: { photo_url: photoUrl, shipment_id: itemId, user_id: user.id },
        });
        if (fraudResult?.result === "fraudulent") {
          toast.error("⚠️ FRAUDE DÉTECTÉE — Cette photo semble suspecte. Confiance : " + Math.round((fraudResult.confidence || 0) * 100) + "%", { duration: 8000 });
        }
      } catch {
        // Non-blocking: fraud check failure shouldn't block the flow
      }

      onProofUploaded();
      toast.success("Récupération confirmée ✅");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la confirmation");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <PackageCheck size={16} className="text-[#0D84FF]" />
        <h3 className="text-sm font-bold text-foreground">Confirmer la récupération</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Prenez une photo du {itemType === "shipment" ? "colis" : "produit"} pour prouver la bonne récupération.
      </p>

      <div
        onClick={() => fileRef.current?.click()}
        className="relative border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
        style={{ minHeight: 140 }}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preuve" className="w-full object-cover rounded-xl" style={{ maxHeight: 200 }} />
            <button
              onClick={(e) => { e.stopPropagation(); setPhoto(null); setPreview(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <Camera size={28} />
            <span className="text-xs font-medium">Appuyez pour prendre une photo</span>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      </div>

      <button
        onClick={getLocation}
        disabled={geoLoading}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
          coords ? "bg-green-500/10 border-green-500/30 text-green-700" : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
        }`}
      >
        {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
        {coords ? `Position enregistrée (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : "Ajouter la position GPS"}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        📅 Horodatage automatique : {new Date().toLocaleString("fr-FR")}
      </p>

      <Button className="w-full rounded-xl" disabled={!photo || uploading} onClick={handleConfirmPickup}>
        {uploading ? (
          <><Loader2 size={14} className="animate-spin mr-2" /> Confirmation...</>
        ) : (
          <><PackageCheck size={14} className="mr-2" /> Confirmer la récupération</>
        )}
      </Button>
    </div>
  );
};

export default PickupProofUpload;
