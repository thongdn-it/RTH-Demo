import "server-only";

/**
 * Reading the clock is a side effect, so it does not belong in a component
 * body. Awaiting it keeps "now" a per-request value the render merely consumes.
 */
export async function requestTime(): Promise<number> {
  return Date.now();
}
