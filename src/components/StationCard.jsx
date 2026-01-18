import { DepartureRow } from './DepartureRow'

// Generate filter summary for the header
function getFilterSummary(station) {
  const parts = []

  if (station.destinationFilter && station.destinationFilter.trim()) {
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
        <div className="station-title">
          <h2 className="station-name">{station.name}</h2>
          {filterSummary && (
            <span className="filter-summary">{filterSummary}</span>
          )}
        </div>
      </div>

      <div className="departures-list">
        {error && (
          <div className="error-message">
            Unable to load departures
          </div>
        )}

        {!error && !hasDepartures && (
          <div className="no-departures">
            No upcoming departures
          </div>
        )}

        {hasDepartures &&
          departures.slice(0, 8).map((departure, index) => (
            <DepartureRow
              key={`${departure.vehicleId || departure.id || index}-${departure.timeToStation}`}
              departure={departure}
              showPlatform={showPlatform}
            />
          ))}
      </div>
    </div>
  )
}
