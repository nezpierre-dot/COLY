import { useState, useRef } from "react";
import { Camera, MapPin, Upload, CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface DeliveryProofUploadProps {
  shipmentId: string;
  onProofUploaded: (proofUrl: string) => void;
  onDeliveryConfirmed: () => void;
}

const DeliveryProofUpload = ({ shipmentId, onProofUploaded, onDeliveryConfirmed }: DeliveryProofUploadProps) => {
  const { user } = useAuth();
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
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non supportée");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        toast.success("Position récupérée ✓");
      },
      () => {
        setGeoLoading(false);
        toast.error("Impossible de récupérer la position");
      },
      { timeout: 10000 }
    );
  };

  const handleConfirmDelivery = async () => {
    if (!photo || !user) return;
    setUploading(true);
    try {
      // Upload photo
      const path = `delivery-proofs/${shipmentId}/${Date.now()}-${photo.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("shipment-photos")
        .upload(path, photo);

      if (uploadErr) throw uploadErr;

      const { data: signed } = await supabase.storage
        .from("shipment-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const photoUrl = signed?.signedUrl ?? "";

      // Save delivery proof
      const { error: proofErr } = await supabase.from("delivery_proofs" as any).insert({
        shipment_id: shipmentId,
        photo_url: photoUrl,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        uploaded_by: user.id,
      });
      if (proofErr) throw proofErr;

      // Mark shipment as delivered
      const { error: statusErr } = await supabase
        .from("shipments")
        .update({ status: "delivered" } as any)
        .eq("id", shipmentId);
      if (statusErr) throw statusErr;

      onProofUploaded(photoUrl);
      onDeliveryConfirmed();
      toast.success("Livraison confirmée avec preuve photo ✓");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la confirmation");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle size={16} className="text-green-600" />
        <h3 className="text-sm font-bold text-foreground">Confirmer la livraison</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Prenez une photo du colis remis au destinataire pour confirmer la livraison.
      </p>

      {/* Photo upload */}
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
            <span className="text-xs font-medium">Appuyer pour prendre une photo</span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Geolocation */}
      <button
        onClick={getLocation}
        disabled={geoLoading}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
          coords
            ? "bg-green-500/10 border-green-500/30 text-green-700"
            : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
        }`}
      >
        {geoLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <MapPin size={14} />
        )}
        {coords
          ? `Position enregistrée (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
          : "Ajouter ma position GPS"}
      </button>

      {/* Timestamp info */}
      <p className="text-[11px] text-muted-foreground text-center">
        📅 Horodatage automatique : {new Date().toLocaleString("fr-FR")}
      </p>

      <Button
        className="w-full rounded-xl"
        disabled={!photo || uploading}
        onClick={handleConfirmDelivery}
      >
        {uploading ? (
          <><Loader2 size={14} className="animate-spin mr-2" /> Confirmation…</>
        ) : (
          <><Upload size={14} className="mr-2" /> Confirmer la livraison</>
        )}
      </Button>
    </div>
  );
};

export default DeliveryProofUpload;
