import { useEffect, useRef, useState } from "react";
import { useUserPoints, getLevelInfo } from "@/hooks/useUserPoints";
import { successFeedback } from "@/lib/successFeedback";

const LEVEL_LABELS: Record<string, string> = {
  green: "Green 🌱",
  gold: "Gold ⭐",
  platine: "Platine 💎",
  diamant: "Diamant 💠",
};

/**
 * Detects when user levels up and triggers a celebration.
 * Returns `showConfetti` boolean to drive ConfettiCelebration.
 */
export const useLevelUpCelebration = () => {
  const { data: points } = useUserPoints();
  const prevLevelRef = useRef<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!points) return;
    const currentLevel = getLevelInfo(points.total_points).level;

    // On first load, just store the level without celebrating
    if (prevLevelRef.current === null) {
      // Check localStorage for persisted level to detect cross-session level-ups
      const stored = localStorage.getItem("user-level");
      if (stored && stored !== currentLevel && isHigherLevel(currentLevel, stored)) {
        // Level up happened between sessions
        triggerCelebration(currentLevel);
      }
      prevLevelRef.current = currentLevel;
      localStorage.setItem("user-level", currentLevel);
      return;
    }

    if (currentLevel !== prevLevelRef.current && isHigherLevel(currentLevel, prevLevelRef.current)) {
      triggerCelebration(currentLevel);
    }

    prevLevelRef.current = currentLevel;
    localStorage.setItem("user-level", currentLevel);
  }, [points]);

  const triggerCelebration = (level: string) => {
    setShowConfetti(true);
    successFeedback(
      `🎉 Niveau ${LEVEL_LABELS[level] || level} atteint !`,
      { description: "Félicitations ! tu débloques de nouveaux avantages.", duration: 6000 }
    );
    setTimeout(() => setShowConfetti(false), 4000);
  };

  return { showConfetti };
};

const LEVEL_ORDER = ["green", "gold", "platine", "diamant"];

function isHigherLevel(current: string, previous: string): boolean {
  return LEVEL_ORDER.indexOf(current) > LEVEL_ORDER.indexOf(previous);
}
