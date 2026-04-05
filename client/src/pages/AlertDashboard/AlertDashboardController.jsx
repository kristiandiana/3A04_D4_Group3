import { useEffect, useState } from 'react'
import {
  getAlertDashboardState,
  subscribeAlertDashboard,
  mergeAlertDashboardState,
  setActingAlertId,
  setAlertDashboardError,
  setAlertDashboardLoading,
} from './AlertDashboardAbstraction.js'
import AlertDashboardPresentation from './AlertDashboardPresentation.jsx'
import { fetchJson } from '../../lib/api.js'

async function refreshAlertDashboard() {
  setAlertDashboardLoading(true)

  try {
    const [alerts, simulationStatus] = await Promise.all([
      fetchJson('/operator/alerts', {}, { limit: 25 }),
      fetchJson('/sim/status'),
    ])
    mergeAlertDashboardState({
      alerts,
      simulationRunning: simulationStatus.running,
      simulationTransport: simulationStatus.transport,
      mqttStatus: simulationStatus.mqtt,
    })
  } catch (error) {
    setAlertDashboardError(error.message)
  }
}

export default function AlertDashboardController() {
  const [snapshot, setSnapshot] = useState(getAlertDashboardState)

  useEffect(() => subscribeAlertDashboard(setSnapshot), [])

  useEffect(() => {
    void refreshAlertDashboard()
    const intervalId = window.setInterval(() => {
      void refreshAlertDashboard()
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [])

  async function handleAlertAction(alertId, action) {
    setActingAlertId(alertId)

    try {
      await fetchJson(`/operator/alerts/${alertId}/${action}`, { method: 'POST' })
      await refreshAlertDashboard()
    } catch (error) {
      setAlertDashboardError(error.message)
    } finally {
      setActingAlertId(null)
    }
  }

  async function handleSimulationToggle(nextRunning) {
    try {
      await fetchJson(nextRunning ? '/sim/start' : '/sim/stop', { method: 'POST' })
      await refreshAlertDashboard()
    } catch (error) {
      setAlertDashboardError(error.message)
    }
  }

  async function handleTransportChange(nextTransport) {
    try {
      await fetchJson('/sim/transport', {
        method: 'POST',
        body: JSON.stringify({ transport: nextTransport }),
      })
      await refreshAlertDashboard()
    } catch (error) {
      setAlertDashboardError(error.message)
    }
  }

  return (
    <AlertDashboardPresentation
      title="Operator Alert Dashboard"
      alerts={snapshot.alerts}
      loading={snapshot.loading}
      error={snapshot.error}
      lastUpdatedAt={snapshot.lastUpdatedAt}
      actingAlertId={snapshot.actingAlertId}
      simulationRunning={snapshot.simulationRunning}
      simulationTransport={snapshot.simulationTransport}
      mqttStatus={snapshot.mqttStatus}
      onRefresh={() => void refreshAlertDashboard()}
      onAcknowledge={(alertId) => void handleAlertAction(alertId, 'ack')}
      onResolve={(alertId) => void handleAlertAction(alertId, 'resolve')}
      onSimulationToggle={(nextRunning) => void handleSimulationToggle(nextRunning)}
      onTransportChange={(nextTransport) => void handleTransportChange(nextTransport)}
    />
  )
}
