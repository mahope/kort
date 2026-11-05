/** Measure one PDF step as a User Timing entry (`pdf:<step>`), readable from devtools or a test script. */
export async function timed<T>(step: string, fn: () => T | Promise<T>): Promise<T> {
  const name = `pdf:${step}`;
  const start = typeof performance !== "undefined" ? performance.now() : 0;
  try {
    return await fn();
  } finally {
    if (typeof performance !== "undefined" && typeof performance.measure === "function") {
      performance.measure(name, { start, end: performance.now() });
    }
  }
}
