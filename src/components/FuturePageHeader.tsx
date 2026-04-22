import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import waveHandIllustration from "@/assets/illustrations/wave-hand.png";

interface FuturePageHeaderProps {
  /** Greeting bubble label (e.g. "Bonjour !") — if provided, shows the white pill with waving hand */
  greeting?: string;
  /** Main title (large, bold) */
  title: ReactNode;
  /** Optional gradient-coloured second line of the title */
  titleAccent?: ReactNode;
  /** Subtitle / supporting text */
  subtitle?: ReactNode;
  /** Optional illustration (image src or React node) shown on the right */
  illustration?: ReactNode;
  /** Show a soft back button (top-left) */
  showBack?: boolean;
  /** Override back navigation */
  onBack?: () => void;
  /** Right-side actions (notification bell, role switcher, etc.) */
  actions?: ReactNode;
  /** Extra content rendered below the subtitle (badges, chips, etc.) */
  children?: ReactNode;
  /** Compact mode (smaller paddings/typography) — useful for sub-pages */
  compact?: boolean;
}

/**
 * Universal "Future" page header — luminous gradient, organic auras,
 * white greeting pill, big bold title with gradient accent and optional illustration.
 * Mirrors the look of the Demandeur Dashboard hero across the entire app.
 */
const FuturePageHeader = ({
  greeting,
  title,
  titleAccent,
  subtitle,
  illustration,
  showBack,
  onBack,
  actions,
  children,
  compact = false,
}: FuturePageHeaderProps) => {
  const navigate = useNavigate();
  const handleBack = () => (onBack ? onBack() : navigate(-1));

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`page-header-bright ${compact ? "!pt-10 !pb-6" : ""}`}
    >
      {(showBack || actions) && (
        <div className="relative flex items-center justify-between mb-4">
          {showBack ? (
            <button
              onClick={handleBack}
              className="icon-btn-soft"
              aria-label="Retour"
            >
              <ArrowLeft size={18} className="text-foreground" />
            </button>
          ) : <span />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}

      <div className={`relative grid ${illustration ? "grid-cols-[1fr_auto] gap-3 sm:gap-5" : "grid-cols-1"} items-start`}>
        <div className="min-w-0">
          {greeting && (
            <motion.span
              initial={{ opacity: 0, y: -6, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.05 }}
              className="greeting-bubble-xl mb-4"
            >
              <motion.img
                src={waveHandIllustration}
                alt=""
                aria-hidden="true"
                className="w-6 h-6 object-contain"
                animate={{ rotate: [0, 18, -8, 14, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
              />
              {greeting}
            </motion.span>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className={`font-extrabold leading-[1.04] tracking-tight text-foreground ${
              compact
                ? "text-[clamp(1.65rem,5vw,2.2rem)]"
                : "text-[clamp(2rem,6.5vw,3rem)]"
            }`}
          >
            {title}
            {titleAccent && (
              <>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                  {titleAccent}
                </span>
              </>
            )}
          </motion.h1>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18 }}
              className="mt-3 text-[15px] sm:text-base text-muted-foreground font-medium max-w-[320px] leading-snug"
            >
              {subtitle}
            </motion.p>
          )}
          {children && <div className="mt-4">{children}</div>}
        </div>

        {illustration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 16, delay: 0.05 }}
            className={`relative shrink-0 ${
              compact ? "w-[110px] h-[110px]" : "w-[130px] h-[130px] sm:w-[170px] sm:h-[170px]"
            } -mt-1`}
          >
            {typeof illustration === "string" ? (
              <motion.img
                src={illustration}
                alt=""
                aria-hidden="true"
                className="relative w-full h-full object-contain drop-shadow-[0_18px_28px_rgba(80,90,200,0.25)]"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              illustration
            )}
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default FuturePageHeader;
