import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  coordinatesForZone,
  DEFAULT_MAP_CENTER,
  MAP_DEFAULT_ZOOM,
  ZONE_IDS_KNOWN,
} from './zoneCoordinates.js'

function formatZone(zoneId) {
  return String(zoneId)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const METRICS = ['aqi', 'temperature', 'humidity', 'noise']
const METRICS_BY_ZONE = {
  'zone-north': ['aqi', 'temperature', 'humidity'],
  'zone-central': ['aqi', 'humidity', 'noise'],
}
const METRIC_UNITS = {
  aqi: 'AQI',
  temperature: 'C',
  humidity: '%',
  noise: 'dB',
}
const SENSOR_HEALTH_BY_ZONE = {
  'zone-north': { status: 'GOOD', active: 3, total: 3 },
  'zone-central': { status: 'GOOD', active: 3, total: 3 },
}

function alertsForZonePopup(allAlerts, zoneId) {
  return (allAlerts || []).filter((a) => {
    if (a.zone_id !== zoneId) return false
    return true
  })
}

function latestReadingForMetric(zoneAlerts, metricType) {
  const rows = zoneAlerts.filter((a) => a.metric_type === metricType)
  if (!rows.length) return null
  const sorted = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const value = sorted[0]?.current_value
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : null
}

function latestAggregateForMetric(metricRows, zoneId, metricType) {
  const rows = (metricRows || []).filter(
    (row) =>
      row.zone_id === zoneId &&
      String(row.metric_type || '').trim().toLowerCase() === metricType
  )
  if (!rows.length) return null
  const sorted = [...rows].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  const value = sorted[0]?.average
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : null
}

export default function OperatorAlertsMap({
  /** Used for marker size / color (matches scrollable list). */
  filteredAlerts,
  /** Full list for popup “alerts in this zone” (still respects metric filter). */
  allAlerts,
  /** Latest aggregate metric rows for all zones. */
  metricRows,
  selectedZoneId,
  onSelectZone,
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const zonesOnMap = useMemo(() => {
    const ids = new Set(ZONE_IDS_KNOWN)
    ;(allAlerts || []).forEach((a) => ids.add(a.zone_id))
    return [...ids].sort()
  }, [allAlerts])

  const filteredByZone = useMemo(() => {
    const map = new Map()
    for (const z of zonesOnMap) map.set(z, [])
    for (const a of filteredAlerts || []) {
      if (!map.has(a.zone_id)) map.set(a.zone_id, [])
      map.get(a.zone_id).push(a)
    }
    return map
  }, [filteredAlerts, zonesOnMap])

  if (!mounted) {
    return (
      <div
        className="operator-map-placeholder"
        style={{ height: 320, width: '100%' }}
        aria-hidden
      />
    )
  }

  return (
    <div className="operator-map-inner">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={MAP_DEFAULT_ZOOM}
        style={{ height: 320, width: '100%', borderRadius: 12 }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {zonesOnMap.map((zoneId) => {
          const zoneFiltered = filteredByZone.get(zoneId) || []
          const count = zoneFiltered.length
          const critical = zoneFiltered.some((a) => a.severity === 'critical')
          const popupAlerts = alertsForZonePopup(allAlerts, zoneId)
          const criticalCount = popupAlerts.filter((a) => a.severity === 'critical').length
          const warningCount = popupAlerts.filter((a) => a.severity === 'warning').length
          const zoneHealth = SENSOR_HEALTH_BY_ZONE[zoneId] || { status: 'GOOD', active: 6, total: 6 }
          const pos = coordinatesForZone(zoneId)
          const selected = selectedZoneId === zoneId
          return (
            <CircleMarker
              key={zoneId}
              center={pos}
              radius={selected ? 16 : count > 0 ? 14 : 10}
              pathOptions={{
                color: selected ? '#0d7a52' : critical ? '#b91c1c' : count > 0 ? '#ca8a04' : '#64748b',
                fillColor: critical ? '#fecaca' : count > 0 ? '#fef9c3' : '#e2e8f0',
                fillOpacity: 0.85,
                weight: selected ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onSelectZone(zoneId),
              }}
            >
              <Popup>
                <div className="operator-map-popup">
                  <strong>{formatZone(zoneId)}</strong>
                  <div className="muted-copy operator-map-popup__health">
                    Sensor health: <strong>{zoneHealth.status}</strong> ({zoneHealth.active}/{zoneHealth.total} sensors active)
                  </div>

                  <div className="operator-map-popup__counts">
                    <span className="status-pill">{popupAlerts.length} total alerts</span>
                    <span className="status-pill severity-critical">{criticalCount} critical</span>
                    <span className="status-pill severity-warning">{warningCount} warning</span>
                  </div>

                  <ul className="operator-map-popup__metrics">
                    {(METRICS_BY_ZONE[zoneId] || METRICS).map((metricType) => {
                      const metricAlerts = popupAlerts.filter((a) => a.metric_type === metricType)
                      const hasAlert = metricAlerts.length > 0
                      const hasCritical = metricAlerts.some((a) => a.severity === 'critical')
                      const reading =
                        latestAggregateForMetric(metricRows, zoneId, metricType) ??
                        latestReadingForMetric(popupAlerts, metricType)
                      const unit = METRIC_UNITS[metricType] || ''
                      return (
                        <li
                          key={metricType}
                          className={`operator-map-popup__metric-row ${hasAlert ? 'operator-map-popup__metric-row--alert' : ''} ${hasCritical ? 'operator-map-popup__metric-row--critical' : ''}`}
                        >
                          <span className="operator-map-popup__metric-name">{metricType.toUpperCase()}</span>
                          <span className="operator-map-popup__metric-reading">
                            {reading == null ? '--' : `${reading} ${unit}`.trim()}
                          </span>
                          <span className="operator-map-popup__metric-status">
                            {hasAlert ? (hasCritical ? 'CRITICAL' : 'ALERT') : 'OK'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
