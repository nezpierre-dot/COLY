import { useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "nidit:draft:";

/**
 * Hook minimaliste de brouillon localStorage avec debounce.
 * Sauvegarde automatique de la valeur sérialisée toutes les 600ms d'inactivité.
 *
 * Usage:
 *   const { draft, save, clear, hasDraft } = useDraft<MyForm>("send-coly");
 *   useEffect(() => { if (draft) restoreFromDraft(draft); }, []);
 *   useEffect(() => { save({ field1, field2, ... }); }, [field1, field2]);
 *   onSubmitSuccess: clear();
 */
export function useDraft<T>(key: string) {
  const storageKey = STORAGE_PREFIX + key;
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) !== null;
  });
  const timerRef = useRef<number | null>(null);

  const read = (): { data: T; updatedAt: number } | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const save = (data: T) => {
    if (typeof window === "undefined") return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ data, updatedAt: Date.now() }));
        setHasDraft(true);
      } catch {
        // Quota exceeded or private browsing — silently ignore
      }
    }, 600);
  };

  const clear = () => {
    if (typeof window === "undefined") return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    localStorage.removeItem(storageKey);
    setHasDraft(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { read, save, clear, hasDraft };
}
