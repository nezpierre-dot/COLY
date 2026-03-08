import { Share2 } from "lucide-react";

interface WhatsAppShareButtonProps {
  type: "shipment" | "needit";
  id: string;
  title: string;
  destination: string;
  compact?: boolean;
}

const WhatsAppShareButton = ({ type, id, title, destination, compact = false }: WhatsAppShareButtonProps) => {
  const appUrl = window.location.origin;
  const deepLink = type === "shipment" ? `${appUrl}/shipment/${id}` : `${appUrl}/mission/${id}`;
  const emoji = type === "shipment" ? "📦" : "🛍️";
  const text = `${emoji} Mission Nidit : ${title} → ${destination}\nVoir les détails : ${deepLink}`;

  const handleShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  if (compact) {
    return (
      <button
        onClick={handleShare}
        className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center hover:bg-success/20 transition-colors"
        title="Partager sur WhatsApp"
      >
        <Share2 size={14} className="text-success" />
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/10 text-success text-xs font-semibold hover:bg-success/20 transition-colors"
    >
      <Share2 size={14} /> WhatsApp
    </button>
  );
};

export default WhatsAppShareButton;
