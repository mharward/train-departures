/**
 * Edit form for configuring a station's filters and schedule
 */

import { useState, FormEvent } from 'react'
import { TransportIcon } from '../TransportIcon'
import { DestinationPicker } from './DestinationPicker'
import { SchedulePicker, buildSchedule } from './SchedulePicker'
import type { Station, Destination } from '../../types'

interface StationEditFormProps {
  station: Station
  onSave: (updates: Partial<Station>) => void
  onCancel: () => void
}

export function StationEditForm({ station, onSave, onCancel }: StationEditFormProps) {
  const [minMinutes, setMinMinutes] = useState(station.minMinutes || 0)
  const [destinations, setDestinations] = useState<Destination[]>(station.destinations || [])

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(station.schedule?.enabled || false)
  const [startTime, setStartTime] = useState(station.schedule?.startTime || '04:00')
  const [endTime, setEndTime] = useState(station.schedule?.endTime || '12:00')
  const [days, setDays] = useState<number[]>(station.schedule?.days || [1, 2, 3, 4, 5])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const updates: Partial<Station> = {
      minMinutes: minMinutes || 0,
      destinations,
      destinationFilter: '', // Clear legacy field when saving
      schedule: buildSchedule(scheduleEnabled, startTime, endTime, days),
    }
    onSave(updates)
  }

  return (
    <form className="station-edit-form" onSubmit={handleSubmit}>
      <div className="edit-form-header">
        <TransportIcon type={station.type} size={20} />
        <span className="edit-form-station-name" title={station.name}>
          {station.name}
        </span>
      </div>

      <DestinationPicker
        stationType={station.type}
        destinations={destinations}
        onChange={setDestinations}
      />

      <div className="edit-field">
        <label htmlFor={`min-${station.id}`}>Walk time (minutes)</label>
        <input
          type="number"
          id={`min-${station.id}`}
          min="0"
          max="60"
          value={minMinutes}
          onChange={(e) => setMinMinutes(parseInt(e.target.value, 10) || 0)}
        />
        <span className="field-hint">Hide departures sooner than this</span>
      </div>

      <SchedulePicker
        stationId={station.id}
        enabled={scheduleEnabled}
        startTime={startTime}
        endTime={endTime}
        days={days}
        onEnabledChange={setScheduleEnabled}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
        onDaysChange={setDays}
        hasExistingSchedule={!!station.schedule}
      />

      <div className="edit-actions">
        <button type="submit" className="save-button">
          Save
        </button>
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
