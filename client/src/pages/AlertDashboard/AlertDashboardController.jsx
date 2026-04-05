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

      // TODO: replace when GET /admin/rules exists
      const rulesRes = await fetch('/admin/rules')
      let baseRules = STUB_ALERT_RULES
      if (rulesRes.ok) {
        const body = await rulesRes.json()
        baseRules = Array.isArray(body)
          ? body
          : Array.isArray(body?.rules)
            ? body.rules
            : STUB_ALERT_RULES
      } else {
        stubFlags.rules = true
      }
      const merged = [...baseRules]
      for (const r of previous.rules) {
        if (!merged.some((b) => b.rule_id === r.rule_id)) merged.push(r)
      }
      rules = merged
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
    await fetchJsonOrStub('/sim/start', { status: 'stub' })
    await runPoll()
  }, [runPoll])

  const stopSim = useCallback(async () => {
    await fetchJsonOrStub('/sim/stop', { status: 'stub' })
    await runPoll()
  }, [runPoll])

  /** Client-only rule row until POST /admin/rules exists */
  const addRuleLocal = useCallback((rule) => {
    const prev = getAlertDashboardState().rules
    const nextId =
      prev.length > 0 ? Math.max(...prev.map((r) => r.rule_id ?? 0)) + 1 : 1
    setAlertDashboardState({
      rules: [...prev, { ...rule, rule_id: nextId }],
    })
  }, [])

  return (
    <AlertDashboardPresentation
      snapshot={snapshot}
      setDashboardMode={setMode}
      onRefresh={() => runPoll({ showLoading: true })}
      onAcknowledge={acknowledgeAlert}
      onResolve={resolveAlert}
      onStartSim={startSim}
      onStopSim={stopSim}
      onAddRuleLocal={addRuleLocal}
    />
  )
}
