import { DepartureRow } from './DepartureRow'
import { TransportIcon } from './TransportIcon'
import { getFilterSummary } from '../utils/stationDisplay'
import type { Station, FilteredArrival } from '../types'

interface StationCardProps {
  station: Station
  departures: FilteredArrival[] | undefined
  error: string | null | undefined
  showPlatform: boolean
}

export function StationCard({ station, departures, error, showPlatform }: StationCardProps) {
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
