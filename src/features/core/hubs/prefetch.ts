/**
 * Hub utilities — keep lazy chunks small and prefetch them on idle/hover/visibility.
 *
 * Why a dedicated module ?
 *  - Centralises the dynamic imports so we can reuse them between routes,
 *    `<Link>` hover prefetch, BottomNav, MyAccount shortcuts, etc.
 *  - `prefetchHub("wallet")` triggers the same import() the route uses, so the
 *    browser caches the chunk; subsequent navigation is near-instant.
 *  - Idle prefetch on the Dashboard mount uses `requestIdleCallback` to avoid
 *    competing with critical work.
 */

type HubKey = "wallet" | "progression" | "activity";

const importers: Record<HubKey, () => Promise<unknown>> = {
  wallet: () => import("@/features/core/pages/WalletHub"),
  progression: () => import("@/features/core/pages/ProgressionHub"),
  activity: () => import("@/features/core/pages/ActivityHub"),
};

const prefetched = new Set<HubKey>();

export function prefetchHub(hub: HubKey): void {
  if (prefetched.has(hub)) return;
  prefetched.add(hub);
  // Fire-and-forget; failures are silent (will retry on real navigation)
  importers[hub]().catch(() => prefetched.delete(hub));
}

/**
 * Schedule a prefetch when the browser is idle. Falls back to a small timeout.
 */
export function prefetchHubOnIdle(hub: HubKey, timeoutMs = 2500): void {
  if (typeof window === "undefined") return;
  const cb = () => prefetchHub(hub);
  const ric = (window as any).requestIdleCallback as
    | ((handler: () => void, options?: { timeout?: number }) => number)
    | undefined;
  if (typeof ric === "function") {
    ric(cb, { timeout: timeoutMs });
  } else {
    setTimeout(cb, timeoutMs);
  }
}

/**
 * Prefetch all 3 hubs sequentially on idle. Good citizen on slow connections:
 * skip if `navigator.connection.saveData` is true or effective type is 2g/slow-2g.
 */
export function prefetchAllHubsOnIdle(): void {
  if (typeof navigator !== "undefined") {
    // @ts-expect-error legacy types
    const c = navigator.connection;
    if (c && (c.saveData || c.effectiveType === "2g" || c.effectiveType === "slow-2g")) return;
  }
  prefetchHubOnIdle("wallet", 2500);
  prefetchHubOnIdle("activity", 4000);
  prefetchHubOnIdle("progression", 6000);
}
