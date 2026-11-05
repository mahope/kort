/**
 * Validity window of the embedded World Magnetic Model. Kept apart from the
 * coefficients (declination.ts) so UI code can check it without loading them.
 */

export const WMM_MODEL = "WMM2025";
export const WMM_EPOCH = 2025.0;
/** NOAA/BGS publish each model for five years. */
export const WMM_VALID_UNTIL = WMM_EPOCH + 5;
/** Warn this long (years) before the model expires. */
const WMM_WARN_BEFORE = 0.5;

export type WmmStatus = "not-yet" | "ok" | "expiring" | "expired";

/** True if a decimal year lies inside the model's validity window. */
export function isWithinWmmValidity(year: number): boolean {
  return year >= WMM_EPOCH && year < WMM_VALID_UNTIL;
}

/** Decimal year (UTC) of a Date, e.g. 2026-11-05 -> 2026.84. */
export function decimalYear(date: Date): number {
  const y = date.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (date.getTime() - start) / (end - start);
}

/** "expiring" is the last {@link WMM_WARN_BEFORE} years of validity: still usable, but a new model is due. */
export function wmmStatus(date: Date = new Date()): WmmStatus {
  const year = decimalYear(date);
  if (year < WMM_EPOCH) return "not-yet";
  if (year >= WMM_VALID_UNTIL) return "expired";
  return year >= WMM_VALID_UNTIL - WMM_WARN_BEFORE ? "expiring" : "ok";
}

/** Danish user-facing note for a status, or null when nothing needs saying. */
export function wmmStatusNote(status: WmmStatus): string | null {
  switch (status) {
    case "expiring":
      return `${WMM_MODEL} udløber ${WMM_VALID_UNTIL}. Misvisningen bliver mindre præcis.`;
    case "expired":
    case "not-yet":
      return `${WMM_MODEL} er ikke gyldig i dag, så misvisningen vises ikke.`;
    default:
      return null;
  }
}
