import { DepartureRow } from './DepartureRow'
import { TransportIcon } from './TransportIcon'

// Generate filter summary for the header
function getFilterSummary(station) {
  const parts = []

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

  return parts.length > 0 ? parts.join(', ') : null
}

export function StationCard({ station, departures, error, showPlatform }) {
  const hasDepartures = departures && departures.length > 0
  const filterSummary = getFilterSummary(station)

  return (
    <div className="station-card">
      <div className="station-header">
        <TransportIcon type={station.type} size={24} />
        <h2 className="station-name" title={station.name}>
          {station.name}
        </h2>
        {filterSummary && (
          <span className="filter-summary" title={filterSummary}>
            {filterSummary}
          </span>
        )}
      </div>

      <div className="departures-list">
        {error && <div className="error-message">Unable to load departures</div>}

        {!error && !hasDepartures && <div className="no-departures">No upcoming departures</div>}

        {hasDepartures &&
          departures
            .slice(0, 8)
            .map((departure, index) => (
              <DepartureRow
                key={departure.id || `${departure.destinationName}-${index}`}
                departure={departure}
                showPlatform={showPlatform}
              />
            ))}
      </div>
    </div>
  )
}
