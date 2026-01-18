import { useState, useEffect } from 'react'
import { Dashboard } from './components/Dashboard'
import { Settings } from './components/Settings'
import { useConfig } from './hooks/useConfig'
import { useDepartures } from './hooks/useDepartures'
import './App.css'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const {
    config,
    addStation,
    updateStation,
    removeStation,
    updateSettings,
  } = useConfig()

  const {
    departures,
    loading,
    errors,
    lastUpdated,
    countdown,
    refresh,
  } = useDepartures(config.stations, config.refreshInterval)

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
        stations={config.stations}
        departures={departures}
        errors={errors}
        loading={loading}
        lastUpdated={lastUpdated}
        countdown={countdown}
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
