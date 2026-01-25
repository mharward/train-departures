import type { Schedule, Station } from '../types'

/**
 * Check if a station should be visible based on its schedule
 */
export function isStationVisible(schedule: Schedule | null | undefined, now: Date = new Date()): boolean {
  if (!schedule || !schedule.enabled) return true

  // Check day of week
  if (!schedule.days.includes(now.getDay())) return false

  // Parse and compare times (handle overnight schedules)
  const current = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = schedule.startTime.split(':').map(Number)
  const [endH, endM] = schedule.endTime.split(':').map(Number)
  const start = (startH ?? 0) * 60 + (startM ?? 0)
  const end = (endH ?? 0) * 60 + (endM ?? 0)

  if (end < start) {
    // Overnight: visible if after start OR before end
    return current >= start || current < end
  }
  return current >= start && current < end
}

/**
 * Filter stations to only those currently visible
 */
export function filterVisibleStations(stations: Station[], now: Date = new Date()): Station[] {
  return stations.filter((s) => isStationVisible(s.schedule, now))
}

/**
 * Get default schedule configuration
 */
export function getDefaultSchedule(): Schedule {
  return {
    enabled: true,
    startTime: '04:00',
    endTime: '12:00',
    days: [1, 2, 3, 4, 5], // Mon-Fri
  }
}
