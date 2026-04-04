import { useEffect, useState } from 'react'
import {
  getAlertDashboardState,
  subscribeAlertDashboard,
  mergeAlertsFromServer,
} from './AlertDashboardAbstraction.js'
import AlertDashboardPresentation from './AlertDashboardPresentation.jsx'

export default function AlertDashboardController() {
  const [, setSnapshot] = useState(getAlertDashboardState)

  useEffect(() => subscribeAlertDashboard(setSnapshot), [])

  useEffect(() => {
    // Call Flask when wired: e.g. fetch(`${import.meta.env.VITE_API_URL}/api/operator/alerts`)
    //   .then((r) => r.json())
    //   .then((body) => mergeAlertsFromServer(body))
    //   .catch(() => setError in abstraction or local state)
    //
    // For now, seed empty state once so presentation shows the subscription path.
    mergeAlertsFromServer({ alerts: [] })
  }, [])

  return <AlertDashboardPresentation title="Alert Dashboard" />
}
