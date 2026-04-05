import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { coordinatesForZone, GTA_DEFAULT_CENTER } from './zoneCoordinates.js'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export default function AlertDashboardMap({ alerts }) {
  const center = GTA_DEFAULT_CENTER
  const list = Array.isArray(alerts) ? alerts : []

  return (
    <div style={{ height: 320, width: '100%' }}>
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {list.map((alert) => {
          const pos = coordinatesForZone(alert.zone_id)
          return (
            <Marker key={alert.alert_id} position={pos}>
              <Popup>
                <div>
                  <strong>Alert #{alert.alert_id}</strong>
                  <div>Zone: {alert.zone_id}</div>
                  <div>
                    {alert.metric_type}: {alert.current_value} (threshold {alert.threshold})
                  </div>
                  <div>Severity: {alert.severity}</div>
                  <div>Status: {alert.status}</div>
                  <div>{alert.message}</div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
