import { useCallback, useEffect, useState } from "react";
import type { CategoryKey } from "@/lib/categoryIcons";
import type { Brand, BrandProduct } from "./useBrandCatalog";

/**
 * Brouillon de création d'une mission NeedIt — partagé entre les 3 pages
 * (Catégories → Marques → Détail/Création) via sessionStorage.
 */
export interface NeeditDraft {
  // Étape 1
  categoryKey?: CategoryKey;
  categoryLabel?: string;
  // Étape 2
  brand?: Pick<Brand, "id" | "name" | "logo_url" | "category_key">;
  brandProduct?: Pick<BrandProduct, "id" | "name" | "photo_url" | "indicative_price" | "variants">;
  variant?: string | null;
  // Étape 3
  quantity?: number;
  budget?: string; // "" = vide, "__devis__" = sur devis
  comments?: string;
  // Localisation pour la création (préremplie depuis le brouillon précédent)
  pays?: string;
  ville?: string;
  pickupAddress?: string;
  // Pré-remplissage via scan EAN
  eanCode?: string;
}

const STORAGE_KEY = "nidit:needit:draft";

const read = (): NeeditDraft => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NeeditDraft) : {};
  } catch {
    return {};
  }
};

const write = (draft: NeeditDraft) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
};

export const clearNeeditDraft = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

/**
 * Hook réactif. Toute mise à jour est persistée dans sessionStorage et
 * propagée aux autres consommateurs via un événement custom.
 */
export const useNeeditDraft = () => {
  const [draft, setDraft] = useState<NeeditDraft>(() => read());

  useEffect(() => {
    const onChange = () => setDraft(read());
    window.addEventListener("nidit:needit:draft", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("nidit:needit:draft", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = useCallback((patch: Partial<NeeditDraft>) => {
    const next = { ...read(), ...patch };
    write(next);
    setDraft(next);
    window.dispatchEvent(new Event("nidit:needit:draft"));
  }, []);

  const reset = useCallback(() => {
    clearNeeditDraft();
    setDraft({});
    window.dispatchEvent(new Event("nidit:needit:draft"));
  }, []);

  return { draft, update, reset };
};
