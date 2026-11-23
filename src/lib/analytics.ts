import { getBrand } from "@/config/brand";

let initialized = false;

export async function enableAnalytics() {
  if (initialized || typeof window === "undefined") return;
  // Only count visits on the brand's own production domain, so local
  // development and self-hosted copies never report to our Plausible.
  const brand = getBrand();
  if (window.location.hostname !== brand.domain) return;
  initialized = true;

  const { init } = await import("@plausible-analytics/tracker");
  init({
    domain: brand.analyticsDomain,
    endpoint: "https://analytics.holstjensen.eu/api/event",
    autoCapturePageviews: true,
    outboundLinks: true,
  });
}

export async function trackEvent(
  event: string,
  props?: Record<string, string>
) {
  if (typeof window === "undefined" || !initialized) return;

  const { track } = await import("@plausible-analytics/tracker");
  track(event, { props });
}
