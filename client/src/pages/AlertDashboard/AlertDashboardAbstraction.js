let listeners = new Set()

const initialState = {
  alerts: [],
  rules: [],
  metrics: [],
  loading: false,
  error: '',
  actingAlertId: null,
  simulationRunning: false,
  simulationTransport: 'direct',
  mqttStatus: null,
  lastUpdatedAt: null,
}

let state = { ...initialState }

export function getAlertDashboardState() {
  return state
}

export function subscribeAlertDashboard(listener) {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((fn) => fn(state))
}

export function setAlertDashboardState(partial) {
  state = { ...state, ...partial }
  notify()
}

export function mergeAlertDashboardState(payload) {
  const prev = state
  const alerts = Array.isArray(payload?.alerts) ? payload.alerts : []

  const updates = {
    alerts,
    simulationRunning: Boolean(payload?.simulationRunning),
    simulationTransport: payload?.simulationTransport ?? prev.simulationTransport,
    mqttStatus: payload?.mqttStatus ?? null,
    loading: false,
    error: '',
    lastUpdatedAt: Date.now(),
  }

  if (Array.isArray(payload?.rules)) {
    updates.rules = payload.rules
  }
  if (Array.isArray(payload?.metrics)) {
    updates.metrics = payload.metrics
  }

  setAlertDashboardState(updates)
}

export function setAlertDashboardLoading(loading) {
  setAlertDashboardState({ loading })
}

export function setAlertDashboardError(error) {
  setAlertDashboardState({
    error,
    loading: false,
  })
}

export function setActingAlertId(actingAlertId) {
  setAlertDashboardState({ actingAlertId })
}
