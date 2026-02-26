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
  const totalMinutes = Math.floor(seconds / 60)
  if (totalMinutes <= 0) {
    return 'Due'
  }
  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}
