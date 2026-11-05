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

/** Let the browser handle input and paint before the next heavy step, so one step never stacks onto another in the same task. */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (typeof scheduler?.yield === "function") return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}
