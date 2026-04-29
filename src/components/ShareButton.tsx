import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  variant?: "default" | "ghost" | "outline" | "secondary";
  size?: "default" | "sm" | "icon";
  label?: string;
  /** When set, links shared on social use the og-meta edge function for rich previews. */
  ogType?: "voyage" | "mission" | "colis";
  ogId?: string;
}

const SUPABASE_PROJECT_ID =
  (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID || "hyvqqfmlhcjbwrbpmdwr";
const OG_META_BASE = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/og-meta`;

export default function ShareButton({
  url,
  title,
  text,
  variant = "outline",
  size = "sm",
  label = "Partager",
  ogType,
  ogId,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  // For social shares, use the og-meta endpoint so crawlers get rich previews.
  const socialUrl = ogType && ogId ? `${OG_META_BASE}/${ogType}/${ogId}` : fullUrl;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        // Use socialUrl so previews work in WhatsApp/Messenger/etc.
        await navigator.share({ title, text, url: socialUrl });
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  };

  const handleCopy = async () => {
    try {
      // Copy the human-friendly URL (clean nidit.fr/... path).
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast({ title: "Lien copié ✅" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Impossible de copier", variant: "destructive" });
    }
  };

  const onClick = async () => {
    const ok = await handleNativeShare();
    if (!ok) await handleCopy();
  };

  if (typeof navigator !== "undefined" && (navigator as any).share) {
    return (
      <Button variant={variant} size={size} onClick={onClick} className="gap-2">
        <Share2 className="h-4 w-4" />
        {size !== "icon" && <span>{label}</span>}
      </Button>
    );
  }

  // Desktop fallback: popover with share targets — uses socialUrl for crawlers.
  const encodedSocial = encodeURIComponent(socialUrl);
  const encodedText = encodeURIComponent(text || title);
  const shareTargets = [
    { name: "WhatsApp", url: `https://wa.me/?text=${encodedText}%20${encodedSocial}` },
    { name: "Twitter / X", url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedSocial}` },
    { name: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodedSocial}` },
    { name: "LinkedIn", url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedSocial}` },
    { name: "Email", url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%20${encodedSocial}` },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Share2 className="h-4 w-4" />
          {size !== "icon" && <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="space-y-1">
          <button
            onClick={handleCopy}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            <span className="flex items-center gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copier le lien
            </span>
          </button>
          {shareTargets.map((t) => (
            <a
              key={t.name}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              {t.name}
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
