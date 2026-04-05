/**
 * Alert Dashboard abstraction: holds client-side state and notifies subscribers
 * when it changes so the UI can re-render immediately.
 */
let listeners = new Set()

export const DASHBOARD_MODE = {
  public: 'public',
  operator: 'operator',
  admin: 'admin',
}

const initialState = {
  dashboardMode: DASHBOARD_MODE.operator,
  alerts: [],
  metrics: [],
  rules: [],
  audit: [],
  advisories: [],
  loading: false,
  error: null,
  /** Flags when fetch fell back to stub data */
  stubFlags: {},
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

/** `/public/alerts` returns a raw array; some APIs may wrap `{ alerts: [] }`. */
export function normalizeAlertsPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.alerts)) return payload.alerts
  return []
}

export function normalizeMetricsPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.metrics)) return payload.metrics
  return []
}
