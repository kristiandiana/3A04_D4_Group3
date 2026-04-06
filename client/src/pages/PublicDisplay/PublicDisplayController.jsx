import { useEffect, useState } from 'react'

import { fetchJson } from '../../lib/api.js'
import PublicDisplayPresentation from './PublicDisplayPresentation.jsx'
import {
  getPublicDisplayState,
  mergePublicDisplayState,
  setPublicDisplayError,
  setPublicDisplayLoading,
  subscribePublicDisplay,
} from './PublicDisplayAbstraction.js'

async function refreshPublicDisplay() {
  setPublicDisplayLoading(true)

  try {
    const zones = await fetchJson('/public/zones')
    const simulationStatus = await fetchJson('/sim/status')

    const zoneSummaries = await Promise.all(
      zones.map(async (z) => {
        const summary = await fetchJson(`/public/zones/${z.zone_id}/summary`)
        return {
          zone_id: z.zone_id,
          metrics: summary.metrics ?? [],
        }
      }),
    )

    mergePublicDisplayState({
      zoneSummaries,
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

  return (
    <PublicDisplayPresentation
      title="Public Display"
      zoneSummaries={snapshot.zoneSummaries}
      simulationRunning={snapshot.simulationRunning}
      loading={snapshot.loading}
      error={snapshot.error}
      lastUpdatedAt={snapshot.lastUpdatedAt}
      onRefresh={() => void refreshPublicDisplay()}
    />
  )
}
