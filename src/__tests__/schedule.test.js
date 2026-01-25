import { describe, it, expect } from 'vitest'
import { isStationVisible, filterVisibleStations, getDefaultSchedule } from '../utils/schedule'

describe('isStationVisible', () => {
  describe('when schedule is disabled or null', () => {
    it('returns true when schedule is null', () => {
      expect(isStationVisible(null)).toBe(true)
    })

    it('returns true when schedule is undefined', () => {
      expect(isStationVisible(undefined)).toBe(true)
    })

    it('returns true when schedule.enabled is false', () => {
      const schedule = {
        enabled: false,
        startTime: '09:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5],
      }
      expect(isStationVisible(schedule)).toBe(true)
    })
  })

  describe('day of week filtering', () => {
    it('returns false when current day is not in schedule', () => {
      // Monday = 1
      const monday = new Date(2024, 0, 15, 10, 0, 0) // Monday
      const schedule = {
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        days: [2, 3, 4, 5], // Tue-Fri only
      }
      expect(isStationVisible(schedule, monday)).toBe(false)
    })

    it('returns true when current day is in schedule', () => {
      const monday = new Date(2024, 0, 15, 10, 0, 0) // Monday
      const schedule = {
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        days: [1, 2, 3, 4, 5], // Mon-Fri
      }
      expect(isStationVisible(schedule, monday)).toBe(true)
    })

    it('handles Sunday (day 0)', () => {
      const sunday = new Date(2024, 0, 14, 10, 0, 0) // Sunday
      const schedule = {
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        days: [0, 6], // Weekends
      }
      expect(isStationVisible(schedule, sunday)).toBe(true)
    })

    it('handles Saturday (day 6)', () => {
      const saturday = new Date(2024, 0, 13, 10, 0, 0) // Saturday
      const schedule = {
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        days: [0, 6], // Weekends
      }
      expect(isStationVisible(schedule, saturday)).toBe(true)
    })
  })

  describe('time range filtering (normal schedule)', () => {
    const schedule = {
      enabled: true,
      startTime: '09:00',
      endTime: '17:00',
      days: [0, 1, 2, 3, 4, 5, 6], // All days
    }

    it('returns false before start time', () => {
      const time = new Date(2024, 0, 15, 8, 59, 0)
      expect(isStationVisible(schedule, time)).toBe(false)
    })

    it('returns true at exactly start time', () => {
      const time = new Date(2024, 0, 15, 9, 0, 0)
      expect(isStationVisible(schedule, time)).toBe(true)
    })

    it('returns true during schedule time', () => {
      const time = new Date(2024, 0, 15, 12, 0, 0)
      expect(isStationVisible(schedule, time)).toBe(true)
    })

    it('returns false at exactly end time', () => {
      const time = new Date(2024, 0, 15, 17, 0, 0)
      expect(isStationVisible(schedule, time)).toBe(false)
    })

    it('returns false after end time', () => {
      const time = new Date(2024, 0, 15, 17, 1, 0)
      expect(isStationVisible(schedule, time)).toBe(false)
    })
  })

  describe('overnight schedule (end < start)', () => {
    const overnightSchedule = {
      enabled: true,
      startTime: '22:00',
      endTime: '06:00',
      days: [0, 1, 2, 3, 4, 5, 6],
    }

    it('returns true after start time (evening)', () => {
      const time = new Date(2024, 0, 15, 23, 0, 0)
      expect(isStationVisible(overnightSchedule, time)).toBe(true)
    })

    it('returns true at exactly start time', () => {
      const time = new Date(2024, 0, 15, 22, 0, 0)
      expect(isStationVisible(overnightSchedule, time)).toBe(true)
    })

    it('returns true before end time (morning)', () => {
      const time = new Date(2024, 0, 15, 5, 0, 0)
      expect(isStationVisible(overnightSchedule, time)).toBe(true)
    })

    it('returns false at exactly end time', () => {
      const time = new Date(2024, 0, 15, 6, 0, 0)
      expect(isStationVisible(overnightSchedule, time)).toBe(false)
    })

    it('returns false during the day (between end and start)', () => {
      const time = new Date(2024, 0, 15, 12, 0, 0)
      expect(isStationVisible(overnightSchedule, time)).toBe(false)
    })

    it('returns true at midnight', () => {
      const time = new Date(2024, 0, 15, 0, 0, 0)
      expect(isStationVisible(overnightSchedule, time)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles schedule spanning midnight exactly', () => {
      const schedule = {
        enabled: true,
        startTime: '23:00',
        endTime: '01:00',
        days: [0, 1, 2, 3, 4, 5, 6],
      }
      const midnight = new Date(2024, 0, 15, 0, 0, 0)
      expect(isStationVisible(schedule, midnight)).toBe(true)
    })

    it('handles schedule starting at midnight', () => {
      const schedule = {
        enabled: true,
        startTime: '00:00',
        endTime: '06:00',
        days: [0, 1, 2, 3, 4, 5, 6],
      }
      const midnight = new Date(2024, 0, 15, 0, 0, 0)
      expect(isStationVisible(schedule, midnight)).toBe(true)
    })

    it('handles schedule ending at midnight', () => {
      const schedule = {
        enabled: true,
        startTime: '18:00',
        endTime: '00:00',
        days: [0, 1, 2, 3, 4, 5, 6],
      }
      // end < start, so this is an overnight schedule
      // 23:00 should be visible (after start)
      const evening = new Date(2024, 0, 15, 23, 0, 0)
      expect(isStationVisible(schedule, evening)).toBe(true)
    })
  })
})

describe('filterVisibleStations', () => {
  const schedule = {
    enabled: true,
    startTime: '09:00',
    endTime: '17:00',
    days: [1, 2, 3, 4, 5], // Mon-Fri
  }

  it('returns empty array for empty input', () => {
    expect(filterVisibleStations([])).toEqual([])
  })

  it('filters stations based on schedule', () => {
    const monday10am = new Date(2024, 0, 15, 10, 0, 0) // Monday
    const stations = [
      { id: 'visible', name: 'Visible', schedule },
      { id: 'no-schedule', name: 'No Schedule' },
    ]
    const result = filterVisibleStations(stations, monday10am)
    expect(result).toHaveLength(2)
  })

  it('excludes stations outside schedule', () => {
    const sunday = new Date(2024, 0, 14, 10, 0, 0) // Sunday
    const stations = [{ id: 'hidden', name: 'Hidden', schedule }]
    const result = filterVisibleStations(stations, sunday)
    expect(result).toHaveLength(0)
  })
})

describe('getDefaultSchedule', () => {
  it('returns enabled schedule', () => {
    const schedule = getDefaultSchedule()
    expect(schedule.enabled).toBe(true)
  })

  it('returns weekday schedule (Mon-Fri)', () => {
    const schedule = getDefaultSchedule()
    expect(schedule.days).toEqual([1, 2, 3, 4, 5])
  })

  it('returns morning commute times', () => {
    const schedule = getDefaultSchedule()
    expect(schedule.startTime).toBe('04:00')
    expect(schedule.endTime).toBe('12:00')
  })
})
