/**
 * Destination picker for filtering trains by destination
 */

import { useState, useEffect } from 'react'
import { searchStations } from '../../utils/api'
import { TransportIcon } from '../TransportIcon'
import type { Destination, StationSearchResult, Station } from '../../types'

interface DestinationPickerProps {
  stationType: Station['type']
  destinations: Destination[]
  onChange: (destinations: Destination[]) => void
}

export function DestinationPicker({ stationType, destinations, onChange }: DestinationPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StationSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const searchResults = await searchStations(query)
        setResults(searchResults)
      } catch (error) {
        console.error('Destination search error:', error)
        setResults([])
      }
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const addDestination = (result: StationSearchResult) => {
    if (destinations.some((d) => d.id === result.id)) {
      return
    }
    onChange([
      ...destinations,
      {
        id: result.id,
        name: result.name,
        crs: result.crs || null,
      },
    ])
    setQuery('')
    setResults([])
  }

  const removeDestination = (destId: string) => {
    onChange(destinations.filter((d) => d.id !== destId))
  }

  return (
    <div className="edit-field destination-picker">
      <label>Filter by destination (optional)</label>

      {/* Selected destinations */}
      {destinations.length > 0 ? (
        <div className="destination-chips">
          {destinations.map((dest) => (
            <span key={dest.id} className="destination-chip">
              {dest.name}
              <button
                type="button"
                className="chip-remove"
                onClick={() => removeDestination(dest.id)}
                aria-label={`Remove ${dest.name}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="destination-empty">Any destination</div>
      )}

      {/* Destination search */}
      <div className="destination-search">
        <input
          type="text"
          placeholder="Search for a destination..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {searching && <span className="search-loading">Searching...</span>}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <ul className="destination-results">
          {results.map((result) => (
            <li key={result.id} className="destination-result-item">
              <TransportIcon type={result.type} size={18} />
              <div className="destination-result-info">
                <span className="destination-result-name" title={result.name}>
                  {result.name}
                </span>
                {result.crs && <span className="destination-result-crs">{result.crs}</span>}
              </div>
              <button
                type="button"
                className="add-destination-button"
                onClick={() => addDestination(result)}
                disabled={destinations.some((d) => d.id === result.id)}
              >
                {destinations.some((d) => d.id === result.id) ? 'Added' : 'Add'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <span className="field-hint">
        {stationType === 'national-rail'
          ? 'Matches final destination or any stop along the route'
          : 'Matches final destination only'}
      </span>
    </div>
  )
}
