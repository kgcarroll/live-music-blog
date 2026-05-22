/** Map defaults for /venues (greater Philadelphia). */
export const VENUES_MAP_CENTER = {lng: -75.1652, lat: 39.9526} as const

/** Fixed zoom on load (Mapbox; higher = closer). */
export const VENUES_MAP_ZOOM = 11

/** Map panel height on /venues. */
export const VENUES_MAP_HEIGHT_CLASS = 'h-[min(52vh,400px)]'

/**
 * Rough tri-state box around Philly. Drops bad Ticketmaster coordinates (e.g. Europe)
 * that still appear on DMA-tagged events.
 */
export const VENUES_MAP_BOUNDS = {
  minLat: 38.4,
  maxLat: 41.35,
  minLng: -77.2,
  maxLng: -73.8,
} as const

/** Max distance from center for a pin (miles). ~85 includes AC / Lehigh Valley edges. */
export const VENUES_MAP_MAX_DISTANCE_MILES = 85

function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export type VenueCoordinates = {latitude: number; longitude: number}

export function isVenueWithinMapRegion(venue: VenueCoordinates): boolean {
  const {minLat, maxLat, minLng, maxLng} = VENUES_MAP_BOUNDS
  if (venue.latitude < minLat || venue.latitude > maxLat) return false
  if (venue.longitude < minLng || venue.longitude > maxLng) return false
  if (venue.longitude > -65) return false
  return (
    distanceMiles(
      VENUES_MAP_CENTER.lat,
      VENUES_MAP_CENTER.lng,
      venue.latitude,
      venue.longitude,
    ) <= VENUES_MAP_MAX_DISTANCE_MILES
  )
}

/** Page size when scanning events to build the venue list (Ticketmaster max is 200). */
export const VENUES_EVENT_FETCH_SIZE = 200

/** Cap Discovery API pagination when deduping venues from upcoming events. */
export const VENUES_MAX_EVENT_PAGES = 20
