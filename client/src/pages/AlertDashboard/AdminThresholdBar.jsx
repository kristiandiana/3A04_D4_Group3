/**
 * Horizontal scale: green = within rule (no alert), red = violation band.
 * Marker shows latest aggregate average when available.
 */
function violates(value, threshold, comparator) {
  switch (comparator) {
    case '>':
      return value > threshold
    case '>=':
      return value >= threshold
    case '<':
      return value < threshold
    case '<=':
      return value <= threshold
    default:
      return false
  }
}

function domainForRule(threshold, value) {
  const v = value != null && Number.isFinite(value) ? value : threshold
  let lo = Math.min(threshold, v)
  let hi = Math.max(threshold, v)
  const span = hi - lo || Math.max(Math.abs(threshold), 1)
  const pad = span * 0.2
  return { min: lo - pad, max: hi + pad }
}

function pct(v, min, max) {
  if (max <= min) return 50
  return ((v - min) / (max - min)) * 100
}

export default function AdminThresholdBar({ rule, latestAverage }) {
  const { threshold, comparator, metric_type, zone_id, enabled } = rule
  const t = Number(threshold)
  const val = latestAverage != null && Number.isFinite(Number(latestAverage)) ? Number(latestAverage) : null
  const { min, max } = domainForRule(t, val)
  const tPos = pct(t, min, max)
  const inViolation = val != null ? violates(val, t, comparator) : null

  let greenFrom = 0
  let greenTo = 100
  let redFrom = 0
  let redTo = 100

  if (comparator === '>' || comparator === '>=') {
    greenFrom = 0
    greenTo = tPos
    redFrom = tPos
    redTo = 100
  } else {
    redFrom = 0
    redTo = tPos
    greenFrom = tPos
    greenTo = 100
  }

  const markerPos = val != null ? pct(val, min, max) : null

  return (
    <div className={`admin-threshold-bar ${enabled ? '' : 'admin-threshold-bar--disabled'}`}>
      <div className="admin-threshold-bar__head">
        <span className="admin-threshold-bar__title">
          {zone_id} · {metric_type}
        </span>
        <span className="admin-threshold-bar__meta muted-copy">
          rule {comparator} {t}
          {val != null ? (
            <>
              {' '}
              · current <strong>{val.toFixed(2)}</strong>
              {inViolation != null ? (
                <span className={inViolation ? 'admin-threshold-bar__bad' : 'admin-threshold-bar__ok'}>
                  {inViolation ? ' · over threshold' : ' · within threshold'}
                </span>
              ) : null}
            </>
          ) : (
            ' · no recent aggregate'
          )}
        </span>
      </div>
      <div className="admin-threshold-bar__track" role="img" aria-label={`Threshold scale for ${metric_type}`}>
        <div className="admin-threshold-bar__segments">
          {greenFrom < greenTo && (
            <div
              className="admin-threshold-bar__segment admin-threshold-bar__segment--ok"
              style={{ left: `${greenFrom}%`, width: `${greenTo - greenFrom}%` }}
            />
          )}
          {redFrom < redTo && (
            <div
              className="admin-threshold-bar__segment admin-threshold-bar__segment--bad"
              style={{ left: `${redFrom}%`, width: `${redTo - redFrom}%` }}
            />
          )}
        </div>
        <div className="admin-threshold-bar__tick" style={{ left: `${tPos}%` }} title={`Threshold ${t}`} />
        {markerPos != null && (
          <div className="admin-threshold-bar__marker" style={{ left: `${markerPos}%` }} title={`Average ${val}`} />
        )}
      </div>
      <div className="admin-threshold-bar__axis muted-copy">
        <span>{min.toFixed(1)}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  )
}
