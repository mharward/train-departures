/**
 * Time-related utilities for train departures
 */

/**
 * Convert time string (HH:MM) to seconds from now
 */
export function timeToSeconds(timeStr: string | null | undefined): number {
  if (!timeStr) return Infinity

  const now = new Date()
  const parts = timeStr.split(':').map(Number)
  const hours = parts[0] ?? 0
  const minutes = parts[1] ?? 0

  const target = new Date()
  target.setHours(hours, minutes, 0, 0)

  // If the time is earlier than now, assume it's tomorrow
  if (target < now) {
    target.setDate(target.getDate() + 1)
  }

  return Math.floor((target.getTime() - now.getTime()) / 1000)
}

/**
 * Format seconds to human-readable minutes
 */
export function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes <= 0) {
    return 'Due'
  }
  return `${minutes} min`
}
