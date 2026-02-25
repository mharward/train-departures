import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { StationCard } from '../components/StationCard'
import type { Station, FilteredArrival } from '../types'

const station: Station = {
  id: 'test-station',
  name: 'Kings Cross',
  type: 'national-rail',
  crs: 'KGX',
  minMinutes: 0,
  maxMinutes: 60,
  destinations: [],
}

function makeDeparture(overrides: Partial<FilteredArrival> = {}): FilteredArrival {
  return {
    id: '1',
    expectedDeparture: Date.now() + 300_000,
    destinationName: 'Cambridge',
    lineName: 'Great Northern',
    lineId: 'great-northern',
    modeName: 'national-rail',
    timeToStation: 300,
    status: null,
    source: 'national-rail',
    ...overrides,
  }
}

function renderCard(props: {
  departures?: FilteredArrival[]
  error?: string | null
  loading?: boolean
}) {
  return render(
    <MantineProvider>
      <StationCard
        station={station}
        departures={props.departures}
        error={props.error ?? null}
        loading={props.loading ?? false}
        showPlatform={false}
      />
    </MantineProvider>,
  )
}

describe('StationCard', () => {
  it('renders station name', () => {
    renderCard({ departures: [] })
    expect(screen.getByText('Kings Cross')).toBeInTheDocument()
  })

  it('shows loading spinner on initial load', () => {
    const { container } = renderCard({ loading: true, departures: undefined })
    expect(container.querySelector('[class*="Loader"]')).toBeInTheDocument()
    expect(screen.queryByText('No upcoming departures')).not.toBeInTheDocument()
  })

  it('shows error message when error is set and no departures', () => {
    renderCard({ error: 'API error' })
    expect(screen.getByText('Unable to load departures')).toBeInTheDocument()
  })

  it('shows stale departures instead of error when both exist', () => {
    renderCard({
      error: 'Network error',
      departures: [makeDeparture({ id: '1', destinationName: 'Cambridge' })],
    })
    expect(screen.queryByText('Unable to load departures')).not.toBeInTheDocument()
    expect(screen.getByText('Cambridge')).toBeInTheDocument()
  })

  it('shows empty state for empty departures array', () => {
    renderCard({ departures: [] })
    expect(screen.getByText('No upcoming departures')).toBeInTheDocument()
  })

  it('renders departure rows when data is present', () => {
    renderCard({
      departures: [
        makeDeparture({ id: '1', destinationName: 'Cambridge' }),
        makeDeparture({ id: '2', destinationName: 'Peterborough' }),
      ],
    })
    expect(screen.getByText('Cambridge')).toBeInTheDocument()
    expect(screen.getByText('Peterborough')).toBeInTheDocument()
  })

  it('caps at 8 departure rows', () => {
    const departures = Array.from({ length: 12 }, (_, i) =>
      makeDeparture({ id: String(i), destinationName: `Dest ${i}` }),
    )
    renderCard({ departures })
    for (let i = 0; i < 8; i++) {
      expect(screen.getByText(`Dest ${i}`)).toBeInTheDocument()
    }
    for (let i = 8; i < 12; i++) {
      expect(screen.queryByText(`Dest ${i}`)).not.toBeInTheDocument()
    }
  })
})
