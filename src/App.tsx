import { useState, useEffect, useMemo } from 'react'
import { useMantineColorScheme } from '@mantine/core'
import { Dashboard } from './components/Dashboard'
import { Settings } from './components/Settings'
import { useConfig } from './hooks/useConfig'
import { useDepartures } from './hooks/useDepartures'
import { filterVisibleStations } from './utils/schedule'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const { config, addStation, updateStation, removeStation, reorderStations, updateSettings } =
    useConfig()
  const { setColorScheme } = useMantineColorScheme()

  // Update current time every minute for schedule filtering
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Filter stations based on schedule visibility
  const visibleStations = useMemo(
    () => filterVisibleStations(config.stations, currentTime),
    [config.stations, currentTime]
  )

  const { departures, loading, errors, lastUpdated, countdown, refresh } = useDepartures(
    visibleStations,
    {
      autoRefresh: config.autoRefresh,
      refreshInterval: config.refreshInterval,
    }
  )

  // Sync Mantine color scheme with config theme
  useEffect(() => {
    if (config.theme === 'system') {
      setColorScheme('auto')
    } else {
      setColorScheme(config.theme)
    }
  }, [config.theme, setColorScheme])

  // Also apply theme to document for legacy CSS variables and PWA theme-color
  useEffect(() => {
    const applyTheme = (theme: string) => {
      const isDark =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : theme === 'dark'
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      const themeColor = isDark ? '#1a1b1e' : '#ffffff'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)
    }

    applyTheme(config.theme)

    // Listen for system theme changes
    if (config.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [config.theme])

  return (
    <div className="app">
      <Dashboard
        stations={visibleStations}
        departures={departures}
        errors={errors}
        loading={loading}
        lastUpdated={lastUpdated}
        countdown={countdown}
        autoRefresh={config.autoRefresh}
        showPlatform={config.showPlatform}
        maxDepartures={config.maxDepartures}
        onRefresh={refresh}
        onOpenSettings={() => setShowSettings(true)}
      />

      {showSettings && (
        <Settings
          config={config}
          onAddStation={addStation}
          onUpdateStation={updateStation}
          onRemoveStation={removeStation}
          onReorderStations={reorderStations}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
