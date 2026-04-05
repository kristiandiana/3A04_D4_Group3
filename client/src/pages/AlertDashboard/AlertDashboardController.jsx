import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAlertDashboardState,
  subscribeAlertDashboard,
  setAlertDashboardState,
  normalizeAlertsPayload,
  normalizeMetricsPayload,
  DASHBOARD_MODE,
} from './AlertDashboardAbstraction.js'
import AlertDashboardPresentation from './AlertDashboardPresentation.jsx'
import { STUB_ALERT_RULES, STUB_AUDIT, STUB_ADVISORIES } from './stubData.js'

const POLL_MS = 10_000

async function fetchJsonOrStub(url, stub) {
  try {
    const res = await fetch(url)
    if (!res.ok) return { data: stub, usedStub: true }
    const data = await res.json()
    return { data, usedStub: false }
  } catch {
    return { data: stub, usedStub: true }
  }
}

export default function AlertDashboardController() {
  const [snapshot, setSnapshot] = useState(getAlertDashboardState)
  const modeRef = useRef(snapshot.dashboardMode)

  useEffect(() => subscribeAlertDashboard(setSnapshot), [])
  useEffect(() => {
    modeRef.current = snapshot.dashboardMode
  }, [snapshot.dashboardMode])

  const setMode = useCallback((dashboardMode) => {
    setAlertDashboardState({ dashboardMode })
  }, [])

  const runPoll = useCallback(async (opts = {}) => {
    const { showLoading = false } = opts
    const mode = modeRef.current
    const previous = getAlertDashboardState()
    if (showLoading) setAlertDashboardState({ loading: true, error: null })

    const stubFlags = {}
    const alertsResult = await fetchJsonOrStub('/public/alerts', [])
    const alerts = normalizeAlertsPayload(alertsResult.data)
    if (alertsResult.usedStub) stubFlags.alerts = true

    const metricsResult = await fetchJsonOrStub('/public/metrics', [])
    const metrics = normalizeMetricsPayload(metricsResult.data)
    if (metricsResult.usedStub) stubFlags.metrics = true

    let rules = previous.rules
    let audit = []
    let advisories = []

    if (mode === DASHBOARD_MODE.admin) {
      const auditRes = await fetchJsonOrStub('/admin/audit', STUB_AUDIT)
      audit = Array.isArray(auditRes.data) ? auditRes.data : STUB_AUDIT
      if (auditRes.usedStub) stubFlags.audit = true

      const advRes = await fetchJsonOrStub('/admin/advisories', STUB_ADVISORIES)
      advisories = Array.isArray(advRes.data) ? advRes.data : STUB_ADVISORIES
      if (advRes.usedStub) stubFlags.advisories = true

      const rulesRes = await fetchJsonOrStub('/admin/rules', STUB_ALERT_RULES)
      const body = rulesRes.data
      rules = Array.isArray(body)
        ? body
        : Array.isArray(body?.rules)
          ? body.rules
          : STUB_ALERT_RULES
      if (rulesRes.usedStub) stubFlags.rules = true
    }

    setAlertDashboardState({
      alerts,
      metrics,
      rules,
      audit,
      advisories,
      loading: false,
      stubFlags,
      lastUpdatedAt: Date.now(),
    })
  }, [])

  useEffect(() => {
    runPoll()
    const id = setInterval(runPoll, POLL_MS)
    return () => clearInterval(id)
  }, [runPoll])

  const acknowledgeAlert = useCallback(async (alertId) => {
    try {
      const res = await fetch(`/operator/alerts/${alertId}/ack`, { method: 'POST' })
      if (!res.ok) return
      await runPoll()
    } catch {
      setAlertDashboardState({ error: `Ack failed for alert ${alertId}` })
    }
  }, [runPoll])

  const resolveAlert = useCallback(async (alertId) => {
    try {
      const res = await fetch(`/operator/alerts/${alertId}/resolve`, { method: 'POST' })
      if (!res.ok) return
      await runPoll()
    } catch {
      setAlertDashboardState({ error: `Resolve failed for alert ${alertId}` })
    }
  }, [runPoll])

  const startSim = useCallback(async () => {
    try {
      const res = await fetch('/sim/start', { method: 'POST' })
      if (!res.ok) return
      await runPoll()
    } catch {
      setAlertDashboardState({ error: 'Simulation start failed' })
    }
  }, [runPoll])

  const stopSim = useCallback(async () => {
    try {
      const res = await fetch('/sim/stop', { method: 'POST' })
      if (!res.ok) return
      await runPoll()
    } catch {
      setAlertDashboardState({ error: 'Simulation stop failed' })
    }
  }, [runPoll])

  const addRule = useCallback(
    async (rule) => {
      try {
        const res = await fetch('/admin/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zone_id: rule.zone_id,
            metric_type: rule.metric_type,
            threshold: rule.threshold,
            comparator: rule.comparator,
            severity: rule.severity,
            enabled: rule.enabled,
          }),
        })
        if (!res.ok) {
          let msg = 'Add rule failed'
          try {
            const errBody = await res.json()
            if (errBody?.error) msg = errBody.error
          } catch {
            /* ignore */
          }
          setAlertDashboardState({ error: msg })
          return
        }
        await runPoll()
      } catch {
        setAlertDashboardState({ error: 'Add rule failed' })
      }
    },
    [runPoll]
  )

  return (
    <AlertDashboardPresentation
      snapshot={snapshot}
      setDashboardMode={setMode}
      onRefresh={() => runPoll({ showLoading: true })}
      onAcknowledge={acknowledgeAlert}
      onResolve={resolveAlert}
      onStartSim={startSim}
      onStopSim={stopSim}
      onAddRule={addRule}
    />
  )
}
