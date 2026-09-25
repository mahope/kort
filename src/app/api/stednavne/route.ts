import { NextResponse, type NextRequest } from "next/server";
import { loadStednavneIndex } from "@/lib/stednavne/loadIndex";
import {
  QUERY_MAX_LENGTH,
  QUERY_MIN_LENGTH,
  searchStednavne,
} from "@/lib/stednavne/search";
import { createRateLimiter } from "@/lib/stednavne/rateLimit";

// Place-name search over the bundled Danske Stednavne snapshot. Replaces the
// browser call to DAWA's stednavne2/autocomplete, which closes 1 Oct 2026.
export const runtime = "nodejs";

const RESULT_LIMIT = 5;
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

const NO_STORE = { "Cache-Control": "no-store" };

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < QUERY_MIN_LENGTH || q.length > QUERY_MAX_LENGTH) {
    return NextResponse.json(
      { error: `q skal være ${QUERY_MIN_LENGTH}-${QUERY_MAX_LENGTH} tegn` },
      { status: 400, headers: NO_STORE }
    );
  }

  const rate = limiter.hit(clientKey(req));
  if (!rate.ok) {
    return NextResponse.json(
      { error: "For mange forespørgsler" },
      {
        status: 429,
        headers: { ...NO_STORE, "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  try {
    const index = await loadStednavneIndex();
    const results = searchStednavne(index, q, RESULT_LIMIT);
    return NextResponse.json(results, {
      headers: {
        // The snapshot only changes on deploy, so answers are safe to cache.
        "Cache-Control":
          "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("stednavne: index unavailable", err);
    return NextResponse.json(
      { error: "Stednavnesøgning er midlertidigt utilgængelig" },
      { status: 503, headers: NO_STORE }
    );
  }
}
