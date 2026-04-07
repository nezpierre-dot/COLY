import { useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoLightboxProps {
  src: string;
  alt?: string;
  children: React.ReactNode;
}

const PhotoLightbox = ({ src, alt = "Photo", children }: PhotoLightboxProps) => {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const toggleZoom = () => setScale((s) => (s >= 2 ? 1 : s + 0.5));

  return (
    <>
      <div onClick={() => { setOpen(true); setScale(1); }} className="cursor-zoom-in relative group">
        {children}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn size={24} className="text-white drop-shadow-lg" />
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={() => setOpen(false)}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>

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
              src={src}
              alt={alt}
              onClick={(e) => { e.stopPropagation(); toggleZoom(); }}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg cursor-zoom-in select-none"
              style={{ transform: `scale(${scale})` }}
              initial={{ scale: 0.8 }}
              animate={{ scale }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              draggable={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PhotoLightbox;
