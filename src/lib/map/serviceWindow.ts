/**
 * Dataforsyningen moves to a new platform from 26 Nov 2026 16:00 to 30 Nov
 * 2026 08:00 (Danish time, CET). Nothing there answers in the window, so the
 * map shows a short notice over Danish views until it ends. It removes itself
 * afterwards; delete this file and ServiceWindowNotice when convenient.
 */
export const SERVICE_WINDOW = {
  start: Date.parse("2026-11-26T16:00:00+01:00"),
  end: Date.parse("2026-11-30T08:00:00+01:00"),
} as const;

export const SERVICE_WINDOW_TEXT =
  "Dataforsyningen flytter platform 26.-30. november. Nogle kortlag kan være langsomme eller mangle i perioden.";

/** localStorage key that remembers "Luk" for this window only. */
export const SERVICE_WINDOW_DISMISS_KEY = "kort:servicevindue-2026-11";

export function isInServiceWindow(now: number): boolean {
  return now >= SERVICE_WINDOW.start && now < SERVICE_WINDOW.end;
}
