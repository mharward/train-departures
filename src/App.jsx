import { useState, useEffect, useMemo } from 'react'
import { Dashboard } from './components/Dashboard'
import { Settings } from './components/Settings'
import { useConfig } from './hooks/useConfig'
import { useDepartures } from './hooks/useDepartures'
import { filterVisibleStations } from './utils/schedule'
import './App.css'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const {
    config,
    addStation,
    updateStation,
    removeStation,
    updateSettings,
  } = useConfig()

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

  const {
    departures,
    loading,
    errors,
    lastUpdated,
    countdown,
    refresh,
  } = useDepartures(visibleStations, {
    autoRefresh: config.autoRefresh,
    refreshInterval: config.refreshInterval,
  })

  // Apply theme to document
  useEffect(() => {
    const applyTheme = (theme) => {
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
      } else {
        document.documentElement.setAttribute('data-theme', theme)
      }
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
        onRefresh={refresh}
        onOpenSettings={() => setShowSettings(true)}
      />

      {showSettings && (
        <Settings
          config={config}
          onAddStation={addStation}
          onUpdateStation={updateStation}
          onRemoveStation={removeStation}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
