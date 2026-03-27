import { ReactNode, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { hapticMedium } from "@/lib/haptics";

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export default function SwipeToDelete({ onDelete, children, disabled }: SwipeToDeleteProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping || disabled) return;
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    // Only allow left swipe, cap at 120px
    const clamped = Math.max(0, Math.min(diff, 120));
    setOffset(clamped);
  };

  const handleTouchEnd = () => {
    if (!swiping || disabled) return;
    setSwiping(false);
    if (offset >= threshold) {
      hapticMedium();
      setOffset(120);
      setTimeout(() => {
        onDelete();
        setOffset(0);
      }, 200);
    } else {
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-destructive rounded-xl transition-opacity"
        style={{ width: 120, opacity: Math.min(offset / threshold, 1) }}
      >
        <Trash2 size={20} className="text-destructive-foreground" />
      </div>
      {/* Swipeable content */}
      <div
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: swiping ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
