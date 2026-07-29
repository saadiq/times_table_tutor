/**
 * Date helpers for attempt history. Everything is keyed in the user's local
 * timezone, not UTC, so a late-evening session lands on the day it felt like.
 */

/** Local date string (YYYY-MM-DD) from a Date object. */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Local date key from an ISO timestamp string. */
export function getDateKeyFromTimestamp(timestamp: string): string {
  return getLocalDateKey(new Date(timestamp))
}

export function isWithinDays(timestamp: string, days: number): boolean {
  const date = new Date(timestamp)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return date >= cutoff
}
