let listeners = new Set()

const initialState = {
  zones: [],
  selectedZone: '',
  metrics: [],
  alerts: [],
  activeAlertCount: 0,
  simulationRunning: false,
  loading: false,
  error: '',
  lastUpdatedAt: null,
}

let state = { ...initialState }

export function getPublicDisplayState() {
  return state
}

export function subscribePublicDisplay(listener) {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((listener) => listener(state))
}

export function setPublicDisplayState(partial) {
  state = { ...state, ...partial }
  notify()
}

export function mergePublicDisplayState(payload) {
  setPublicDisplayState({
    ...payload,
    loading: false,
    error: '',
    lastUpdatedAt: Date.now(),
  })
}

export function setPublicDisplayLoading(loading) {
  setPublicDisplayState({ loading })
}

export function setPublicDisplayError(error) {
  setPublicDisplayState({
    error,
    loading: false,
  })
}

export function setSelectedZone(selectedZone) {
  setPublicDisplayState({ selectedZone })
}
