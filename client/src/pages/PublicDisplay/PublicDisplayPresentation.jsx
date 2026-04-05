const METRIC_UNITS = {
  aqi: 'AQI',
  humidity: '%',
  noise: 'dB',
  temperature: 'C',
}

function formatZone(zoneId) {
  return zoneId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatMetricLabel(metricType) {
  return metricType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatMetricValue(metric) {
  const unit = METRIC_UNITS[metric.metric_type] ?? ''
  if (metric.five_minute_average == null) {
    return 'Waiting...'
  }
  return `${metric.five_minute_average.toFixed(1)} ${unit}`.trim()
}

export default function PublicDisplayPresentation({
  title,
  zones,
  selectedZone,
  metrics,
  alerts,
  activeAlertCount,
  simulationRunning,
  loading,
  error,
  lastUpdatedAt,
  onZoneChange,
  onRefresh,
}) {
  return (
    <section className="page-shell public-display">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Read-Only Public API Client</p>
          <h2>{title}</h2>
          <p className="muted-copy">
            {selectedZone ? formatZone(selectedZone) : 'No zone selected'} · Last refresh{' '}
            {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : 'pending'}
          </p>
        </div>
        <div className="button-row">
          <span className={`status-pill ${simulationRunning ? 'status-live' : 'status-idle'}`}>
            {simulationRunning ? 'Demo feed live' : 'Demo feed stopped'}
          </span>
          <button type="button" className="secondary-button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <div className="toolbar-card">
        <label className="select-field">
          <span>Display zone</span>
          <select value={selectedZone} onChange={(event) => onZoneChange(event.target.value)}>
            {zones.map((zone) => (
              <option key={zone.zone_id} value={zone.zone_id}>
                {formatZone(zone.zone_id)}
              </option>
            ))}
          </select>
        </label>

        <article className="stat-card compact">
          <span className="stat-label">Active alerts in zone</span>
          <strong>{activeAlertCount}</strong>
        </article>
      </div>

      <div className="metric-grid">
        {metrics.length === 0 && (
          <article className="empty-card">
            <h3>No live telemetry yet</h3>
            <p>An authenticated operator can start the demo feed from the alert dashboard.</p>
          </article>
        )}

        {metrics.map((metric) => (
          <article key={metric.metric_type} className="metric-card">
            <p className="eyebrow">{formatMetricLabel(metric.metric_type)}</p>
            <strong>{formatMetricValue(metric)}</strong>
            <span className="muted-copy">
              5-minute max {metric.five_minute_maximum?.toFixed(1) ?? 'n/a'}
            </span>
            <span className="muted-copy">
              Hourly max {metric.hourly_maximum?.toFixed(1) ?? 'n/a'}
            </span>
          </article>
        ))}
      </div>

      <div className="alert-list">
        {alerts.length === 0 && (
          <article className="empty-card">
            <h3>No active public alerts</h3>
            <p>The selected zone currently has no active or acknowledged alerts.</p>
          </article>
        )}

        {alerts.map((alert) => (
          <article key={alert.alert_id} className={`alert-card severity-${alert.severity}`}>
            <div className="alert-card-header">
              <div>
                <p className="eyebrow">{alert.metric_type.toUpperCase()}</p>
                <h3>{alert.message}</h3>
              </div>
              <span className={`status-pill severity-${alert.severity}`}>{alert.severity}</span>
            </div>
            <div className="alert-metadata">
              <span>Status {alert.status}</span>
              <span>Current {alert.current_value}</span>
              <span>Threshold {alert.threshold}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
