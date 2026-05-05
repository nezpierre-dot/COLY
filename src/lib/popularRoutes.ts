// Popular city pairs targeted for SEO landing pages.
// Format: [from, to] — slug = `${from}-${to}` lowercased.
export const POPULAR_ROUTES: Array<[string, string]> = [
  ["Paris", "Dakar"],
  ["Paris", "Abidjan"],
  ["Paris", "Alger"],
  ["Paris", "Casablanca"],
  ["Paris", "Tunis"],
  ["Paris", "Bamako"],
  ["Paris", "Yaoundé"],
  ["Paris", "Douala"],
  ["Paris", "Brazzaville"],
  ["Paris", "Kinshasa"],
  ["Paris", "Lomé"],
  ["Paris", "Cotonou"],
  ["Paris", "Conakry"],
  ["Paris", "Ouagadougou"],
  ["Paris", "Niamey"],
  ["Paris", "Libreville"],
  ["Paris", "Antananarivo"],
  ["Paris", "Pointe-Noire"],
  ["Lyon", "Alger"],
  ["Lyon", "Tunis"],
  ["Lyon", "Casablanca"],
  ["Lyon", "Dakar"],
  ["Marseille", "Alger"],
  ["Marseille", "Tunis"],
  ["Marseille", "Casablanca"],
  ["Marseille", "Oran"],
  ["Toulouse", "Alger"],
  ["Toulouse", "Casablanca"],
  ["Bordeaux", "Dakar"],
  ["Bordeaux", "Casablanca"],
  ["Nice", "Tunis"],
  ["Nice", "Alger"],
  ["Bruxelles", "Casablanca"],
  ["Bruxelles", "Kinshasa"],
  ["Genève", "Tunis"],
  ["Genève", "Casablanca"],
  ["Montréal", "Paris"],
  ["Montréal", "Casablanca"],
  ["Montréal", "Alger"],
  ["Londres", "Casablanca"],
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function routeSlug(from: string, to: string): string {
  return `${slugify(from)}_${slugify(to)}`;
}

export function parseRouteSlug(slug: string): { from: string; to: string } | null {
  const [a, b] = slug.split("_");
  if (!a || !b) return null;
  const cap = (s: string) =>
    s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-");
  return { from: cap(a), to: cap(b) };
}

