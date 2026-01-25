import { useState, useEffect } from 'react'
import { StationCard } from './StationCard'
import type { Station, DeparturesMap, ErrorsMap } from '../types'

interface DashboardProps {
  stations: Station[]
  departures: DeparturesMap
  errors: ErrorsMap
  loading: boolean
  lastUpdated: Date | null
  countdown: number
  autoRefresh: boolean
  showPlatform: boolean
  onRefresh: () => void
  onOpenSettings: () => void
}

export function Dashboard({
  stations,
  departures,
  errors,
  loading,
  lastUpdated,
  countdown,
  autoRefresh,
  showPlatform,
  onRefresh,
  onOpenSettings,
}: DashboardProps) {
  const [elapsed, setElapsed] = useState(0)

  // Update elapsed time every second
  useEffect(() => {
    if (!lastUpdated) return

    const updateElapsed = () => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
      setElapsed(seconds)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  const formatElapsed = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  const formatTime = (date: Date | null): string => {
    if (!date) return ''
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Train Departures</h1>
        <div className="header-controls">
          <div className="refresh-info">
            <span className="current-time">{formatTime(lastUpdated)}</span>
            {loading ? (
              <span className="update-status">Updating...</span>
            ) : (
              <span className="update-status">
                {formatElapsed(elapsed)}
                {autoRefresh && ` · next in ${countdown}s`}
              </span>
            )}
            <button className="refresh-button" onClick={onRefresh} disabled={loading}>
              Refresh
            </button>
          </div>
          <button className="settings-button" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {stations.length === 0 ? (
          <div className="empty-state">
            <p>No stations configured.</p>
            <button className="add-station-cta" onClick={onOpenSettings}>
              Add a Station
            </button>
          </div>
        ) : (
          <div className="stations-grid">
            {stations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                departures={departures[station.id]}
                error={errors[station.id]}
                showPlatform={showPlatform}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
