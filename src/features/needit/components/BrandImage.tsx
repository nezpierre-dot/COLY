import { useState } from "react";
import { ImageOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  src?: string | null;
  alt: string;
  /** Contenu de fallback affiché lorsqu'aucune image n'est disponible (initiales, icône, etc.) */
  fallback: React.ReactNode;
  /** Classes utilitaires appliquées au conteneur carré (taille, arrondi, etc.) */
  className?: string;
  /** Classes spécifiques à l'image elle-même (object-fit, etc.) */
  imgClassName?: string;
  /** Affiche un badge "sans photo" sur le fallback */
  showNoPhotoBadge?: boolean;
}

/**
 * Image de marque/produit avec skeleton de chargement local.
 * Évite le clignotement avant l'affichage du badge "sans photo".
 */
const BrandImage = ({
  src,
  alt,
  fallback,
  className = "w-16 h-16 rounded-2xl",
  imgClassName = "object-contain",
  showNoPhotoBadge = true,
}: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Pas d'image fournie ou échec de chargement → fallback direct
  if (!src || errored) {
    return (
      <div
        className={`relative ${className} bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0`}
      >
        {fallback}
        {showNoPhotoBadge && (
          <span
            aria-label="Sans photo"
            className="absolute -bottom-1 -right-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted border border-border text-[9px] font-semibold text-muted-foreground"
          >
            <ImageOff size={8} />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className} shrink-0 overflow-hidden`}>
      {!loaded && <Skeleton className={`absolute inset-0 ${className}`} />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`w-full h-full ${imgClassName} transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};

export default BrandImage;
