import { memo, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import nidoHello from "@/assets/nido/nido-hello.png";
import nidoFly from "@/assets/nido/nido-fly.png";
import nidoSleep from "@/assets/nido/nido-sleep.png";
import nidoCelebrate from "@/assets/nido/nido-celebrate.png";
import nidoSearch from "@/assets/nido/nido-search.png";

export type NidoPose = "hello" | "fly" | "sleep" | "celebrate" | "search";

const POSES: Record<NidoPose, string> = {
  hello: nidoHello,
  fly: nidoFly,
  sleep: nidoSleep,
  celebrate: nidoCelebrate,
  search: nidoSearch,
};

const SIZES = {
  xs: "w-12 h-12",
  sm: "w-20 h-20",
  md: "w-32 h-32",
  lg: "w-44 h-44",
  xl: "w-60 h-60",
} as const;

// Smaller intrinsic dimensions reduce decode/raster cost dramatically on mobile.
// The source PNGs are 1024×1024 — we tell the browser the display size so it
// downsamples once instead of holding the full bitmap.
const INTRINSIC: Record<keyof typeof SIZES, number> = {
  xs: 96,
  sm: 160,
  md: 256,
  lg: 352,
  xl: 480,
};

interface NidoProps {
  pose?: NidoPose;
  size?: keyof typeof SIZES;
  /** Animation: float (gentle bob), bounce, wiggle, none */
  animate?: "float" | "bounce" | "wiggle" | "none";
  className?: string;
  alt?: string;
  /** When true, image is high-priority (LCP). Otherwise lazy-loaded. */
  priority?: boolean;
}

const ANIMATIONS: Record<string, { animate: any; transition: any }> = {
  float: {
    animate: { y: [0, -6, 0] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  bounce: {
    animate: { y: [0, -12, 0] },
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
  wiggle: {
    animate: { rotate: [-3, 3, -3] },
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
  none: { animate: {}, transition: {} },
};

// Module-level set: poses already loaded at least once never need a re-decode pause.
const decodedPoses = new Set<NidoPose>();

const NidoBase = ({
  pose = "hello",
  size = "md",
  animate = "float",
  className,
  alt = "Nido, la mascotte de Nidit",
  priority = false,
}: NidoProps) => {
  const prefersReducedMotion = useFramerReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Visibility gating: pause the animation loop when the mascot is offscreen.
  // Massively reduces main-thread work when many Nidos are mounted (lists, dashboards).
  const [isVisible, setIsVisible] = useState(priority);

  useEffect(() => {
    if (priority) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { rootMargin: "120px" } // start animating slightly before entering viewport
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [priority]);

  // Disable animation entirely when reduced motion is requested.
  const effectiveAnimate = prefersReducedMotion ? "none" : animate;
  const motionProps = ANIMATIONS[effectiveAnimate];
  const shouldAnimate = isVisible && effectiveAnimate !== "none";

  const intrinsic = INTRINSIC[size];
  const isAlreadyDecoded = decodedPoses.has(pose);

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "inline-flex items-center justify-center select-none",
        SIZES[size],
        className
      )}
      animate={shouldAnimate ? motionProps.animate : undefined}
      transition={shouldAnimate ? motionProps.transition : undefined}
      style={{ willChange: shouldAnimate ? "transform" : "auto" }}
    >
      <img
        src={POSES[pose]}
        alt={alt}
        width={intrinsic}
        height={intrinsic}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "low"}
        className={cn(
          "w-full h-full object-contain",
          // Drop-shadow filter is expensive on mobile GPUs.
          // Skip it for tiny instances (xs/sm) where it's barely visible anyway.
          (size === "md" || size === "lg" || size === "xl") &&
            "drop-shadow-[0_8px_24px_rgba(13,132,255,0.25)]"
        )}
        draggable={false}
        onLoad={() => decodedPoses.add(pose)}
        // Hint the compositor: the image content won't change frame-to-frame,
        // only its transform — perfect candidate for GPU layer promotion.
        style={
          isAlreadyDecoded
            ? undefined
            : { contentVisibility: "auto" as any }
        }
      />
    </motion.div>
  );
};

/**
 * Memoized to avoid re-renders when parent state changes but Nido props don't.
 * Critical for screens that mount many Nidos (Dashboard cards, lists, timelines).
 */
const Nido = memo(NidoBase);
Nido.displayName = "Nido";

export default Nido;
