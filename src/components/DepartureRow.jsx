import { LineIndicator } from './LineIndicator'
import { formatMinutes } from '../utils/api'

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function DepartureRow({ departure, showPlatform }) {
  const minutes = formatMinutes(departure.timeToStation)
  const isDue = minutes === 'Due'

  return (
    <div className={`departure-row ${isDue ? 'due' : ''}`}>
      <div className="departure-time">
        <span className="minutes">{minutes}</span>
        <span className="departure-time-absolute">{formatTime(departure.expectedDeparture)}</span>
      </div>

      <div className="departure-info">
        <div className="departure-destination">
          {departure.destinationName || departure.towards || 'Unknown'}
        </div>
        <div className="departure-line">
          <LineIndicator
            lineId={departure.lineId}
            lineName={departure.lineName}
            modeName={departure.modeName}
          />
        </div>
      </div>

      {showPlatform && departure.platformName && (
        <div className="departure-platform">
          <span className="platform-label">Platform</span>
          <span className="platform-number">{departure.platformName}</span>
        </div>
      )}
    </div>
  )
}
