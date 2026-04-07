import { useState, useCallback, useEffect } from "react";
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";

interface ProofItem {
  id: string;
  photo_url: string;
  created_at?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface ProofGalleryProps {
  proofs: ProofItem[];
  icon: React.ReactNode;
  title: string;
  canDownload?: boolean;
}

const ProofGallery = ({ proofs, icon, title, canDownload = false }: ProofGalleryProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, dragFree: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setScale(1);
  };

  const closeLightbox = () => setLightboxIndex(null);

  const navigateLightbox = (dir: -1 | 1) => {
    if (lightboxIndex === null) return;
    const next = lightboxIndex + dir;
    if (next >= 0 && next < proofs.length) {
      setLightboxIndex(next);
      setScale(1);
    }
  };

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `preuve-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  const isSingle = proofs.length === 1;
  const currentProof = lightboxIndex !== null ? proofs[lightboxIndex] : null;

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <p className="text-xs font-semibold text-foreground">{title}</p>
          </div>
          {canDownload && proofs.length > 0 && (
            <button
              onClick={() => handleDownload(proofs[isSingle ? 0 : selectedIndex].photo_url, isSingle ? 0 : selectedIndex)}
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              <Download size={12} /> Télécharger
            </button>
          )}
        </div>

        {isSingle ? (
          <div className="space-y-2">
            <div
              onClick={() => openLightbox(0)}
              className="cursor-zoom-in relative group"
            >
              <img
                src={proofs[0].photo_url}
                alt={title}
                className="w-full rounded-xl object-cover"
                style={{ maxHeight: 220 }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ZoomIn size={24} className="text-white drop-shadow-lg" />
              </div>
            </div>
            <ProofMeta proof={proofs[0]} />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Embla carousel */}
            <div className="overflow-hidden rounded-xl" ref={emblaRef}>
              <div className="flex">
                {proofs.map((proof, i) => (
                  <div
                    key={proof.id}
                    className="min-w-0 flex-[0_0_100%] cursor-zoom-in relative group"
                    onClick={() => openLightbox(i)}
                  >
                    <img
                      src={proof.photo_url}
                      alt={`${title} ${i + 1}`}
                      className="w-full rounded-xl object-cover"
                      style={{ maxHeight: 220 }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn size={24} className="text-white drop-shadow-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Dots */}
            <div className="flex items-center justify-center gap-1.5">
              {proofs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === selectedIndex
                      ? "bg-primary w-4"
                      : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <ProofMeta proof={proofs[selectedIndex]} />
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {currentProof && lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Download in lightbox */}
            {canDownload && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(currentProof.photo_url, lightboxIndex); }}
                className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <Download size={18} />
              </button>
            )}

            {/* Counter */}
            {proofs.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/70 text-xs font-medium bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                {lightboxIndex + 1} / {proofs.length}
              </div>
            )}

            {/* Prev / Next */}
            {proofs.length > 1 && lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {proofs.length > 1 && lightboxIndex < proofs.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Zoom controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(0.5, s - 0.5)); }}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-white/70 text-xs font-medium min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(3, s + 0.5)); }}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ZoomIn size={18} />
              </button>
            </div>

            {/* Image */}
            <motion.img
              key={lightboxIndex}
              src={currentProof.photo_url}
              alt={title}
              onClick={(e) => { e.stopPropagation(); setScale((s) => (s >= 2 ? 1 : s + 0.5)); }}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg cursor-zoom-in select-none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              draggable={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const ProofMeta = ({ proof }: { proof: ProofItem }) => (
  <div className="flex items-center justify-between text-xs text-muted-foreground">
    {proof.created_at && <span>📅 {new Date(proof.created_at).toLocaleString("fr-FR")}</span>}
    {proof.latitude && proof.longitude && (
      <span>📍 {Number(proof.latitude).toFixed(4)}, {Number(proof.longitude).toFixed(4)}</span>
    )}
  </div>
);

export default ProofGallery;
