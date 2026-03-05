import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { Settings } from '../components/Settings'
import type { AppConfig, Station } from '../types'

function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    instanceId: crypto.randomUUID(),
    id: 'station-1',
    name: 'Kings Cross',
    type: 'national-rail',
    crs: 'KGX',
    minMinutes: 0,
    maxMinutes: 60,
    destinations: [],
    ...overrides,
  }
}

const defaultConfig: AppConfig = {
  stations: [
    makeStation({ id: 'station-1', name: 'Kings Cross' }),
    makeStation({ id: 'station-2', name: 'Paddington' }),
    makeStation({ id: 'station-3', name: 'Euston' }),
  ],
  autoRefresh: true,
  refreshInterval: 30,
  showPlatform: false,
  theme: 'system',
}

function renderSettings(overrides: { config?: Partial<AppConfig> } = {}) {
  const props = {
    config: { ...defaultConfig, ...overrides.config },
    onAddStation: vi.fn(),
    onUpdateStation: vi.fn(),
    onRemoveStation: vi.fn(),
    onReorderStations: vi.fn(),
    onUpdateSettings: vi.fn(),
    onClose: vi.fn(),
  }

  render(
    <MantineProvider>
      <Settings {...props} />
    </MantineProvider>,
  )

  return props
}

describe('Settings station reordering', () => {
  it('calls onReorderStations with correct indices when moving up', () => {
    const props = renderSettings()
    const upButtons = screen.getAllByLabelText(/Move .* up/)

    // Click up on second station (Paddington)
    fireEvent.click(upButtons[1])
    expect(props.onReorderStations).toHaveBeenCalledWith(1, 0)
  })

  it('calls onReorderStations with correct indices when moving down', () => {
    const props = renderSettings()
    const downButtons = screen.getAllByLabelText(/Move .* down/)

    // Click down on first station (Kings Cross)
    fireEvent.click(downButtons[0])
    expect(props.onReorderStations).toHaveBeenCalledWith(0, 1)
  })

  it('disables up button on first station', () => {
    renderSettings()
    const upButtons = screen.getAllByLabelText(/Move .* up/)
    expect(upButtons[0]).toBeDisabled()
  })

  it('disables down button on last station', () => {
    renderSettings()
    const downButtons = screen.getAllByLabelText(/Move .* down/)
    expect(downButtons[downButtons.length - 1]).toBeDisabled()
  })

  it('hides reorder buttons when only one station exists', () => {
    renderSettings({
      config: {
        stations: [makeStation({ id: 'station-1', name: 'Kings Cross' })],
      },
    })
    expect(screen.queryByLabelText(/Move .* up/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Move .* down/)).not.toBeInTheDocument()
  })
})
