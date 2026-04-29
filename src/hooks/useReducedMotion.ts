import { useEffect, useState } from "react";

/**
 * Hook respectant `prefers-reduced-motion` au niveau OS / navigateur.
 * Renvoie `true` si l'utilisateur préfère réduire les animations.
 *
 * Utilisable conjointement avec Framer Motion (qui a son propre `useReducedMotion`)
 * pour conditionner aussi nos animations CSS / setTimeout / scroll smooth.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Safari < 14 fallback
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, []);

  return reduced;
};

export default useReducedMotion;
