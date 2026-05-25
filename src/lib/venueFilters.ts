import type {VenueMapPin} from '@/lib/ticketmaster'
import {VENUES_MAP_CENTER, VENUES_MAP_MAX_DISTANCE_MILES} from '@/lib/venues'

export type VenueWhenFilter = 'anytime' | 'week' | 'weekend'

export const VENUE_RADIUS_VALUES = [1, 2, 5, 10, 25, 50, 75] as const

export type VenueRadiusFilter = 'all' | (typeof VENUE_RADIUS_VALUES)[number]

export type VenueMapCenter = {lat: number; lng: number}

export type VenueFilterState = {
  radius: VenueRadiusFilter
  city: string
  when: VenueWhenFilter
  center: VenueMapCenter
}

export const VENUE_RADIUS_OPTIONS: {value: VenueRadiusFilter; label: string}[] = [
  {value: 'all', label: 'Any distance'},
  {value: 1, label: '1 mi'},
  {value: 2, label: '2 mi'},
  {value: 5, label: '5 mi'},
  {value: 10, label: '10 mi'},
  {value: 25, label: '25 mi'},
  {value: 50, label: '50 mi'},
  {value: 75, label: '75+ mi'},
]

export function isVenueRadiusMiles(value: number): value is Exclude<VenueRadiusFilter, 'all'> {
  return (VENUE_RADIUS_VALUES as readonly number[]).includes(value)
}

export const VENUE_WHEN_OPTIONS: {value: VenueWhenFilter; label: string}[] = [
  {value: 'anytime', label: 'Anytime'},
  {value: 'week', label: 'This week'},
  {value: 'weekend', label: 'This weekend'},
]

const EASTERN_TZ = 'America/New_York'
const CENTER_EPSILON = 0.0005

export function defaultVenueFilters(): VenueFilterState {
  return {
    radius: 'all',
    city: '',
    when: 'anytime',
    center: {...VENUES_MAP_CENTER},
  }
}

export function distanceMilesBetween(
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

function parseRadius(value: string | null): VenueRadiusFilter {
  if (!value || value === 'all') return 'all'
  const n = Number.parseInt(value, 10)
  if (isVenueRadiusMiles(n)) return n
  return 'all'
}

function parseWhen(value: string | null): VenueWhenFilter {
  if (value === 'week' || value === 'weekend') return value
  return 'anytime'
}

function parseCenter(lat: string | null, lng: string | null): VenueMapCenter {
  const parsedLat = lat != null ? Number.parseFloat(lat) : Number.NaN
  const parsedLng = lng != null ? Number.parseFloat(lng) : Number.NaN
  if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
    return {lat: parsedLat, lng: parsedLng}
  }
  return {...VENUES_MAP_CENTER}
}

export function parseVenueFiltersFromSearchParams(params: URLSearchParams): VenueFilterState {
  return {
    radius: parseRadius(params.get('radius')),
    city: params.get('city')?.trim() ?? '',
    when: parseWhen(params.get('when')),
    center: parseCenter(params.get('lat'), params.get('lng')),
  }
}

function centersMatch(a: VenueMapCenter, b: VenueMapCenter): boolean {
  return Math.abs(a.lat - b.lat) < CENTER_EPSILON && Math.abs(a.lng - b.lng) < CENTER_EPSILON
}

export function venueFiltersToSearchParams(filters: VenueFilterState): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.radius !== 'all') params.set('radius', String(filters.radius))
  if (filters.city.trim()) params.set('city', filters.city.trim())
  if (filters.when !== 'anytime') params.set('when', filters.when)
  if (!centersMatch(filters.center, VENUES_MAP_CENTER)) {
    params.set('lat', filters.center.lat.toFixed(4))
    params.set('lng', filters.center.lng.toFixed(4))
  }
  return params
}

export function venueFiltersQueryString(filters: VenueFilterState): string {
  const params = venueFiltersToSearchParams(filters)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function easternYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {timeZone: EASTERN_TZ}).format(date)
}

function parseYmd(ymd: string): {y: number; m: number; d: number} {
  const [y, m, d] = ymd.split('-').map((part) => Number.parseInt(part, 10))
  return {y, m, d}
}

function addDaysToYmd(ymd: string, days: number): string {
  const {y, m, d} = parseYmd(ymd)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return utc.toISOString().slice(0, 10)
}

function compareYmd(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function easternWeekday(date: Date): number {
  const label = new Intl.DateTimeFormat('en-US', {timeZone: EASTERN_TZ, weekday: 'short'}).format(date)
  const map: Record<string, number> = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6}
  return map[label] ?? 0
}

function isShowInThisWeek(nextShowAt: string): boolean {
  const showYmd = easternYmd(new Date(nextShowAt))
  const todayYmd = easternYmd(new Date())
  const weekEndYmd = addDaysToYmd(todayYmd, 6)
  return compareYmd(showYmd, todayYmd) >= 0 && compareYmd(showYmd, weekEndYmd) <= 0
}

function isShowThisWeekend(nextShowAt: string): boolean {
  const showDate = new Date(nextShowAt)
  const weekday = easternWeekday(showDate)
  if (weekday !== 0 && weekday !== 6) return false

  const showYmd = easternYmd(showDate)
  const todayYmd = easternYmd(new Date())
  if (compareYmd(showYmd, todayYmd) < 0) return false

  const todayWeekday = easternWeekday(new Date())

  if (todayWeekday === 6) {
    const weekendEndYmd = addDaysToYmd(todayYmd, 1)
    return compareYmd(showYmd, todayYmd) >= 0 && compareYmd(showYmd, weekendEndYmd) <= 0
  }

  if (todayWeekday === 0) {
    return showYmd === todayYmd
  }

  const daysUntilSaturday = 6 - todayWeekday
  const weekendStartYmd = addDaysToYmd(todayYmd, daysUntilSaturday)
  const weekendEndYmd = addDaysToYmd(weekendStartYmd, 1)
  return compareYmd(showYmd, weekendStartYmd) >= 0 && compareYmd(showYmd, weekendEndYmd) <= 0
}

export function venueMatchesWhenFilter(
  venue: Pick<VenueMapPin, 'nextShowAt'>,
  when: VenueWhenFilter,
): boolean {
  if (when === 'anytime') return true
  if (!venue.nextShowAt) return false
  return when === 'week' ? isShowInThisWeek(venue.nextShowAt) : isShowThisWeekend(venue.nextShowAt)
}

export function venueMatchesCityFilter(venue: Pick<VenueMapPin, 'city'>, cityQuery: string): boolean {
  const query = cityQuery.trim().toLowerCase()
  if (!query) return true
  const city = venue.city?.trim().toLowerCase() ?? ''
  return city.includes(query)
}

/** Centroid of venues whose city name matches the query (substring, case-insensitive). */
export function cityCenterFromVenues(
  venues: Pick<VenueMapPin, 'city' | 'latitude' | 'longitude'>[],
  cityQuery: string,
): VenueMapCenter | null {
  const query = cityQuery.trim().toLowerCase()
  if (!query) return null

  const matching = venues.filter((venue) => {
    const city = venue.city?.trim().toLowerCase() ?? ''
    return city.includes(query)
  })
  if (!matching.length) return null

  const lat = matching.reduce((sum, venue) => sum + venue.latitude, 0) / matching.length
  const lng = matching.reduce((sum, venue) => sum + venue.longitude, 0) / matching.length
  return {lat, lng}
}

/** Map center to use when the city filter changes; defaults to greater-Philly center when empty. */
export function mapCenterForCityFilter(cityQuery: string, venues: VenueMapPin[]): VenueMapCenter {
  const trimmed = cityQuery.trim()
  if (!trimmed) return {...VENUES_MAP_CENTER}
  return cityCenterFromVenues(venues, trimmed) ?? {...VENUES_MAP_CENTER}
}

export function venueMatchesRadiusFilter(
  venue: Pick<VenueMapPin, 'latitude' | 'longitude'>,
  center: VenueMapCenter,
  radius: VenueRadiusFilter,
): boolean {
  if (radius === 'all') return true
  return distanceMilesBetween(center.lat, center.lng, venue.latitude, venue.longitude) <= radius
}

export function filterVenues(venues: VenueMapPin[], filters: VenueFilterState): VenueMapPin[] {
  return venues.filter(
    (venue) =>
      venueMatchesRadiusFilter(venue, filters.center, filters.radius) &&
      venueMatchesCityFilter(venue, filters.city) &&
      venueMatchesWhenFilter(venue, filters.when),
  )
}

export function collectVenueCities(venues: VenueMapPin[]): string[] {
  const cities = new Set<string>()
  for (const venue of venues) {
    const city = venue.city?.trim()
    if (city) cities.add(city)
  }
  return [...cities].sort((a, b) => a.localeCompare(b))
}

export function radiusMilesForFilter(radius: VenueRadiusFilter): number | null {
  return radius === 'all' ? null : radius
}

function circleAxisDegrees(center: VenueMapCenter, radiusMiles: number) {
  const radiusKm = radiusMiles * 1.60934
  return {
    lng: radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180)),
    lat: radiusKm / 110.574,
  }
}

/** SW/NE corners for a radius circle (Mapbox fitBounds). */
export function circleBounds(
  center: VenueMapCenter,
  radiusMiles: number,
): [[number, number], [number, number]] {
  const {lng, lat} = circleAxisDegrees(center, radiusMiles)
  return [
    [center.lng - lng, center.lat - lat],
    [center.lng + lng, center.lat + lat],
  ]
}

/** GeoJSON polygon approximating a circle (for map overlay). */
export function circlePolygonGeoJson(
  center: VenueMapCenter,
  radiusMiles: number,
  points = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = []
  const {lng: distanceX, lat: distanceY} = circleAxisDegrees(center, radiusMiles)

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI)
    coords.push([center.lng + distanceX * Math.cos(theta), center.lat + distanceY * Math.sin(theta)])
  }
  coords.push(coords[0]!)

  return {
    type: 'Feature',
    properties: {},
    geometry: {type: 'Polygon', coordinates: [coords]},
  }
}

export {VENUES_MAP_MAX_DISTANCE_MILES}
