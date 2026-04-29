import { Skeleton } from "@/components/ui/skeleton";

/** Shimmer card used in lists (history, missions, voyages) */
export const ListItemSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-xl border border-border p-3.5 flex gap-3">
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-1.5 w-full rounded-full mt-1" />
        </div>
        <div className="space-y-2 items-end flex flex-col">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-2 w-8" />
        </div>
      </div>
    ))}
  </div>
);

/** Notification row skeleton */
export const NotificationSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3 bg-card border border-border">
        <Skeleton className="w-5 h-5 rounded-full mt-0.5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

/** Dashboard quick stat tile skeleton (3-up) */
export const StatTilesSkeleton = () => (
  <div className="grid grid-cols-3 gap-2 mb-4" aria-hidden="true">
    {Array.from({ length: 3 }).map((_, i) => (
      <Skeleton key={i} className="h-16 rounded-2xl" />
    ))}
  </div>
);

/** Wallet card skeleton */
export const WalletCardSkeleton = () => (
  <div className="bg-card rounded-3xl border border-border p-5 mb-4 space-y-3" aria-hidden="true">
    <div className="flex items-center justify-between">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    <Skeleton className="h-9 w-32" />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-10 flex-1 rounded-xl" />
      <Skeleton className="h-10 flex-1 rounded-xl" />
    </div>
  </div>
);

/** Voyage row skeleton */
export const VoyageSkeleton = ({ count = 2 }: { count?: number }) => (
  <div className="space-y-3" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    ))}
  </div>
);
