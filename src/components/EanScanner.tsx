import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, Loader2, Package, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EanProduct {
  ean_code: string;
  product_name: string | null;
  brand: string | null;
  image_url: string | null;
  weight: string | null;
  category: string | null;
}

interface EanScannerProps {
  onProductFound?: (product: EanProduct) => void;
  onVerified?: (ean_code: string, product: EanProduct) => void;
  mode: "scan" | "verify";
  expectedEan?: string;
}

const EanScanner = ({ onProductFound, onVerified, mode, expectedEan }: EanScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<EanProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<"match" | "mismatch" | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "ean-scanner-container";

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const lookupEan = useCallback(async (ean: string) => {
    setLoading(true);
    setError(null);
    setProduct(null);
    setVerifyResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ean-lookup", {
        body: { ean_code: ean },
      });

      if (fnError) throw fnError;

      if (data?.product) {
        const p = data.product as EanProduct;
        setProduct(p);

        if (mode === "verify" && expectedEan) {
          const isMatch = ean === expectedEan;
          setVerifyResult(isMatch ? "match" : "mismatch");
          if (isMatch) {
            onVerified?.(ean, p);
            toast.success("✅ Produit vérifié avec succès !");
          } else {
            toast.error("❌ Ce n'est pas le bon produit");
          }
        } else {
          onProductFound?.(p);
        }
      } else {
        setError("Produit non trouvé dans la base de données");
      }
    } catch (err) {
      console.error("EAN lookup error:", err);
      setError("Erreur lors de la recherche du produit");
    } finally {
      setLoading(false);
    }
  }, [mode, expectedEan, onProductFound, onVerified]);

  const startScanner = useCallback(async () => {
    setError(null);
    setProduct(null);
    setVerifyResult(null);
    setScanning(true);

    // Small delay for DOM rendering
    await new Promise((r) => setTimeout(r, 300));

    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // Validate EAN format
          if (/^\d{8,13}$/.test(decodedText)) {
            await stopScanner();
            await lookupEan(decodedText);
          }
        },
        () => {} // ignore errors during scanning
      );
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      setScanning(false);
    }
  }, [stopScanner, lookupEan]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!scanning && !loading && !product && (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={startScanner}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 text-primary font-medium hover:bg-primary/20 transition-colors"
            >
              <Camera size={22} />
              {mode === "verify" ? "Scanner pour vérifier le produit" : "Scanner un code-barres EAN"}
            </button>
          </motion.div>
        )}

        {scanning && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative rounded-2xl overflow-hidden border border-border"
          >
            <div className="bg-card px-4 py-3 flex items-center justify-between border-b border-border">
              <p className="text-sm font-medium text-foreground">📷 Pointez vers le code-barres</p>
              <button onClick={stopScanner} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div id={containerId} className="w-full min-h-[250px]" />
            <div className="px-4 py-2 bg-muted/40 text-center">
              <p className="text-xs text-muted-foreground">Placez le code-barres EAN-13 dans le cadre</p>
            </div>
          </motion.div>
        )}

        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8 gap-3"
          >
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Recherche du produit...</p>
          </motion.div>
        )}

        {product && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-4 ${
              verifyResult === "match"
                ? "border-green-500/50 bg-green-500/5"
                : verifyResult === "mismatch"
                ? "border-destructive/50 bg-destructive/5"
                : "border-border bg-card"
            }`}
          >
            {verifyResult && (
              <div className={`flex items-center gap-2 mb-3 text-sm font-medium ${
                verifyResult === "match" ? "text-green-600" : "text-destructive"
              }`}>
                {verifyResult === "match" ? "✅ Produit conforme" : "❌ Produit différent de la demande"}
              </div>
            )}

            <div className="flex gap-4">
              {product.image_url && (
                <img src={product.image_url} alt={product.product_name || ""} className="w-20 h-20 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {product.product_name || "Produit sans nom"}
                </p>
                {product.brand && (
                  <p className="text-sm text-muted-foreground">{product.brand}</p>
                )}
                {product.weight && (
                  <p className="text-xs text-muted-foreground mt-1">Poids : {product.weight}</p>
                )}
                {product.category && (
                  <p className="text-xs text-muted-foreground">Catégorie : {product.category}</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-1 font-mono">{product.ean_code}</p>
              </div>
            </div>

            <button
              onClick={() => { setProduct(null); setVerifyResult(null); }}
              className="w-full mt-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-xl transition-colors"
            >
              Scanner un autre code
            </button>
          </motion.div>
        )}

        {error && !scanning && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-destructive" />
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
            <button
              onClick={startScanner}
              className="w-full py-2 text-sm text-primary hover:bg-primary/10 rounded-xl transition-colors mt-1"
            >
              Réessayer
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EanScanner;
