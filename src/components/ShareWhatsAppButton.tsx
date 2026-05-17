import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppShareButtonProps {
  type: "shipment" | "needit";
  id: string;
  title: string;
  from?: string;
  destination: string;
  price?: string;
  compact?: boolean;
  variant?: "default" | "full";
}

const WhatsAppShareButton = ({
  type,
  id,
  title,
  from,
  destination,
  price,
  compact = false,
  variant = "default",
}: WhatsAppShareButtonProps) => {
  const appUrl = window.location.origin;
  const path = type === "shipment" ? "shipment" : "mission";
  const deepLink = `${appUrl}/${path}/${id}`;
  const emoji = type === "shipment" ? "📦" : "🛍️";

  const route = from ? `${from} → ${destination}` : destination;
  const priceLine = price ? `\n💰 Prix : ${price}` : "";
  const text = `${emoji} *Mission Nidit* : ${title}\n🗺️ Trajet : ${route}${priceLine}\n\n👉 Voir les détails : ${deepLink}`;

  const handleShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  if (compact) {
    return (
      <button
        onClick={handleShare}
        className="min-h-11 min-w-11 rounded-xl bg-[#25D366]/10 flex items-center justify-center hover:bg-[#25D366]/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="Partager sur WhatsApp"
      >
        <MessageCircle size={14} className="text-[#25D366]" />
      </button>
    );
  }

  if (variant === "full") {
    return (
      <Button
        onClick={handleShare}
        variant="outline"
        className="w-full gap-2 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
      >
        <MessageCircle size={16} /> Partager sur WhatsApp
      </Button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-colors"
    >
      <MessageCircle size={14} /> WhatsApp
    </button>
  );
};

export default WhatsAppShareButton;
