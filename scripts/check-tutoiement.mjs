#!/usr/bin/env node
/**
 * check-tutoiement.mjs
 *
 * Vérifie qu'aucune chaîne user-facing en français n'utilise le vouvoiement
 * et signale les expressions ambiguës en mode "warning" (non bloquant sauf --strict).
 *
 * Couvre :
 *   1. Le bloc FR de src/lib/i18n.ts (détection dynamique)
 *   2. Les chaînes hardcodées (JSX/TSX) hors src/integrations, src/features/admin, i18n.ts
 *
 * Catégories :
 *   - HARD       : violations bloquantes (Vous/Votre/Vos/Veuillez/Transporteur/Expéditeur)
 *   - AMBIGUOUS  : warnings contextuels (ton/ta/t'a/tu as suivi d'article suspect, etc.)
 *
 * Système d'exceptions :
 *   - scripts/tutoiement-exceptions.json
 *   - { approved: { "path/to/file.tsx": { "42": "snippet" } }, approvedPatterns: [...] }
 *
 * Usage :
 *   node scripts/check-tutoiement.mjs                  # exit 1 sur HARD ou ambigu non approuvé
 *   node scripts/check-tutoiement.mjs --warn-ambiguous # n'échoue que sur HARD
 *   node scripts/check-tutoiement.mjs --strict         # échoue aussi sur ambigus
 *   node scripts/check-tutoiement.mjs --list-ambiguous # affiche uniquement les ambigus
 *   node scripts/check-tutoiement.mjs --approve src/foo.tsx:42  # ajoute aux exceptions
 *   node scripts/check-tutoiement.mjs --fix-list       # liste sans exit code
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXCEPTIONS_FILE = path.join(__dirname, "tutoiement-exceptions.json");

// ---- Exceptions approuvées -------------------------------------------------
function loadExceptions() {
  if (!fs.existsSync(EXCEPTIONS_FILE)) {
    return { approved: {}, approvedPatterns: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(EXCEPTIONS_FILE, "utf8"));
  } catch {
    return { approved: {}, approvedPatterns: [] };
  }
}
function saveExceptions(data) {
  fs.writeFileSync(
    EXCEPTIONS_FILE,
    JSON.stringify(data, null, 2) + "\n",
    "utf8",
  );
}
const exceptions = loadExceptions();
const approvedPatternRes = (exceptions.approvedPatterns || []).map(
  (p) => new RegExp(p, "i"),
);

function isApproved(file, line, value) {
  const fileEntry = exceptions.approved?.[file];
  if (fileEntry && (fileEntry[line] || fileEntry[String(line)])) return true;
  if (approvedPatternRes.some((re) => re.test(value))) return true;
  return false;
}

/**
 * Pré-nettoie une ligne avant matching pour neutraliser les faux-positifs
 * lexicaux (mots composés contenant "vous" comme "rendez-vous", "au-dessous").
 */
function neutralize(text) {
  return text
    .replace(/\brendez-vous\b/gi, "RDV")
    .replace(/\brendezvous\b/gi, "RDV")
    .replace(/\bau-dessous\b/gi, "DESSOUS")
    .replace(/\bau-dessus\b/gi, "DESSUS")
    .replace(/\bvous-même\b/gi, "SOIMEME");
}

// ---- Patterns HARD (violations bloquantes) ---------------------------------
const HARD_VOUVOIEMENT = [
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

const FORBIDDEN_TERMS = [
  { re: /\bTransporteur(s)?\b/, msg: '"Transporteur" interdit → utilise "Voyageur Nidit"' },
  { re: /\bExpéditeur(s)?\b/, msg: '"Expéditeur" interdit → utilise "Membre" / "Client" / tutoiement' },
];

// ---- Patterns AMBIGUS (warnings contextuels) -------------------------------
// "ton/ta" : adjectif possessif OK, mais peut être confondu avec "le ton" (musical),
// "ta" (interjection). On flag uniquement si suivi d'un mot suspect.
// "t'a / tu as" : risque de confusion grammaticale (élision/contraction).
// Article défini après "tu" : "tu le/la/les" peut être correct, mais "tu vous"
// indique un mélange.
const AMBIGUOUS_PATTERNS = [
  {
    name: "tu+vouvoiement-mix",
    re: /\b[Tt]u\s+(vous|votre|vos)\b/,
    msg: "Mélange tutoiement/vouvoiement détecté",
  },
  {
    name: "ton-isolated",
    // "ton" suivi d'un mot abstrait courant pouvant être ambigu (musique, voix...)
    re: /\bton\s+(ton|timbre|registre)\b/i,
    msg: '"ton" ambigu (possessif vs nom commun "le ton")',
  },
  {
    name: "ta-interjection",
    // "ta" en début de phrase ou isolé sans nom commun derrière
    re: /(^|[.!?]\s+)[Tt]a\s+[A-ZÉÈ]/,
    msg: '"Ta" en début de phrase : vérifier que c\'est bien le possessif',
  },
  {
    name: "ta-elision-missing",
    // "ta" devant voyelle → devrait être "ton" (ta amie → ton amie ; ta erreur → ton erreur)
    re: /\bta\s+(a|e|i|o|u|h|é|è|ê|à|â|î|ô|û)[a-zà-ÿ]/i,
    msg: '"ta" devant voyelle : utiliser "ton" (élision possessive)',
  },
  {
    name: "ta-confusion",
    // "t'a" vs "ta" — détecter "t'a" (contraction "te a") qui peut être une erreur
    re: /\bt'a\s+(été|dit|donné|envoyé|proposé|contacté)/i,
    msg: '"t\'a" : vérifier l\'orthographe (contraction "te a")',
  },
  {
    name: "tu-as-vs-ta",
    // "tu as" suivi d'un nom sans verbe → souvent devrait être "ta/ton"
    re: /\btu\s+as\s+(colis|message|notification|demande|voyage|paiement)\b/i,
    msg: '"tu as <nom>" : vérifier si "ton/ta <nom>" ne serait pas plus naturel',
  },
  {
    name: "tu-no-verb",
    // "tu" suivi directement d'un article défini sans verbe → suspect
    re: /\b[Tt]u\s+(le|la|les|un|une|des)\s+[a-zé]/,
    msg: '"tu <article>" sans verbe : structure suspecte',
  },
];

const ALLOWED_KEYS = new Set([
  "glossary.demandeur.short",
  "glossary.voyageur.short",
  "glossary.escrow.short",
  "glossary.kyc.short",
]);

const hardViolations = [];
const ambiguousViolations = [];

function pushViolation(list, v) {
  if (isApproved(v.file, v.line, v.value)) return;
  list.push(v);
}

// ---- 1) Bloc FR de i18n.ts -------------------------------------------------
function checkI18n() {
  const file = path.join(ROOT, "src/lib/i18n.ts");
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split("\n");

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
    const [, key, value] = m;
    if (ALLOWED_KEYS.has(key)) continue;

    const cleaned = neutralize(value);
    for (const re of HARD_VOUVOIEMENT) {
      if (re.test(cleaned)) {
        pushViolation(hardViolations, {
          file: "src/lib/i18n.ts", line: i + 1, value,
          reason: `vouvoiement (${re})`, key,
        });
        break;
      }
    }
    for (const { re, msg } of FORBIDDEN_TERMS) {
      if (re.test(cleaned)) {
        pushViolation(hardViolations, {
          file: "src/lib/i18n.ts", line: i + 1, value, reason: msg, key,
        });
      }
    }
    for (const { re, msg, name } of AMBIGUOUS_PATTERNS) {
      if (re.test(cleaned)) {
        pushViolation(ambiguousViolations, {
          file: "src/lib/i18n.ts", line: i + 1, value,
          reason: `[${name}] ${msg}`, key,
        });
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
      const trimmed = ln.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

      const snippet = trimmed.slice(0, 160);

      const cleaned = neutralize(ln);
      for (const re of HARD_VOUVOIEMENT) {
        if (re.test(cleaned)) {
          pushViolation(hardViolations, {
            file: rel, line: i + 1, value: snippet, reason: `vouvoiement (${re})`,
          });
          break;
        }
      }
      for (const { re, msg } of FORBIDDEN_TERMS) {
        if (re.test(cleaned)) {
          pushViolation(hardViolations, {
            file: rel, line: i + 1, value: snippet, reason: msg,
          });
        }
      }
      for (const { re, msg, name } of AMBIGUOUS_PATTERNS) {
        if (re.test(cleaned)) {
          pushViolation(ambiguousViolations, {
            file: rel, line: i + 1, value: snippet, reason: `[${name}] ${msg}`,
          });
        }
      }
    }
  }
}

// ---- CLI flags -------------------------------------------------------------
const args = process.argv.slice(2);
const flagFixList = args.includes("--fix-list");
const flagWarnOnly = args.includes("--warn-ambiguous");
const flagStrict = args.includes("--strict");
const flagListAmb = args.includes("--list-ambiguous");
const approveArg = args.find((a) => a.startsWith("--approve"));

// ---- Mode: approve une exception -------------------------------------------
if (approveArg) {
  // formats: --approve=src/foo.tsx:42  OR  --approve src/foo.tsx:42
  let target = approveArg.includes("=")
    ? approveArg.split("=")[1]
    : args[args.indexOf(approveArg) + 1];
  if (!target || !target.includes(":")) {
    console.error("Usage: --approve <file>:<line>");
    process.exit(2);
  }
  const [file, lineStr] = target.split(":");
  const line = parseInt(lineStr, 10);
  if (!fs.existsSync(path.join(ROOT, file))) {
    console.error(`File not found: ${file}`);
    process.exit(2);
  }
  const snippet = fs.readFileSync(path.join(ROOT, file), "utf8")
    .split("\n")[line - 1]?.trim().slice(0, 160) ?? "";
  exceptions.approved ||= {};
  exceptions.approved[file] ||= {};
  exceptions.approved[file][line] = snippet;
  saveExceptions(exceptions);
  console.log(`✅ Exception approuvée : ${file}:${line}\n   ${snippet}`);
  process.exit(0);
}

// ---- Run checks ------------------------------------------------------------
checkI18n();
checkComponents();

// ---- Mode: --list-ambiguous (affiche seulement les warnings) ---------------
if (flagListAmb) {
  if (ambiguousViolations.length === 0) {
    console.log("✅ Aucune expression ambiguë détectée.");
    process.exit(0);
  }
  console.log(`⚠️  ${ambiguousViolations.length} expression(s) ambiguë(s) :\n`);
  for (const v of ambiguousViolations) {
    console.log(`  ${v.file}:${v.line}  ${v.reason}\n    ${v.value}`);
  }
  console.log(`\n→ Pour approuver : node scripts/check-tutoiement.mjs --approve <file>:<line>`);
  process.exit(0);
}

// ---- Reporting standard ----------------------------------------------------
const totalHard = hardViolations.length;
const totalAmb = ambiguousViolations.length;

if (totalHard === 0 && totalAmb === 0) {
  console.log("✅ Tutoiement OK — aucune violation ni ambiguïté détectée.");
  process.exit(0);
}

if (totalHard > 0) {
  console.log(`❌ ${totalHard} violation(s) bloquante(s) :\n`);
  for (const v of hardViolations) {
    console.log(`  ${v.file}:${v.line}  [${v.reason}]\n    ${v.value}`);
  }
}

if (totalAmb > 0) {
  console.log(`\n⚠️  ${totalAmb} expression(s) ambiguë(s) (warning) :\n`);
  for (const v of ambiguousViolations) {
    console.log(`  ${v.file}:${v.line}  ${v.reason}\n    ${v.value}`);
  }
  console.log(`\n→ Approuver une ambiguïté légitime :`);
  console.log(`  node scripts/check-tutoiement.mjs --approve <file>:<line>`);
}

console.log(`\n→ Règle : mem://style/user-facing-wording`);

if (flagFixList) process.exit(0);
if (totalHard > 0) process.exit(1);
if (flagStrict && totalAmb > 0) process.exit(1);
process.exit(0);
