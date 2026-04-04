import { useEffect, useState } from 'react'
import {
  getAlertDashboardState,
  subscribeAlertDashboard,
  mergeAlertsFromServer,
} from './alertDashboardStore.js'
import AlertDashboardView from './AlertDashboardView.jsx'

export default function AlertDashboardController() {
  const [, setSnapshot] = useState(getAlertDashboardState)

  useEffect(() => subscribeAlertDashboard(setSnapshot), [])

  useEffect(() => {
    // Call Flask when wired: e.g. fetch(`${import.meta.env.VITE_API_URL}/api/operator/alerts`)
    //   .then((r) => r.json())
    //   .then((body) => mergeAlertsFromServer(body))
    //   .catch(() => setError in store or local state)
    //
    // For now, seed empty store once so presentation shows the subscription path.
    mergeAlertsFromServer({ alerts: [] })
  }, [])

  return <AlertDashboardView title="Alert Dashboard" />
}
