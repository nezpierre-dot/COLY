import { motion } from "framer-motion";
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

const ANIMATIONS = {
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
} as const;

const Nido = ({
  pose = "hello",
  size = "md",
  animate = "float",
  className,
  alt = "Nido, la mascotte de Nidit",
  priority = false,
}: NidoProps) => {
  const motionProps = ANIMATIONS[animate];
  return (
    <motion.div
      className={cn("inline-flex items-center justify-center select-none", SIZES[size], className)}
      animate={motionProps.animate}
      transition={motionProps.transition}
    >
      <img
        src={POSES[pose]}
        alt={alt}
        width={1024}
        height={1024}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="w-full h-full object-contain drop-shadow-[0_8px_24px_rgba(13,132,255,0.25)]"
        draggable={false}
      />
    </motion.div>
  );
};

export default Nido;
