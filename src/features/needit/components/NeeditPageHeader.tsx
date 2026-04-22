import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  title: string;
  subtitle?: string;
  /** Si défini, override le comportement par défaut (navigate(-1)). */
  onBack?: () => void;
  /** Action supplémentaire à droite (ex: bouton "Annuler"). */
  rightSlot?: React.ReactNode;
}

/**
 * Header collant style Vinted : retour très visible à gauche, titre centré
 * sur deux lignes optionnelles, fond blanc semi-translucide flouté.
 */
const NeeditPageHeader = ({ title, subtitle, onBack, rightSlot }: Props) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60">
      <div className="flex items-center gap-2 px-3 py-3 max-w-2xl mx-auto">
        <button
          onClick={handleBack}
          aria-label="Retour"
          className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-muted active:bg-muted/70 transition-colors"
        >
          <ChevronLeft size={26} className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0 text-center px-2">
          <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="shrink-0 w-11 h-11 flex items-center justify-end">{rightSlot}</div>
      </div>
    </header>
  );
};

export default NeeditPageHeader;
