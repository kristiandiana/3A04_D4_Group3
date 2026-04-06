/** Approximate GTA coords for demo zones (lat, lng). */
export const ZONE_COORDINATES = {
  'zone-north': [43.762, -79.383],
  'zone-central': [43.647, -79.383],
}

export const DEFAULT_MAP_CENTER = [43.705, -79.383]

export const MAP_DEFAULT_ZOOM = 10

/** Zones we always show on the map even with no open alerts. */
export const ZONE_IDS_KNOWN = Object.keys(ZONE_COORDINATES)

export function coordinatesForZone(zoneId) {
  if (ZONE_COORDINATES[zoneId]) {
    return ZONE_COORDINATES[zoneId]
  }
  const h =
    typeof zoneId === 'string'
      ? zoneId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
      : 0
  const dLat = ((h % 17) - 8) * 0.012
  const dLng = ((h % 23) - 11) * 0.012
  return [DEFAULT_MAP_CENTER[0] + dLat, DEFAULT_MAP_CENTER[1] + dLng]
}
