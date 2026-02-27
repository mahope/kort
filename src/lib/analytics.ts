let initialized = false;

export async function enableAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const { init } = await import("@plausible-analytics/tracker");
  init({
    domain: "kort.mahoje.dk",
    endpoint: "https://analytics.holstjensen.eu/api/event",
    autoCapturePageviews: true,
    outboundLinks: true,
  });
}

export async function trackEvent(
  event: string,
  props?: Record<string, string>
) {
  if (typeof window === "undefined") return;

  const { track } = await import("@plausible-analytics/tracker");
  track(event, { props });
}
