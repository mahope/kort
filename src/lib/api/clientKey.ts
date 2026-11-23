import type { NextRequest } from "next/server";

/**
 * Rate-limit key for a request. The site sits behind Cloudflare, which sets
 * CF-Connecting-IP. Without it we use the LAST x-forwarded-for entry (appended
 * by the trusted proxy); the first entry is client-supplied and must not decide
 * the key.
 */
export function clientKey(req: NextRequest): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").pop()?.trim();
    if (last) return last;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
