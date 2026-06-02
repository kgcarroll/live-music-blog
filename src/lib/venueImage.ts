import type {VenueMapPin} from '@/lib/ticketmaster'
import {VENUE_IMAGE_VERSION} from '@/lib/venueImageVersion'
import {getSanityServerClient} from '@/sanity/lib/serverClient'
import {getSanityWriteClient} from '@/sanity/lib/writeClient'

export type VenueImageSource = 'google_places' | 'ticketmaster'

export type VenueImageRecord = {
  ticketmasterVenueId: string
  venueSlug: string | null
  venueName: string | null
  imageUrl: string | null
  imageSource: VenueImageSource | null
  googlePlaceId: string | null
  photoAttribution: string | null
  matchScore: number | null
  matchStatus: 'matched' | 'not_found' | null
  imageVersion: number | null
}

const VENUE_IMAGE_ID_PREFIX = 'venueImage-'

export function venueImageDocId(ticketmasterVenueId: string): string {
  const safe = ticketmasterVenueId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 200)
  return `${VENUE_IMAGE_ID_PREFIX}${safe}`
}

const IMAGES_BY_VENUE_IDS = `*[
  _type == "venueImage"
  && ticketmasterVenueId in $ids
]{
  ticketmasterVenueId,
  venueSlug,
  venueName,
  imageUrl,
  imageSource,
  googlePlaceId,
  photoAttribution,
  matchScore,
  matchStatus,
  imageVersion
}`

const IMAGES_BY_VENUE_IDS_WRITE = `*[
  _type == "venueImage"
  && ticketmasterVenueId in $ids
]{
  ticketmasterVenueId,
  imageVersion,
  matchStatus,
  imageUrl
}`

export async function fetchVenueImages(
  venueIds: string[],
): Promise<VenueImageRecord[]> {
  const ids = [...new Set(venueIds.map((id) => id.trim()).filter(Boolean))]
  if (!ids.length) return []

  return getSanityServerClient().fetch<VenueImageRecord[]>(IMAGES_BY_VENUE_IDS, {ids})
}

export async function loadVenueImageSnapshots(
  venueIds: string[],
): Promise<Map<string, VenueImageRecord>> {
  const writeClient = getSanityWriteClient()
  if (!writeClient || !venueIds.length) return new Map()

  const rows = await writeClient.fetch<VenueImageRecord[]>(IMAGES_BY_VENUE_IDS_WRITE, {ids: venueIds})
  return new Map(rows.map((row) => [row.ticketmasterVenueId, row]))
}

export function isVenueImageStale(
  existing: VenueImageRecord | undefined,
  force: boolean,
): boolean {
  if (force) return true
  if (!existing) return true
  if ((existing.imageVersion ?? 0) < VENUE_IMAGE_VERSION) return true
  if (!existing.imageUrl && existing.matchStatus !== 'not_found') return true
  return false
}

export function venueImageDocument(
  pin: Pick<VenueMapPin, 'id' | 'slug' | 'name'>,
  resolved: {
    imageUrl: string | null
    imageSource: VenueImageSource | null
    googlePlaceId: string | null
    photoAttribution: string | null
    matchScore: number | null
    matchStatus: 'matched' | 'not_found'
  },
) {
  const now = new Date().toISOString()
  return {
    _id: venueImageDocId(pin.id),
    _type: 'venueImage' as const,
    ticketmasterVenueId: pin.id,
    venueSlug: pin.slug,
    venueName: pin.name,
    imageUrl: resolved.imageUrl,
    imageSource: resolved.imageSource,
    googlePlaceId: resolved.googlePlaceId,
    photoAttribution: resolved.photoAttribution,
    matchScore: resolved.matchScore,
    matchStatus: resolved.matchStatus,
    imageVersion: VENUE_IMAGE_VERSION,
    resolvedAt: now,
  }
}

export async function upsertVenueImageDocuments(
  docs: ReturnType<typeof venueImageDocument>[],
): Promise<number> {
  const writeClient = getSanityWriteClient()
  if (!writeClient || docs.length === 0) return 0

  const batchSize = 25
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize)
    const transaction = writeClient.transaction()
    for (const doc of batch) {
      transaction.createOrReplace(doc)
    }
    await transaction.commit({visibility: 'async'})
  }

  return docs.length
}

/** Overlay cached venue photos onto feed pins (keeps event-poster fallback when no cache). */
export async function applyCachedVenueImages(venues: VenueMapPin[]): Promise<VenueMapPin[]> {
  if (!venues.length) return venues

  const records = await fetchVenueImages(venues.map((venue) => venue.id))
  if (!records.length) return venues

  const byId = new Map(records.map((record) => [record.ticketmasterVenueId, record]))

  return venues.map((venue) => {
    const cached = byId.get(venue.id)
    if (!cached?.imageUrl?.trim()) return venue

    return {
      ...venue,
      imageUrl: cached.imageUrl,
      imageWidth: null,
      imageHeight: null,
      imageSource: cached.imageSource ?? undefined,
      imageAttribution: cached.photoAttribution?.trim() || undefined,
    }
  })
}
