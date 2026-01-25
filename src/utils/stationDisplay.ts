/**
 * Station display utilities - shared formatting functions for UI
 */

import type { Station, StationSearchResult } from '../types'

/**
 * Format days for display
 */
export function formatDays(days: number[]): string {
  if (!days || days.length === 0) return ''
  if (days.length === 7) return 'every day'

  const weekdays = [1, 2, 3, 4, 5]
  const weekend = [0, 6]

  const isWeekdays =
    weekdays.every((d) => days.includes(d)) && !days.includes(0) && !days.includes(6)
  const isWeekend = weekend.every((d) => days.includes(d)) && days.length === 2

  if (isWeekdays) return 'Mon-Fri'
  if (isWeekend) return 'Sat-Sun'

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days
    .sort((a, b) => a - b)
    .map((d) => dayNames[d])
    .join(', ')
}

/**
 * Format modes for display - only show modes we can provide data for
 */
export function formatModes(station: StationSearchResult | Station): string {
  if (station.type === 'national-rail') {
    return 'National Rail'
  }

  // For TfL stations, filter to only TfL-operated modes
  const tflModes = ['tube', 'dlr', 'overground', 'elizabeth-line']
  const displayModes = (station.modes || [])
    .filter((mode) => tflModes.includes(mode))
    .map((mode) => {
      const names: Record<string, string> = {
        tube: 'Tube',
        dlr: 'DLR',
        overground: 'Overground',
        'elizabeth-line': 'Elizabeth Line',
      }
      return names[mode] || mode
    })

  return displayModes.join(', ') || 'TfL'
}

interface FilterSummaryOptions {
  includeSchedule?: boolean
}

/**
 * Generate filter summary for display
 * Used in both StationCard header and Settings station list
 */
export function getFilterSummary(station: Station, options: FilterSummaryOptions = {}): string | null {
  const { includeSchedule = false } = options
  const parts: string[] = []

  // Show destinations from new array format
  if (station.destinations && station.destinations.length > 0) {
    const names = station.destinations.map((d) => d.name)
    if (names.length <= 2) {
      parts.push(`to ${names.join(', ')}`)
    } else {
      parts.push(`to ${names[0]} +${names.length - 1} more`)
    }
  }
  // Legacy: show old destination filter
  else if (station.destinationFilter && station.destinationFilter.trim()) {
    parts.push(`to ${station.destinationFilter}`)
  }

  const min = station.minMinutes || 0
  if (min > 0) {
    parts.push(`>${min} min`)
  }

  // Add schedule info (only in Settings view)
  if (includeSchedule && station.schedule && station.schedule.enabled) {
    const { startTime, endTime, days } = station.schedule
    const daysStr = formatDays(days)
    parts.push(`${startTime}-${endTime} ${daysStr}`)
  }

  return parts.length > 0 ? parts.join(', ') : null
}
