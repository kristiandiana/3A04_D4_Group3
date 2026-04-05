/** Static zone → lat/lng near GTA until a geo API exists. */
export const ZONE_COORDINATES = {
  'zone-north': [43.76, -79.41],
  'zone-central': [43.65, -79.38],
}

export const GTA_DEFAULT_CENTER = [43.65, -79.38]

export function coordinatesForZone(zoneId) {
  return ZONE_COORDINATES[zoneId] ?? GTA_DEFAULT_CENTER
}
