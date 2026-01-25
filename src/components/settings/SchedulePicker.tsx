/**
 * Schedule picker for setting station visibility times
 */

import { getDefaultSchedule } from '../../utils/schedule'
import type { Schedule } from '../../types'

interface SchedulePickerProps {
  stationId: string
  enabled: boolean
  startTime: string
  endTime: string
  days: number[]
  onEnabledChange: (enabled: boolean) => void
  onStartTimeChange: (time: string) => void
  onEndTimeChange: (time: string) => void
  onDaysChange: (days: number[]) => void
  hasExistingSchedule: boolean
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function SchedulePicker({
  stationId,
  enabled,
  startTime,
  endTime,
  days,
  onEnabledChange,
  onStartTimeChange,
  onEndTimeChange,
  onDaysChange,
  hasExistingSchedule,
}: SchedulePickerProps) {
  const handleEnableSchedule = (newEnabled: boolean) => {
    onEnabledChange(newEnabled)
    if (newEnabled && !hasExistingSchedule) {
      // Apply defaults when first enabling
      const defaults = getDefaultSchedule()
      onStartTimeChange(defaults.startTime)
      onEndTimeChange(defaults.endTime)
      onDaysChange(defaults.days)
    }
  }

  const toggleDay = (dayIndex: number) => {
    if (days.includes(dayIndex)) {
      onDaysChange(days.filter((d) => d !== dayIndex))
    } else {
      onDaysChange([...days, dayIndex].sort((a, b) => a - b))
    }
  }

  return (
    <div className="schedule-section">
      <label className="schedule-enable">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleEnableSchedule(e.target.checked)}
        />
        Only show during scheduled times
      </label>

      {enabled && (
        <div className="schedule-options">
          <div className="schedule-times">
            <div className="time-field">
              <label htmlFor={`start-${stationId}`}>From</label>
              <input
                type="time"
                id={`start-${stationId}`}
                value={startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
              />
            </div>
            <div className="time-field">
              <label htmlFor={`end-${stationId}`}>To</label>
              <input
                type="time"
                id={`end-${stationId}`}
                value={endTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
              />
            </div>
          </div>

          <div className="day-picker">
            {DAY_LABELS.map((label, index) => (
              <button
                key={index}
                type="button"
                className={`day-button ${days.includes(index) ? 'active' : ''}`}
                onClick={() => toggleDay(index)}
              >
                {label}
              </button>
            ))}
          </div>

          {days.length === 0 && (
            <span className="schedule-warning">
              No days selected - station will never be visible
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Build a Schedule object from the picker state
 */
export function buildSchedule(
  enabled: boolean,
  startTime: string,
  endTime: string,
  days: number[]
): Schedule | null {
  if (!enabled) {
    return null
  }
  return {
    enabled: true,
    startTime,
    endTime,
    days,
  }
}
