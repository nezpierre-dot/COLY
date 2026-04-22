// Centralized mapping for the 15 NeedIt category icons.
// PNG sources live in src/assets/icons/cat-*.png

import catTabac from "@/assets/icons/cat-tabac.png";
import catParfum from "@/assets/icons/cat-parfum.png";
import catAlcool from "@/assets/icons/cat-alcool.png";
import catCosmetique from "@/assets/icons/cat-cosmetique.png";
import catHightech from "@/assets/icons/cat-hightech.png";
import catMaroquinerie from "@/assets/icons/cat-maroquinerie.png";
import catEpicerie from "@/assets/icons/cat-epicerie.png";
import catMode from "@/assets/icons/cat-mode.png";
import catBebe from "@/assets/icons/cat-bebe.png";
import catPharmacie from "@/assets/icons/cat-pharmacie.png";
import catCafe from "@/assets/icons/cat-cafe.png";
import catCaviar from "@/assets/icons/cat-caviar.png";
import catJeuxvideo from "@/assets/icons/cat-jeuxvideo.png";
import catLivres from "@/assets/icons/cat-livres.png";
import catAutres from "@/assets/icons/cat-autres.png";

export type CategoryKey =
  | "tabac"
  | "parfum"
  | "alcool"
  | "cosmetique"
  | "hightech"
  | "maroquinerie"
  | "epicerie"
  | "mode"
  | "bebe"
  | "pharmacie"
  | "cafe"
  | "caviar"
  | "jeuxvideo"
  | "livres"
  | "autres";

export interface CategoryDef {
  key: CategoryKey;
  label: string;       // canonical FR label used in DB category_path
  icon: string;        // imported image url
  children?: { label: string }[];
}

export const CATEGORIES: CategoryDef[] = [
  { key: "tabac", label: "Tabac", icon: catTabac, children: [
    { label: "Cigarettes" }, { label: "Cigares" }, { label: "Tabac à rouler" },
  ]},
  { key: "parfum", label: "Parfum", icon: catParfum, children: [
    { label: "Eau de parfum" }, { label: "Eau de toilette" }, { label: "Coffret" },
  ]},
  { key: "alcool", label: "Alcool", icon: catAlcool, children: [
    { label: "Whisky / Bourbon" }, { label: "Vin" }, { label: "Champagne" }, { label: "Spiritueux" },
  ]},
  { key: "cosmetique", label: "Cosmétique", icon: catCosmetique, children: [
    { label: "Maquillage" }, { label: "Soin visage" }, { label: "Soin corps" },
  ]},
  { key: "hightech", label: "High-Tech", icon: catHightech, children: [
    { label: "Smartphones" }, { label: "Ordinateurs" }, { label: "Accessoires" },
  ]},
  { key: "maroquinerie", label: "Maroquinerie", icon: catMaroquinerie, children: [
    { label: "Sac à main" }, { label: "Portefeuille" }, { label: "Montre" },
  ]},
  { key: "epicerie", label: "Épicerie fine", icon: catEpicerie, children: [
    { label: "Chocolat" }, { label: "Confiserie" }, { label: "Conserves" }, { label: "Huile / Vinaigre" },
  ]},
  { key: "mode", label: "Mode", icon: catMode, children: [
    { label: "Vêtements" }, { label: "Chaussures" }, { label: "Accessoires" },
  ]},
  { key: "bebe", label: "Bébé", icon: catBebe, children: [
    { label: "Lait infantile" }, { label: "Couches" }, { label: "Soins bébé" },
  ]},
  { key: "pharmacie", label: "Pharmacie", icon: catPharmacie, children: [
    { label: "Médicaments OTC" }, { label: "Compléments" }, { label: "Parapharmacie" },
  ]},
  { key: "cafe", label: "Café", icon: catCafe, children: [
    { label: "Grains" }, { label: "Capsules" }, { label: "Moulu" },
  ]},
  { key: "caviar", label: "Caviar", icon: catCaviar, children: [
    { label: "Caviar" }, { label: "Truffe" }, { label: "Foie gras" },
  ]},
  { key: "jeuxvideo", label: "Jeux vidéo", icon: catJeuxvideo, children: [
    { label: "Console" }, { label: "Jeux" }, { label: "Manettes / Accessoires" },
  ]},
  { key: "livres", label: "Livres", icon: catLivres, children: [
    { label: "Roman" }, { label: "BD / Manga" }, { label: "Beaux livres" },
  ]},
  { key: "autres", label: "Autres", icon: catAutres },
];

const LABEL_TO_ICON: Record<string, string> = CATEGORIES.reduce((acc, c) => {
  acc[c.label.toLowerCase()] = c.icon;
  acc[c.key] = c.icon;
  return acc;
}, {} as Record<string, string>);

// Aliases to match legacy / variant labels found in the DB
const ALIASES: Record<string, CategoryKey> = {
  "high-tech": "hightech",
  "high tech": "hightech",
  "high-tech / électronique": "hightech",
  "alimentation / boissons": "epicerie",
  "épicerie": "epicerie",
  "epicerie": "epicerie",
  "vins / spiritueux": "alcool",
  "spiritueux": "alcool",
  "cigarettes": "tabac",
  "cosmétique / beauté": "cosmetique",
  "beauté": "cosmetique",
  "vêtements": "mode",
  "mode / accessoires": "mode",
  "sac": "maroquinerie",
  "montre": "maroquinerie",
  "jeux vidéo / consoles": "jeuxvideo",
  "console": "jeuxvideo",
  "santé": "pharmacie",
  "médicaments": "pharmacie",
  "épicerie fine": "epicerie",
};

/**
 * Resolve an icon from a category_path array (or a single label string).
 * Falls back to the "autres" icon if no match.
 */
export const getCategoryIcon = (
  categoryPath?: string[] | string | null
): string => {
  if (!categoryPath) return catAutres;
  const candidates: string[] = Array.isArray(categoryPath) ? categoryPath : [categoryPath];
  for (const raw of candidates) {
    if (!raw) continue;
    const norm = raw.trim().toLowerCase();
    if (LABEL_TO_ICON[norm]) return LABEL_TO_ICON[norm];
    const alias = ALIASES[norm];
    if (alias && LABEL_TO_ICON[alias]) return LABEL_TO_ICON[alias];
    // partial contains
    for (const def of CATEGORIES) {
      if (norm.includes(def.label.toLowerCase()) || def.label.toLowerCase().includes(norm)) {
        return def.icon;
      }
    }
  }
  return catAutres;
};

export const getCategoryDef = (key: CategoryKey): CategoryDef | undefined =>
  CATEGORIES.find((c) => c.key === key);
