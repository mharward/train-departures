import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { DepartureRow } from '../components/DepartureRow'
import type { FilteredArrival } from '../types'

function makeDeparture(overrides: Partial<FilteredArrival> = {}): FilteredArrival {
  return {
    id: '1',
    expectedDeparture: Date.now() + 300_000,
    destinationName: 'Victoria',
    lineName: 'Victoria',
    lineId: 'victoria',
    modeName: 'tube',
    timeToStation: 300,
    status: null,
    source: 'tfl',
    ...overrides,
  }
}

function renderRow(departure: FilteredArrival, showPlatform = false) {
  return render(
    <MantineProvider>
      <DepartureRow departure={departure} showPlatform={showPlatform} />
    </MantineProvider>,
  )
}

describe('DepartureRow', () => {
  it('renders destination name', () => {
    renderRow(makeDeparture({ destinationName: 'Brixton' }))
    expect(screen.getByText('Brixton')).toBeInTheDocument()
  })

  it('shows "Due" when timeToStation <= 30s', () => {
    renderRow(makeDeparture({ timeToStation: 20 }))
    expect(screen.getByText('Due')).toBeInTheDocument()
  })

  it('shows minutes for future departures', () => {
    renderRow(makeDeparture({ timeToStation: 300 }))
    expect(screen.getByText('5 min')).toBeInTheDocument()
  })

  it('shows Delayed badge when status is Delayed', () => {
    renderRow(makeDeparture({ status: 'Delayed' }))
    expect(screen.getByText('Delayed')).toBeInTheDocument()
  })

  it('shows platform when showPlatform is true and platformName is set', () => {
    renderRow(makeDeparture({ platformName: '3' }), true)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
  })

  it('hides platform when showPlatform is false', () => {
    renderRow(makeDeparture({ platformName: '3' }), false)
    expect(screen.queryByText('Platform')).not.toBeInTheDocument()
  })
})
