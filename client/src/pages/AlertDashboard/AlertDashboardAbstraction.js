let listeners = new Set()

const initialState = {
  alerts: [],
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
  const alerts = Array.isArray(payload?.alerts) ? payload.alerts : []

  setAlertDashboardState({
    alerts,
    simulationRunning: Boolean(payload?.simulationRunning),
    simulationTransport: payload?.simulationTransport ?? 'direct',
    mqttStatus: payload?.mqttStatus ?? null,
    loading: false,
    error: '',
    lastUpdatedAt: Date.now(),
  })
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
