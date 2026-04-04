/**
 * Alert Dashboard abstraction: holds client-side state and notifies subscribers
 * when it changes so the UI can re-render immediately.
 */
let listeners = new Set()

const initialState = {
  alerts: [],
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

/** Placeholder for normalizing Flask JSON into `alerts` + timestamps. */
export function mergeAlertsFromServer(payload) {
  setAlertDashboardState({
    alerts: Array.isArray(payload?.alerts) ? payload.alerts : [],
    lastUpdatedAt: Date.now(),
  })
}
