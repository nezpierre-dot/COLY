// Centralized mapping for the 13 NeedIt category icons.
// SVG sources live in src/assets/icons/cat-*.svg
// (each SVG embeds the premium 3D illustration as a high-res image)

import catTabac from "@/assets/icons/cat-tabac.svg";
import catParfum from "@/assets/icons/cat-parfum.svg";
import catAlcool from "@/assets/icons/cat-alcool.svg";
import catCosmetique from "@/assets/icons/cat-cosmetique.svg";
import catHightech from "@/assets/icons/cat-hightech.svg";
import catMaroquinerie from "@/assets/icons/cat-maroquinerie.svg";
import catEpicerie from "@/assets/icons/cat-epicerie.svg";
import catMode from "@/assets/icons/cat-mode.svg";
import catBebe from "@/assets/icons/cat-bebe.svg";
import catPharmacie from "@/assets/icons/cat-pharmacie.svg";
import catJeuxvideo from "@/assets/icons/cat-jeuxvideo.svg";
import catLivres from "@/assets/icons/cat-livres.svg";
import catAutres from "@/assets/icons/cat-autres.svg";

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
  | "jeuxvideo"
  | "livres"
  | "autres";

export interface CategoryDef {
  key: CategoryKey;
  label: string;       // canonical FR label used in DB category_path
  icon: string;        // imported svg url
  children?: { label: string }[];
}

export const CATEGORIES: CategoryDef[] = [
  { key: "tabac", label: "Cigarettes & Tabac", icon: catTabac, children: [
    { label: "Cigarettes" }, { label: "Cigares" }, { label: "Tabac à rouler" },
  ]},
  { key: "parfum", label: "Parfums & Eaux", icon: catParfum, children: [
    { label: "Eau de parfum" }, { label: "Eau de toilette" }, { label: "Coffret" },
  ]},
  { key: "alcool", label: "Alcools & Spiritueux", icon: catAlcool, children: [
    { label: "Whisky / Bourbon" }, { label: "Vin" }, { label: "Champagne" }, { label: "Spiritueux" },
  ]},
  { key: "cosmetique", label: "Cosmétiques & Soins", icon: catCosmetique, children: [
    { label: "Maquillage" }, { label: "Soin visage" }, { label: "Soin corps" },
  ]},
  { key: "hightech", label: "High-Tech & Électronique", icon: catHightech, children: [
    { label: "Smartphones" }, { label: "Ordinateurs" }, { label: "Accessoires" },
  ]},
  { key: "maroquinerie", label: "Maroquinerie & Joaillerie", icon: catMaroquinerie, children: [
    { label: "Sac à main" }, { label: "Portefeuille" }, { label: "Montre" }, { label: "Bijoux" },
  ]},
  { key: "epicerie", label: "Épicerie fine & Chocolats", icon: catEpicerie, children: [
    { label: "Chocolat" }, { label: "Confiserie" }, { label: "Caviar / Truffe" }, { label: "Huile / Vinaigre" }, { label: "Café / Thé" },
  ]},
  { key: "mode", label: "Vêtements & Mode", icon: catMode, children: [
    { label: "Vêtements" }, { label: "Chaussures" }, { label: "Accessoires" },
  ]},
  { key: "bebe", label: "Produits pour bébés", icon: catBebe, children: [
    { label: "Lait infantile" }, { label: "Couches" }, { label: "Soins bébé" },
  ]},
  { key: "pharmacie", label: "Médicaments & Compléments", icon: catPharmacie, children: [
    { label: "Médicaments OTC" }, { label: "Compléments" }, { label: "Parapharmacie" },
  ]},
  { key: "jeuxvideo", label: "Jouets & Jeux vidéo", icon: catJeuxvideo, children: [
    { label: "Console" }, { label: "Jeux" }, { label: "Manettes / Accessoires" }, { label: "Jouets" },
  ]},
  { key: "livres", label: "Livres & Papeterie", icon: catLivres, children: [
    { label: "Roman" }, { label: "BD / Manga" }, { label: "Beaux livres" }, { label: "Papeterie" },
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
  // hightech
  "high-tech": "hightech",
  "high tech": "hightech",
  "high-tech / électronique": "hightech",
  "électronique": "hightech",
  "electronique": "hightech",
  // épicerie (incl. former café & caviar)
  "alimentation / boissons": "epicerie",
  "épicerie": "epicerie",
  "epicerie": "epicerie",
  "épicerie fine": "epicerie",
  "chocolats": "epicerie",
  "café": "epicerie",
  "cafe": "epicerie",
  "caviar": "epicerie",
  "truffe": "epicerie",
  "foie gras": "epicerie",
  // alcool
  "vins / spiritueux": "alcool",
  "spiritueux": "alcool",
  "vin": "alcool",
  // tabac
  "cigarettes": "tabac",
  "tabac": "tabac",
  // cosmétique
  "cosmétique": "cosmetique",
  "cosmétique / beauté": "cosmetique",
  "beauté": "cosmetique",
  // mode
  "vêtements": "mode",
  "mode": "mode",
  "mode / accessoires": "mode",
  // maroquinerie
  "sac": "maroquinerie",
  "montre": "maroquinerie",
  "bijoux": "maroquinerie",
  "joaillerie": "maroquinerie",
  // jeux vidéo / jouets
  "jeux vidéo": "jeuxvideo",
  "jeux vidéo / consoles": "jeuxvideo",
  "console": "jeuxvideo",
  "jouets": "jeuxvideo",
  // pharmacie
  "santé": "pharmacie",
  "médicaments": "pharmacie",
  "pharmacie": "pharmacie",
  // livres
  "livres": "livres",
  "papeterie": "livres",
  // bébé
  "bébé": "bebe",
  "bebe": "bebe",
  // parfum
  "parfum": "parfum",
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
