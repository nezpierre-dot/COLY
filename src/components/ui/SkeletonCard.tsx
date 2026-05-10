/**
 * SkeletonCard — patterns de skeleton loaders pour Nidit.
 *
 * Utilise la classe .skeleton (shimmer animé) déjà déclarée dans index.css (tokens v2).
 * Respecte prefers-reduced-motion automatiquement (via CSS).
 *
 * Usage :
 *   {isLoading ? <SkeletonList count={5} /> : <RealList items={items} />}
 *   {isLoading ? <SkeletonCard /> : <RealCard data={data} />}
 */

import type { CSSProperties } from "react";

export interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

/** Bloc skeleton générique — utilise les classes Tailwind pour la taille. */
export function Skeleton({ className = "h-4 w-full", style }: SkeletonProps) {
  return <div role="status" aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

/** Texte skeleton — N lignes, dernière ligne légèrement plus courte. */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} role="status" aria-label="Chargement">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** Skeleton pour une carte type voyage / mission / colis. */
export function SkeletonCard({ withAvatar = true, className = "" }: { withAvatar?: boolean; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Chargement de la carte"
      className={`card-future flex flex-col gap-4 ${className}`}
    >
      {withAvatar ? (
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ) : null}
      <Skeleton className="h-5 w-3/4" />
      <SkeletonText lines={2} />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}

/** Liste de N skeleton cards. */
export function SkeletonList({ count = 3, withAvatar = true, className = "" }: { count?: number; withAvatar?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col gap-4 ${className}`} role="status" aria-label="Chargement de la liste">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} withAvatar={withAvatar} />
      ))}
    </div>
  );
}

/** Skeleton pour une grille (2-3 colonnes). */
export function SkeletonGrid({ count = 6, columns = 3, className = "" }: { count?: number; columns?: 2 | 3 | 4; className?: string }) {
  const cols: Record<2 | 3 | 4, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  };
  return (
    <div className={`grid gap-4 ${cols[columns]} ${className}`} role="status" aria-label="Chargement">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} withAvatar={false} />
      ))}
    </div>
  );
}

export default SkeletonCard;
