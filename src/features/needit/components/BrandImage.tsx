import { useState } from "react";
import { ImageOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  src?: string | null;
  /** Nom de la marque ou du produit. Sert à composer le libellé alt + aria. */
  alt: string;
  /** Contenu de fallback affiché lorsqu'aucune image n'est disponible (initiales, icône, etc.) */
  fallback: React.ReactNode;
  /** Classes utilitaires appliquées au conteneur carré (taille, arrondi, etc.) */
  className?: string;
  /** Classes spécifiques à l'image elle-même (object-fit, etc.) */
  imgClassName?: string;
  /** Affiche un badge "sans photo" sur le fallback */
  showNoPhotoBadge?: boolean;
  /** Type d'élément représenté ("logo", "produit", "image"…) — utilisé pour le libellé accessible */
  kind?: "logo" | "produit" | "image";
}

/**
 * Image de marque/produit avec skeleton de chargement local.
 * - Taille/arrondi stables entre skeleton, image et fallback (pas de saut de layout).
 * - aria-busy pendant le chargement, role="img" sur le fallback, libellé cohérent.
 */
const BrandImage = ({
  src,
  alt,
  fallback,
  className = "w-16 h-16 rounded-2xl",
  imgClassName = "object-contain",
  showNoPhotoBadge = true,
  kind = "image",
}: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const accessibleLabel = `${kind === "logo" ? "Logo" : kind === "produit" ? "Photo du produit" : "Image"} ${alt}`.trim();
  const fallbackLabel = `${accessibleLabel} — sans photo`;

  // Pas d'image fournie ou échec de chargement → fallback direct
  if (!src || errored) {
    return (
      <div
        role="img"
        aria-label={fallbackLabel}
        className={`relative ${className} bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0`}
      >
        <span aria-hidden="true" className="flex items-center justify-center">
          {fallback}
        </span>
        {showNoPhotoBadge && (
          <span
            aria-hidden="true"
            title="Sans photo"
            className="absolute -bottom-1 -right-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-background border border-border text-[9px] font-semibold text-foreground/70 shadow-sm"
          >
            <ImageOff size={8} aria-hidden="true" />
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${className} shrink-0 overflow-hidden`}
      aria-busy={!loaded}
    >
      {!loaded && (
        <Skeleton
          aria-hidden="true"
          className={`absolute inset-0 ${className}`}
        />
      )}
      <img
        src={src}
        alt={accessibleLabel}
        loading="lazy"
        decoding="async"
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
