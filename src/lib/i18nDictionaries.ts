/**
 * Re-export of the existing translation dictionaries.
 * Kept as a separate module so `src/i18n/config.ts` can import them
 * without creating a circular import with the legacy `getT/translate` helpers.
 */
export { dictionaries } from "@/lib/i18n";
