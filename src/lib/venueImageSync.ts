import {
  isGooglePlacesConfigured,
  matchVenueToGooglePlace,
  type TicketmasterVenueIdentity,
} from '@/lib/googlePlaces'
import {recordGooglePlacesSyncResult} from '@/lib/googlePlacesUsage'
import {fetchVenueById, type VenueMapPin} from '@/lib/ticketmaster'
import {
  isVenueImageStale,
  loadVenueImageSnapshots,
  upsertVenueImageDocuments,
  venueImageDocument,
} from '@/lib/venueImage'

const RESOLVE_DELAY_MS = 400

export type VenueImageSyncOptions = {
  force?: boolean
  maxVenues?: number
}

export type VenueImageSyncResult = {
  venuesProcessed: number
  imagesWritten: number
  skippedNotConfigured: boolean
}

function maxVenuesPerSync(options: VenueImageSyncOptions): number {
  if (options.maxVenues != null && options.maxVenues > 0) {
    return Math.min(Math.floor(options.maxVenues), 30)
  }
  const raw = process.env.VENUE_IMAGE_SYNC_MAX_PER_RUN?.trim()
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(Math.floor(parsed), 30)
  }
  return 5
}

async function selectVenuesToProcess(
  venues: VenueMapPin[],
  options: VenueImageSyncOptions,
): Promise<VenueMapPin[]> {
  if (!venues.length) return []

  if (options.force) {
    return venues.slice(0, maxVenuesPerSync(options))
  }

  const snapshots = await loadVenueImageSnapshots(venues.map((venue) => venue.id))
  const stale = venues.filter((venue) =>
    isVenueImageStale(snapshots.get(venue.id), false),
  )

  return stale.slice(0, maxVenuesPerSync(options))
}

async function identityForVenue(pin: VenueMapPin): Promise<TicketmasterVenueIdentity> {
  const detail = await fetchVenueById(pin.id)
  const fromDetail =
    detail && detail !== 'not_configured' && detail !== 'api_error' ? detail : null

  return {
    id: pin.id,
    name: pin.name,
    addressLine1: fromDetail?.addressLine1 ?? null,
    city: pin.city ?? fromDetail?.city ?? null,
    state: pin.state ?? fromDetail?.state ?? null,
    postalCode: fromDetail?.postalCode ?? null,
    latitude: fromDetail?.latitude ?? pin.latitude,
    longitude: fromDetail?.longitude ?? pin.longitude,
  }
}

async function resolveVenueImage(pin: VenueMapPin): Promise<ReturnType<typeof venueImageDocument>> {
  const identity = await identityForVenue(pin)
  const google = await matchVenueToGooglePlace(identity)

  if (google.status === 'matched') {
    const {candidate, photoUrl} = google
    if (photoUrl) {
      return venueImageDocument(pin, {
        imageUrl: photoUrl,
        imageSource: 'google_places',
        googlePlaceId: candidate.placeId,
        photoAttribution: candidate.photoAttributions.join(', ') || null,
        matchScore: candidate.matchScore,
        matchStatus: 'matched',
      })
    }
  }

  const detail = await fetchVenueById(pin.id)
  const tmImage =
    detail && detail !== 'not_configured' && detail !== 'api_error'
      ? detail.imageUrl?.trim()
      : null

  if (tmImage) {
    return venueImageDocument(pin, {
      imageUrl: tmImage,
      imageSource: 'ticketmaster',
      googlePlaceId: null,
      photoAttribution: null,
      matchScore: null,
      matchStatus: 'matched',
    })
  }

  const bestScore =
    google.status === 'matched'
      ? google.candidate.matchScore
      : google.candidates?.[0]?.matchScore ?? null

  return venueImageDocument(pin, {
    imageUrl: null,
    imageSource: null,
    googlePlaceId: null,
    photoAttribution: null,
    matchScore: bestScore,
    matchStatus: 'not_found',
  })
}

/** Resolve Google/TM venue photos and cache in Sanity. */
export async function syncVenueImagesOnFeed(
  venues: VenueMapPin[],
  options: VenueImageSyncOptions = {},
): Promise<VenueImageSyncResult> {
  if (!isGooglePlacesConfigured()) {
    await recordGooglePlacesSyncResult({venuesProcessed: 0, imagesWritten: 0})
    return {venuesProcessed: 0, imagesWritten: 0, skippedNotConfigured: true}
  }

  const pending = await selectVenuesToProcess(venues, options)
  if (!pending.length) {
    await recordGooglePlacesSyncResult({venuesProcessed: 0, imagesWritten: 0})
    return {venuesProcessed: 0, imagesWritten: 0, skippedNotConfigured: false}
  }

  let venuesProcessed = 0
  let imagesWritten = 0

  for (const pin of pending) {
    try {
      const doc = await resolveVenueImage(pin)
      await upsertVenueImageDocuments([doc])
      imagesWritten += 1
      venuesProcessed += 1
    } catch (error) {
      console.warn(`[venueImage] Failed for ${pin.slug}:`, error)
    }

    await new Promise((resolve) => setTimeout(resolve, RESOLVE_DELAY_MS))
  }

  const result = {venuesProcessed, imagesWritten, skippedNotConfigured: false}
  await recordGooglePlacesSyncResult({
    venuesProcessed: result.venuesProcessed,
    imagesWritten: result.imagesWritten,
  })
  return result
}
