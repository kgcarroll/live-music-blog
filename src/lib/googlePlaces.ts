/** Server-only Google Places API (New) — venue lookup + photo fetch. */

import {recordGooglePlacesRequest} from '@/lib/googlePlacesUsage'

const PLACES_API_BASE = 'https://places.googleapis.com/v1'

const VENUE_TYPE_BONUS = new Set([
  'night_club',
  'bar',
  'stadium',
  'performing_arts_theater',
  'event_venue',
  'concert_hall',
  'live_music_venue',
  'amphitheatre',
])

/** Minimum score to accept a Google match (see scorePlaceCandidate). */
export const GOOGLE_PLACE_MATCH_THRESHOLD = 50

export type TicketmasterVenueIdentity = {
  id: string
  name: string
  addressLine1?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  latitude: number
  longitude: number
}

export type GooglePlaceCandidate = {
  placeId: string
  displayName: string
  formattedAddress: string | null
  latitude: number | null
  longitude: number | null
  types: string[]
  businessStatus: string | null
  photoCount: number
  firstPhotoName: string | null
  photoAttributions: string[]
  matchScore: number
  distanceMeters: number | null
}

export type GooglePlaceMatchResult =
  | {
      status: 'matched'
      candidate: GooglePlaceCandidate
      photoUrl: string | null
    }
  | {
      status: 'not_found' | 'not_configured' | 'api_error'
      candidates?: GooglePlaceCandidate[]
      message?: string
    }

function getApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim()
  return key || null
}

export function isGooglePlacesConfigured(): boolean {
  return getApiKey() != null
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(the|at|in)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function nameSimilarityScore(tmName: string, googleName: string): number {
  const a = normalizeName(tmName)
  const b = normalizeName(googleName)
  if (!a || !b) return 0
  if (a === b) return 30

  const aTokens = new Set(a.split(' ').filter(Boolean))
  const bTokens = new Set(b.split(' ').filter(Boolean))
  if (!aTokens.size || !bTokens.size) return 0

  let overlap = 0
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1
  }
  const union = new Set([...aTokens, ...bTokens]).size
  const jaccard = overlap / union
  return Math.round(jaccard * 30)
}

function addressMatchScore(
  tm: TicketmasterVenueIdentity,
  formattedAddress: string | null,
): number {
  if (!formattedAddress?.trim()) return 0
  const hay = formattedAddress.toLowerCase()
  let score = 0
  if (tm.postalCode?.trim() && hay.includes(tm.postalCode.trim().toLowerCase())) {
    score += 10
  }
  if (tm.addressLine1?.trim()) {
    const street = tm.addressLine1.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    const streetNum = street.split(/\s+/)[0]
    if (streetNum && hay.includes(streetNum)) score += 5
    if (street.length > 6 && hay.includes(street.slice(0, 12))) score += 5
  }
  return Math.min(score, 20)
}

function distanceScore(meters: number | null): number {
  if (meters == null) return 0
  if (meters < 100) return 40
  if (meters < 300) return 25
  if (meters < 1000) return 10
  return 0
}

function typeScore(types: string[]): number {
  return types.some((t) => VENUE_TYPE_BONUS.has(t)) ? 10 : 0
}

export function scorePlaceCandidate(
  tm: TicketmasterVenueIdentity,
  candidate: Omit<GooglePlaceCandidate, 'matchScore' | 'distanceMeters'>,
  distanceMetersValue: number | null,
): number {
  if (candidate.businessStatus === 'CLOSED_PERMANENTLY') return -1
  return (
    distanceScore(distanceMetersValue) +
    nameSimilarityScore(tm.name, candidate.displayName) +
    addressMatchScore(tm, candidate.formattedAddress) +
    typeScore(candidate.types)
  )
}

type PlacesPhoto = {
  name?: string
  widthPx?: number
  heightPx?: number
  authorAttributions?: {displayName?: string}[]
}

type PlacesSearchResult = {
  id?: string
  displayName?: {text?: string}
  formattedAddress?: string
  location?: {latitude?: number; longitude?: number}
  types?: string[]
  businessStatus?: string
  photos?: PlacesPhoto[]
}

type SearchTextResponse = {
  places?: PlacesSearchResult[]
  error?: {message?: string}
}

function candidateFromPlace(
  place: PlacesSearchResult,
  tm: TicketmasterVenueIdentity,
): GooglePlaceCandidate | null {
  const placeId = place.id?.trim()
  const displayName = place.displayName?.text?.trim()
  if (!placeId || !displayName) return null

  const lat = place.location?.latitude ?? null
  const lng = place.location?.longitude ?? null
  const dist =
    lat != null && lng != null
      ? distanceMeters(tm.latitude, tm.longitude, lat, lng)
      : null

  const photos = place.photos ?? []
  const firstPhoto = photos[0]
  const attributions =
    firstPhoto?.authorAttributions
      ?.map((a) => a.displayName?.trim())
      .filter((name): name is string => Boolean(name)) ?? []

  const base = {
    placeId,
    displayName,
    formattedAddress: place.formattedAddress?.trim() || null,
    latitude: lat,
    longitude: lng,
    types: place.types ?? [],
    businessStatus: place.businessStatus?.trim() || null,
    photoCount: photos.length,
    firstPhotoName: firstPhoto?.name?.trim() || null,
    photoAttributions: attributions,
  }

  return {
    ...base,
    distanceMeters: dist,
    matchScore: scorePlaceCandidate(tm, base, dist),
  }
}

async function placesFetch<T>(
  path: string,
  init: RequestInit & {fieldMask?: string},
): Promise<{ok: true; data: T} | {ok: false; status: number; message: string}> {
  const key = getApiKey()
  if (!key) {
    return {ok: false, status: 0, message: 'GOOGLE_PLACES_API_KEY is not set'}
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': key,
  }
  if (init.fieldMask) {
    headers['X-Goog-FieldMask'] = init.fieldMask
  }

  let response: Response
  try {
    response = await fetch(`${PLACES_API_BASE}${path}`, {
      ...init,
      headers: {...headers, ...(init.headers as Record<string, string> | undefined)},
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network error'
    return {ok: false, status: 0, message}
  }

  if (!response.ok) {
    let message = response.statusText
    try {
      const json = (await response.json()) as {error?: {message?: string}}
      message = json.error?.message || message
    } catch {
      /* ignore */
    }
    return {ok: false, status: response.status, message}
  }

  try {
    const data = (await response.json()) as T
    return {ok: true, data}
  } catch {
    return {ok: false, status: response.status, message: 'invalid JSON response'}
  }
}

function buildTextQuery(tm: TicketmasterVenueIdentity): string {
  const parts = [tm.name]
  if (tm.addressLine1?.trim()) parts.push(tm.addressLine1.trim())
  if (tm.city?.trim()) parts.push(tm.city.trim())
  if (tm.state?.trim()) parts.push(tm.state.trim())
  return parts.join(', ')
}

export async function searchGooglePlaceCandidates(
  tm: TicketmasterVenueIdentity,
): Promise<
  | {candidates: GooglePlaceCandidate[]}
  | {error: 'not_configured' | 'api_error'; message: string}
> {
  const textQuery = buildTextQuery(tm)
  const result = await placesFetch<SearchTextResponse>('/places:searchText', {
    method: 'POST',
    fieldMask:
      'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.businessStatus,places.photos',
    body: JSON.stringify({
      textQuery,
      locationBias: {
        circle: {
          center: {latitude: tm.latitude, longitude: tm.longitude},
          radius: 1000,
        },
      },
      maxResultCount: 5,
    }),
  })

  if (!result.ok) {
    if (result.status !== 0) {
      await recordGooglePlacesRequest('api_error')
    }
    const code = result.status === 0 ? 'not_configured' : 'api_error'
    return {error: code, message: result.message}
  }

  await recordGooglePlacesRequest('text_search')

  const candidates = (result.data.places ?? [])
    .map((place) => candidateFromPlace(place, tm))
    .filter((c): c is GooglePlaceCandidate => c != null)
    .sort((a, b) => b.matchScore - a.matchScore)

  return {candidates}
}

export async function fetchGooglePlacePhotoUrl(
  photoName: string,
  maxWidthPx = 1200,
): Promise<string | null | 'not_configured' | 'api_error'> {
  const key = getApiKey()
  if (!key) return 'not_configured'

  const params = new URLSearchParams({
    maxWidthPx: String(maxWidthPx),
    skipHttpRedirect: 'true',
    key,
  })

  let response: Response
  try {
    response = await fetch(
      `${PLACES_API_BASE}/${photoName}/media?${params.toString()}`,
    )
  } catch {
    return 'api_error'
  }

  if (!response.ok) {
    await recordGooglePlacesRequest('api_error')
    return 'api_error'
  }

  await recordGooglePlacesRequest('place_photo')

  try {
    const json = (await response.json()) as {photoUri?: string}
    return json.photoUri?.trim() || null
  } catch {
    await recordGooglePlacesRequest('api_error')
    return 'api_error'
  }
}

export async function matchVenueToGooglePlace(
  tm: TicketmasterVenueIdentity,
): Promise<GooglePlaceMatchResult> {
  const search = await searchGooglePlaceCandidates(tm)
  if ('error' in search) {
    return {status: search.error, message: search.message, candidates: []}
  }

  const {candidates} = search
  if (!candidates.length) {
    return {status: 'not_found', candidates, message: 'No Google Places results'}
  }

  const best = candidates[0]!
  if (best.matchScore < GOOGLE_PLACE_MATCH_THRESHOLD) {
    return {
      status: 'not_found',
      candidates,
      message: `Best score ${best.matchScore} below threshold ${GOOGLE_PLACE_MATCH_THRESHOLD}`,
    }
  }

  if (!best.firstPhotoName) {
    return {
      status: 'not_found',
      candidates,
      message: 'Matched place has no photos',
    }
  }

  const photoUrl = await fetchGooglePlacePhotoUrl(best.firstPhotoName)
  if (photoUrl === 'not_configured' || photoUrl === 'api_error') {
    return {status: photoUrl, candidates, message: 'Photo fetch failed'}
  }

  return {
    status: 'matched',
    candidate: best,
    photoUrl,
  }
}
