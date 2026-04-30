#!/usr/bin/env node
/**
 * check-tutoiement.mjs
 *
 * Vérifie qu'aucune chaîne user-facing en français n'utilise le vouvoiement.
 * Couvre :
 *   1. Le bloc FR de src/lib/i18n.ts (lignes ~10..1695, détectées dynamiquement)
 *   2. Les chaînes hardcodées (JSX/TSX) hors :
 *        - src/lib/i18n.ts
 *        - src/integrations/**
 *        - src/features/admin/**   (les pages admin gardent le vocabulaire technique)
 *
 * Règle métier (mem://style/user-facing-wording) :
 *   - User-facing : tutoiement obligatoire ("Tu", "Toi", "Ton/Ta/Tes")
 *   - Voyageur : "Voyageur Nidit" (jamais "Transporteur")
 *   - Demandeur : "Membre" / "Client" / tutoiement (jamais "Expéditeur" / "Demandeur")
 *
 * Usage :
 *   node scripts/check-tutoiement.mjs            # exit 1 si vouvoiement détecté
 *   node scripts/check-tutoiement.mjs --fix-list # liste les violations sans exit code
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Mots/formes interdits en user-facing FR.
const VOUVOIEMENT_PATTERNS = [
  /\bVous\b/,
  /\bvous\b/,
  /\bVotre\b/,
  /\bvotre\b/,
  /\bVos\b/,
  /\bvos\b/,
  /\bVeuillez\b/,
  /\bveuillez\b/,
  /\bVOUS\b/,
  /\bVOTRE\b/,
  /\bVOS\b/,
  /\bVEUILLEZ\b/,
];

// Termes interdits (legal/marketing).
const FORBIDDEN_TERMS = [
  { re: /\bTransporteur(s)?\b/, msg: '"Transporteur" interdit → utilise "Voyageur Nidit"' },
  { re: /\bExpéditeur(s)?\b/, msg: '"Expéditeur" interdit → utilise "Membre" / "Client" / tutoiement' },
];

// Exceptions (faux-positifs courants).
const ALLOWED_LITERALS = [
  /Rendez-vous/i, // nom commun
];

const violations = [];

// ---- 1) Bloc FR de i18n.ts -------------------------------------------------
function checkI18n() {
  const file = path.join(ROOT, "src/lib/i18n.ts");
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split("\n");

  // Détecte début/fin du bloc FR
  let frStart = -1, frEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (frStart === -1 && /^const fr\s*:/.test(lines[i])) frStart = i + 1;
    else if (frStart !== -1 && /^};?\s*$/.test(lines[i])) { frEnd = i; break; }
  }
  if (frStart === -1) return;

  const lineRe = /^\s*"([^"]+)"\s*:\s*"(.*)"\s*,?\s*$/;
  for (let i = frStart; i < frEnd; i++) {
    const m = lines[i].match(lineRe);
    if (!m) continue;
    const [, , value] = m;
    if (ALLOWED_LITERALS.some((re) => re.test(value))) continue;
    for (const re of VOUVOIEMENT_PATTERNS) {
      if (re.test(value)) {
        violations.push({ file: "src/lib/i18n.ts", line: i + 1, value, reason: `vouvoiement (${re})` });
        break;
      }
    }
    for (const { re, msg } of FORBIDDEN_TERMS) {
      if (re.test(value)) {
        violations.push({ file: "src/lib/i18n.ts", line: i + 1, value, reason: msg });
      }
    }
  }
}

// ---- 2) JSX/TSX hardcoded strings -----------------------------------------
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "supabase"]);
const SKIP_PATHS = [
  "src/integrations/",
  "src/features/admin/",
  "src/lib/i18n.ts",
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function checkComponents() {
  const srcDir = path.join(ROOT, "src");
  if (!fs.existsSync(srcDir)) return;
  const files = walk(srcDir).filter(
    (f) => !SKIP_PATHS.some((skip) => f.replace(ROOT + "/", "").startsWith(skip)),
  );
  for (const file of files) {
    const rel = file.replace(ROOT + "/", "");
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      // Ignore lignes de commentaire pur
      const trimmed = ln.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
      if (ALLOWED_LITERALS.some((re) => re.test(ln))) continue;
      for (const re of VOUVOIEMENT_PATTERNS) {
        if (re.test(ln)) {
          violations.push({ file: rel, line: i + 1, value: ln.trim().slice(0, 140), reason: `vouvoiement (${re})` });
          break;
        }
      }
      for (const { re, msg } of FORBIDDEN_TERMS) {
        if (re.test(ln)) {
          violations.push({ file: rel, line: i + 1, value: ln.trim().slice(0, 140), reason: msg });
        }
      }
    }
  }
}

checkI18n();
checkComponents();

if (violations.length === 0) {
  console.log("✅ Tutoiement OK — aucune violation détectée.");
  process.exit(0);
}

console.log(`❌ ${violations.length} violation(s) détectée(s) :\n`);
for (const v of violations) {
  console.log(`  ${v.file}:${v.line}  [${v.reason}]\n    ${v.value}`);
}
console.log(`\n→ Corrige les chaînes ci-dessus pour utiliser le tutoiement.`);
console.log(`  Voir mem://style/user-facing-wording pour la règle.`);

const fixListMode = process.argv.includes("--fix-list");
process.exit(fixListMode ? 0 : 1);
