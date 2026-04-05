function formatZone(zoneId) {
  return zoneId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatTimestamp(value) {
  if (!value) {
    return 'Not yet'
  }

  return new Date(value).toLocaleString()
}

export default function AlertDashboardPresentation({
  title,
  alerts,
  loading,
  error,
  lastUpdatedAt,
  actingAlertId,
  simulationRunning,
  simulationTransport,
  mqttStatus,
  onRefresh,
  onAcknowledge,
  onResolve,
  onSimulationToggle,
  onTransportChange,
}) {
  const criticalCount = alerts.filter((alert) => alert.severity === 'critical').length
  const acknowledgedCount = alerts.filter((alert) => alert.status === 'acknowledged').length

  return (
    <section className="page-shell">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Operator Console</p>
          <h2>{title}</h2>
          <p className="muted-copy">
            Last refresh {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : 'pending'}
          </p>
        </div>
        <div className="button-row">
          <span className={`status-pill ${simulationRunning ? 'status-live' : 'status-idle'}`}>
            {simulationRunning ? 'Feed running' : 'Feed stopped'}
          </span>
          <button
            type="button"
            className="action-button"
            onClick={() => onSimulationToggle(!simulationRunning)}
          >
            {simulationRunning ? 'Stop Feed' : 'Start Feed'}
          </button>
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Alerts'}
          </button>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <div className="toolbar-card">
        <label className="select-field">
          <span>Ingestion transport</span>
          <select
            value={simulationTransport}
            onChange={(event) => onTransportChange(event.target.value)}
          >
            <option value="direct">Direct</option>
            <option value="mqtt">MQTT</option>
          </select>
        </label>

        <article className="stat-card compact">
          <span className="stat-label">MQTT subscriber</span>
          <strong>{mqttStatus?.connected ? 'Connected' : 'Offline'}</strong>
          <span className="muted-copy">
            {mqttStatus?.enabled ? mqttStatus.topic : 'Disabled in app config'}
          </span>
        </article>
      </div>

      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-label">Visible Alerts</span>
          <strong>{alerts.length}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Critical</span>
          <strong>{criticalCount}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Acknowledged</span>
          <strong>{acknowledgedCount}</strong>
        </article>
      </div>

      <div className="alert-list">
        {alerts.length === 0 && (
          <article className="empty-card">
            <h3>No active alerts</h3>
            <p>Start the simulator or wait for a threshold violation to see live alert traffic.</p>
          </article>
        )}

        {alerts.map((alert) => (
          <article key={alert.alert_id} className={`alert-card severity-${alert.severity}`}>
            <div className="alert-card-header">
              <div>
                <p className="eyebrow">
                  {formatZone(alert.zone_id)} · {alert.metric_type.toUpperCase()}
                </p>
                <h3>{alert.message}</h3>
              </div>
              <div className="pill-row">
                <span className={`status-pill status-${alert.status}`}>{alert.status}</span>
                <span className={`status-pill severity-${alert.severity}`}>{alert.severity}</span>
              </div>
            </div>

            <div className="alert-metadata">
              <span>Current {alert.current_value}</span>
              <span>Threshold {alert.threshold}</span>
              <span>Created {formatTimestamp(alert.created_at)}</span>
            </div>

            <div className="button-row">
              <button
                type="button"
                className="action-button"
                onClick={() => onAcknowledge(alert.alert_id)}
                disabled={alert.status !== 'active' || actingAlertId === alert.alert_id}
              >
                {actingAlertId === alert.alert_id && alert.status === 'active' ? 'Saving...' : 'Acknowledge'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => onResolve(alert.alert_id)}
                disabled={alert.status === 'resolved' || actingAlertId === alert.alert_id}
              >
                {actingAlertId === alert.alert_id && alert.status !== 'resolved' ? 'Saving...' : 'Resolve'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
