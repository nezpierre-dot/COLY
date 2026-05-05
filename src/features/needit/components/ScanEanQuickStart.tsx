import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Barcode } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import EanScanner from "@/components/EanScanner";
import { useNeeditDraft } from "../hooks/useNeeditDraft";
import { trackEvent } from "@/lib/analytics";

interface EanProduct {
  ean_code: string;
  product_name: string | null;
  brand: string | null;
  image_url: string | null;
  weight: string | null;
  category: string | null;
}

/**
 * CTA "Scanner un code-barres" pour démarrer une mission NeedIt.
 * Pré-remplit le brouillon (nom produit, marque, photo) puis envoie sur l'écran final.
 */
const ScanEanQuickStart = ({
  variant = "card",
}: {
  variant?: "card" | "inline";
}) => {
  const navigate = useNavigate();
  const { update, reset } = useNeeditDraft();
  const [open, setOpen] = useState(false);

  const handleProductFound = (product: EanProduct) => {
    trackEvent("needit_ean_scan_success", "engagement", {
      ean: product.ean_code,
      hasName: !!product.product_name,
    });

    // On reset puis on pré-remplit le draft avec ce qu'on a trouvé
    reset();
    update({
      eanCode: product.ean_code,
      categoryLabel: product.category ?? "Produit scanné",
      brand: product.brand
        ? {
            id: `ean-${product.ean_code}`,
            name: product.brand,
            logo_url: null,
            category_key: "autre" as never,
          }
        : undefined,
      brandProduct: product.product_name
        ? {
            id: `ean-${product.ean_code}`,
            name: product.product_name,
            photo_url: product.image_url,
            indicative_price: null,
            variants: [],
          }
        : undefined,
      quantity: 1,
    });

    toast.success("Produit pré-rempli ✨", {
      description: product.product_name ?? "Complète les détails sur l'écran suivant",
    });
    setOpen(false);
    navigate("/needit/creer");
  };

  const trigger =
    variant === "inline" ? (
      <button
        type="button"
        onClick={() => trackEvent("needit_ean_scan_open", "engagement", { variant })}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
      >
        <Barcode size={16} className="text-primary" />
        Scanner un code-barres
      </button>
    ) : (
      <button
        type="button"
        onClick={() => trackEvent("needit_ean_scan_open", "engagement", { variant })}
        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/40 transition-all shadow-sm hover:shadow-md text-left"
      >
        <span className="w-11 h-11 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center">
          <Barcode size={22} className="text-primary" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-foreground">
            Scanner un code-barres
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            Photo, nom et marque pré-remplis automatiquement
          </span>
        </span>
      </button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode size={18} className="text-primary" />
            Scanner un code-barres
          </DialogTitle>
          <DialogDescription>
            Pointe la caméra vers le code-barres EAN du produit. Sa fiche sera créée automatiquement.
          </DialogDescription>
        </DialogHeader>
        <EanScanner mode="scan" onProductFound={handleProductFound} />
      </DialogContent>
    </Dialog>
  );
};

export default ScanEanQuickStart;
