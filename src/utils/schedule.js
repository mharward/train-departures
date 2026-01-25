/**
 * Check if a station should be visible based on its schedule
 * @param {Object|null} schedule - The station's schedule configuration
 * @param {Date} now - Current time (default: new Date())
 * @returns {boolean} Whether the station should be visible
 */
export function isStationVisible(schedule, now = new Date()) {
  if (!schedule || !schedule.enabled) return true

  // Check day of week
  if (!schedule.days.includes(now.getDay())) return false

  // Parse and compare times (handle overnight schedules)
  const current = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = schedule.startTime.split(':').map(Number)
  const [endH, endM] = schedule.endTime.split(':').map(Number)
  const start = startH * 60 + startM
  const end = endH * 60 + endM

  if (end < start) {
    // Overnight: visible if after start OR before end
    return current >= start || current < end
  }
  return current >= start && current < end
}

/**
 * Filter stations to only those currently visible
 * @param {Array} stations - Array of station configurations
 * @param {Date} now - Current time (default: new Date())
 * @returns {Array} Filtered array of visible stations
 */
export function filterVisibleStations(stations, now = new Date()) {
  return stations.filter((s) => isStationVisible(s.schedule, now))
}

/**
 * Get default schedule configuration
 * @returns {Object} Default schedule (Mon-Fri 04:00-12:00)
 */
export function getDefaultSchedule() {
  return {
    enabled: true,
    startTime: '04:00',
    endTime: '12:00',
    days: [1, 2, 3, 4, 5], // Mon-Fri
  }
}
