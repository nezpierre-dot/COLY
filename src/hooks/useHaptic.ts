/**
 * useHaptic — Hook de feedback haptique léger pour mobile.
 *
 * Usage :
 *   const haptic = useHaptic();
 *   <button onClick={() => { haptic('tap'); doSomething(); }} />
 *
 * Aucune dépendance — utilise navigator.vibrate (Android/Chrome).
 * No-op silencieux sur iOS Safari (qui ne supporte pas l'API).
 * Respecte prefers-reduced-motion (désactivé si l'utilisateur a réduit les animations).
 */

import { useCallback } from "react";

export type HapticPattern = "tap" | "success" | "warning" | "error" | "selection" | "impact";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  selection: 5,
  impact: 20,
  success: [10, 40, 10],
  warning: [20, 60, 20],
  error: [40, 80, 40, 80, 40],
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function vibrateSafe(pattern: number | number[]): boolean {
  try {
    if (typeof navigator === "undefined") return false;
    if (!("vibrate" in navigator)) return false;
    if (prefersReducedMotion()) return false;
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

export function useHaptic() {
  return useCallback((pattern: HapticPattern = "tap") => {
    vibrateSafe(PATTERNS[pattern]);
  }, []);
}

/** Trigger une vibration sans hook (utile dans handlers globaux). */
export function haptic(pattern: HapticPattern = "tap"): void {
  vibrateSafe(PATTERNS[pattern]);
}

export default useHaptic;
