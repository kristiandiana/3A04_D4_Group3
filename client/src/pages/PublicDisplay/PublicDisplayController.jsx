import { startTransition, useEffect, useState } from 'react'

import { fetchJson } from '../../lib/api.js'
import PublicDisplayPresentation from './PublicDisplayPresentation.jsx'
import {
  getPublicDisplayState,
  mergePublicDisplayState,
  setPublicDisplayError,
  setPublicDisplayLoading,
  setSelectedZone,
  subscribePublicDisplay,
} from './PublicDisplayAbstraction.js'

async function refreshPublicDisplay(preferredZoneId) {
  setPublicDisplayLoading(true)

  try {
    const zones = await fetchJson('/public/zones')
    const currentZoneId =
      preferredZoneId ||
      getPublicDisplayState().selectedZone ||
      zones[0]?.zone_id ||
      ''

    const [simulationStatus, summary, alerts] = await Promise.all([
      fetchJson('/sim/status'),
      currentZoneId
        ? fetchJson(`/public/zones/${currentZoneId}/summary`)
        : Promise.resolve({ metrics: [], active_alert_count: 0 }),
      currentZoneId
        ? fetchJson('/public/alerts', {}, { zone_id: currentZoneId, limit: 8 })
        : Promise.resolve([]),
    ])

    mergePublicDisplayState({
      zones,
      selectedZone: currentZoneId,
      metrics: summary.metrics ?? [],
      alerts,
      activeAlertCount: summary.active_alert_count ?? 0,
      simulationRunning: Boolean(simulationStatus.running),
    })
  } catch (error) {
    setPublicDisplayError(error.message)
  }
}

export default function PublicDisplayController() {
  const [snapshot, setSnapshot] = useState(getPublicDisplayState)

  useEffect(() => subscribePublicDisplay(setSnapshot), [])

  useEffect(() => {
    void refreshPublicDisplay()
    const intervalId = window.setInterval(() => {
      void refreshPublicDisplay()
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [])

  function handleZoneChange(nextZoneId) {
    setSelectedZone(nextZoneId)
    startTransition(() => {
      void refreshPublicDisplay(nextZoneId)
    })
  }

  return (
    <PublicDisplayPresentation
      title="Public Environmental Display"
      zones={snapshot.zones}
      selectedZone={snapshot.selectedZone}
      metrics={snapshot.metrics}
      alerts={snapshot.alerts}
      activeAlertCount={snapshot.activeAlertCount}
      simulationRunning={snapshot.simulationRunning}
      loading={snapshot.loading}
      error={snapshot.error}
      lastUpdatedAt={snapshot.lastUpdatedAt}
      onZoneChange={handleZoneChange}
      onRefresh={() => void refreshPublicDisplay(snapshot.selectedZone)}
    />
  )
}
