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

function alertsForZonePopup(allAlerts, zoneId, metricTypeFilter) {
  return (allAlerts || []).filter((a) => {
    if (a.zone_id !== zoneId) return false
    if (metricTypeFilter && a.metric_type !== metricTypeFilter) return false
    return true
  })
}

export default function OperatorAlertsMap({
  /** Used for marker size / color (matches scrollable list). */
  filteredAlerts,
  /** Full list for popup “alerts in this zone” (still respects metric filter). */
  allAlerts,
  metricTypeFilter,
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
          const popupAlerts = alertsForZonePopup(allAlerts, zoneId, metricTypeFilter)
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
                  <div className="muted-copy" style={{ marginTop: 6, marginBottom: 8 }}>
                    {popupAlerts.length === 0
                      ? metricTypeFilter
                        ? 'No alerts for this zone and metric.'
                        : 'No alerts for this zone.'
                      : `${popupAlerts.length} alert${popupAlerts.length === 1 ? '' : 's'} for this zone`}
                  </div>
                  {popupAlerts.length > 0 ? (
                    <ul className="operator-map-popup__list">
                      {popupAlerts.slice(0, 12).map((a) => (
                        <li key={a.alert_id}>
                          <span className={`operator-map-popup__sev severity-${a.severity}`}>
                            {a.metric_type}
                          </span>
                          <span className="operator-map-popup__msg">{a.message}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {popupAlerts.length > 12 ? (
                    <p className="muted-copy" style={{ marginTop: 8, fontSize: 12 }}>
                      Showing first 12 — narrow filters or use the list.
                    </p>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
