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

/** Title for the green header (e.g. AQI not Aqi). */
function formatMetricTitle(metricType) {
  const special = {
    aqi: 'AQI',
    humidity: 'Humidity',
    noise: 'Noise',
    temperature: 'Temperature',
  }
  if (special[metricType]) return special[metricType]
  return metricType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatOptionalFixed(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return 'n/a'
  return Number(value).toFixed(digits)
}

function formatMetricPrimary(metric) {
  const unit = METRIC_UNITS[metric.metric_type] ?? ''
  if (metric.five_minute_average == null) {
    return 'Waiting...'
  }
  return `${formatOptionalFixed(metric.five_minute_average)} ${unit}`.trim()
}

function formatValueWithUnit(metricType, value) {
  const unit = METRIC_UNITS[metricType] ?? ''
  if (value == null || Number.isNaN(Number(value))) return 'n/a'
  return `${formatOptionalFixed(value)} ${unit}`.trim()
}

export default function PublicDisplayPresentation({
  title,
  zoneSummaries,
  simulationRunning,
  loading,
  error,
  lastUpdatedAt,
  onRefresh,
}) {
  return (
    <section className="page-shell public-display">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Aggregated environmental metrics</p>
          <h2>{title}</h2>
          <p className="muted-copy">
            All zones · Last refresh{' '}
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

      {zoneSummaries.length === 0 && !error && (
        <article className="empty-card">
          <h3>No zones yet</h3>
          <p>When the demo feed runs, zone summaries will appear here.</p>
        </article>
      )}

      {zoneSummaries.map(({ zone_id: zoneId, metrics }) => (
        <div key={zoneId} className="public-zone-panel">
          <h3 className="public-zone-panel__title">{formatZone(zoneId)}</h3>
          <div className="metric-grid">
            {metrics.length === 0 && (
              <article className="empty-card">
                <h3>No live telemetry yet</h3>
                <p>An operator can start the demo feed from the alert dashboard.</p>
              </article>
            )}

            {metrics.map((metric) => (
              <article key={metric.metric_type} className="metric-card">
                <p className="eyebrow">
                  {formatMetricTitle(metric.metric_type)} (5-minute average)
                </p>
                <strong>{formatMetricPrimary(metric)}</strong>
                <p className="muted-copy public-metric-detail-line">
                  5-minute minimum {formatValueWithUnit(metric.metric_type, metric.five_minute_minimum)}
                </p>
                <p className="muted-copy public-metric-detail-line">
                  5-minute maximum {formatValueWithUnit(metric.metric_type, metric.five_minute_maximum)}
                </p>
                <p className="muted-copy public-metric-detail-line">
                  Hourly average {formatValueWithUnit(metric.metric_type, metric.hourly_average)}
                </p>
                <p className="muted-copy public-metric-detail-line">
                  Hourly maximum {formatValueWithUnit(metric.metric_type, metric.hourly_maximum)}
                </p>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
