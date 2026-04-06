import { useEffect, useRef, useState } from 'react'
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

export default function AlertDashboardController({ isAdmin = false }) {
  const [snapshot, setSnapshot] = useState(getAlertDashboardState)
  const isAdminRef = useRef(isAdmin)
  isAdminRef.current = isAdmin

  useEffect(() => subscribeAlertDashboard(setSnapshot), [])

  async function refreshAlertDashboard() {
    setAlertDashboardLoading(true)

    try {
      const admin = isAdminRef.current
      const tasks = [
        fetchJson('/operator/alerts', {}, { limit: 25 }),
        fetchJson('/sim/status'),
      ]
      if (admin) {
        tasks.push(fetchJson('/admin/rules'))
        tasks.push(fetchJson('/admin/metrics/latest', {}, { window_type: '5min' }))
      }

      const results = await Promise.all(tasks)
      const alerts = results[0]
      const simulationStatus = results[1]

      const mergePayload = {
        alerts,
        simulationRunning: simulationStatus.running,
        simulationTransport: simulationStatus.transport,
        mqttStatus: simulationStatus.mqtt,
      }

      if (admin && Array.isArray(results[2]) && Array.isArray(results[3])) {
        mergePayload.rules = results[2]
        mergePayload.metrics = results[3]
      }

      mergeAlertDashboardState(mergePayload)
    } catch (error) {
      setAlertDashboardError(error.message)
    }
  }

  useEffect(() => {
    void refreshAlertDashboard()
    const intervalId = window.setInterval(() => {
      void refreshAlertDashboard()
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [isAdmin])

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

  async function handleAddRule(payload) {
    await fetchJson('/admin/rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    await refreshAlertDashboard()
  }

  async function handleDeleteRule(ruleId) {
    await fetchJson(`/admin/rules/${ruleId}`, { method: 'DELETE' })
    await refreshAlertDashboard()
  }

  return (
    <AlertDashboardPresentation
      title="Operator Alert Dashboard"
      isAdmin={isAdmin}
      rules={snapshot.rules}
      metrics={snapshot.metrics}
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
      onAddRule={(payload) => handleAddRule(payload)}
      onDeleteRule={(ruleId) => handleDeleteRule(ruleId)}
    />
  )
}
