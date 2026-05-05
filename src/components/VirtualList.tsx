import { useRef, useEffect, type ReactNode } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

interface VirtualListProps<T> {
  items: T[];
  /** Estimated row height in px — used before measurement */
  estimateSize?: number;
  /** Number of off-screen rows to render */
  overscan?: number;
  /** Pixel gap between rows */
  gap?: number;
  /** Render function for each row */
  children: (item: T, index: number) => ReactNode;
  /** Stable key extractor */
  getKey: (item: T, index: number) => string;
  className?: string;
}

/**
 * Window-scroll virtualized list. Use it whenever a list can grow beyond
 * ~50 items to keep mobile rendering snappy. Auto-measures row heights.
 *
 * For lists shorter than 30 items, prefer plain `.map()` — virtualization
 * adds layout overhead that isn't worth it on small lists.
 */
export function VirtualList<T>({
  items,
  estimateSize = 160,
  overscan = 6,
  gap = 12,
  children,
  getKey,
  className,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  // Track parent's offset from document top for window virtualizer
  useEffect(() => {
    if (!parentRef.current) return;
    const update = () => {
      if (!parentRef.current) return;
      offsetRef.current =
        parentRef.current.getBoundingClientRect().top + window.scrollY;
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => estimateSize + gap,
    overscan,
    scrollMargin: offsetRef.current,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className={className}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((vRow) => {
          const item = items[vRow.index];
          if (!item) return null;
          return (
            <div
              key={getKey(item, vRow.index)}
              data-index={vRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vRow.start - virtualizer.options.scrollMargin}px)`,
                paddingBottom: `${gap}px`,
              }}
            >
              {children(item, vRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VirtualList;
