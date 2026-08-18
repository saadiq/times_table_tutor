/** Format a response time for display: 850ms, 6.0s. Medians can be fractional — round. */
export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
