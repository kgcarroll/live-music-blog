import {SITE_SETTINGS_DOCUMENT_ID} from '@/sanity/constants'
import {getSanityServerClient} from '@/sanity/lib/serverClient'
import {getSanityWriteClient} from '@/sanity/lib/writeClient'

export type GooglePlacesRequestKind = 'text_search' | 'place_photo' | 'api_error'

export type GooglePlacesUsageStored = {
  periodMonth?: string | null
  textSearch?: number | null
  placePhoto?: number | null
  apiErrors?: number | null
  lastRequestAt?: string | null
  lastRequestKind?: GooglePlacesRequestKind | null
  lastSyncAt?: string | null
  lastSyncVenuesProcessed?: number | null
  lastSyncImagesWritten?: number | null
}

export type GooglePlacesUsageSummary = {
  keyConfigured: boolean
  writeTokenConfigured: boolean
  periodMonth: string
  textSearch: number
  placePhoto: number
  apiErrors: number
  totalRequests: number
  lastRequestAt: string | null
  lastRequestKind: GooglePlacesRequestKind | null
  lastSyncAt: string | null
  lastSyncVenuesProcessed: number | null
  lastSyncImagesWritten: number | null
  googleCloudApisUrl: string
  googleCloudBillingUrl: string
  fetchedAt: string
}

function currentPeriodMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function emptyMonthBase(periodMonth: string): GooglePlacesUsageStored {
  return {
    periodMonth,
    textSearch: 0,
    placePhoto: 0,
    apiErrors: 0,
    lastRequestAt: null,
    lastRequestKind: null,
    lastSyncAt: null,
    lastSyncVenuesProcessed: null,
    lastSyncImagesWritten: null,
  }
}

function normalizeStored(
  stored: GooglePlacesUsageStored | null | undefined,
  periodMonth: string,
): GooglePlacesUsageStored {
  if (!stored || stored.periodMonth !== periodMonth) {
    return emptyMonthBase(periodMonth)
  }
  return {
    periodMonth,
    textSearch: stored.textSearch ?? 0,
    placePhoto: stored.placePhoto ?? 0,
    apiErrors: stored.apiErrors ?? 0,
    lastRequestAt: stored.lastRequestAt ?? null,
    lastRequestKind: stored.lastRequestKind ?? null,
    lastSyncAt: stored.lastSyncAt ?? null,
    lastSyncVenuesProcessed: stored.lastSyncVenuesProcessed ?? null,
    lastSyncImagesWritten: stored.lastSyncImagesWritten ?? null,
  }
}

export function googleCloudConsoleUrls(): {apis: string; billing: string} {
  const project = process.env.GOOGLE_CLOUD_PROJECT_ID?.trim()
  const projectParam = project ? `?project=${encodeURIComponent(project)}` : ''
  return {
    apis: `https://console.cloud.google.com/apis/dashboard${projectParam}`,
    billing: `https://console.cloud.google.com/billing${projectParam}`,
  }
}

const SITE_GOOGLE_PLACES_QUERY = `*[_id == $id][0].googlePlacesUsage`

/** Serialize read-modify-write patches so concurrent API calls do not overwrite counts. */
let usagePatchQueue: Promise<void> = Promise.resolve()

function enqueueGooglePlacesUsagePatch(
  update: (current: GooglePlacesUsageStored) => GooglePlacesUsageStored,
): Promise<void> {
  const run = usagePatchQueue.then(() => patchGooglePlacesUsage(update))
  usagePatchQueue = run.catch(() => {
    /* keep queue alive after a failed patch */
  })
  return run
}

async function patchGooglePlacesUsage(
  update: (current: GooglePlacesUsageStored) => GooglePlacesUsageStored,
): Promise<void> {
  const writeClient = getSanityWriteClient()
  if (!writeClient) {
    console.warn('[googlePlaces] SANITY_API_WRITE_TOKEN not set; usage not recorded.')
    return
  }

  const periodMonth = currentPeriodMonth()
  const stored = await writeClient.fetch<GooglePlacesUsageStored | null>(SITE_GOOGLE_PLACES_QUERY, {
    id: SITE_SETTINGS_DOCUMENT_ID,
  })

  const payload = update(normalizeStored(stored, periodMonth))

  try {
    await writeClient
      .patch(SITE_SETTINGS_DOCUMENT_ID)
      .set({googlePlacesUsage: payload})
      .commit()
  } catch (error) {
    console.warn('[googlePlaces] Failed to persist usage:', error)
  }
}

/** Record one outbound Places API (New) request from server code. */
export async function recordGooglePlacesRequest(kind: GooglePlacesRequestKind): Promise<void> {
  await enqueueGooglePlacesUsagePatch((base) => ({
    ...base,
    textSearch: (base.textSearch ?? 0) + (kind === 'text_search' ? 1 : 0),
    placePhoto: (base.placePhoto ?? 0) + (kind === 'place_photo' ? 1 : 0),
    apiErrors: (base.apiErrors ?? 0) + (kind === 'api_error' ? 1 : 0),
    lastRequestAt: new Date().toISOString(),
    lastRequestKind: kind,
  }))
}

/** Record the outcome of a venue image sync batch (feed or script). */
export async function recordGooglePlacesSyncResult(result: {
  venuesProcessed: number
  imagesWritten: number
}): Promise<void> {
  await enqueueGooglePlacesUsagePatch((base) => ({
    ...base,
    lastSyncAt: new Date().toISOString(),
    lastSyncVenuesProcessed: result.venuesProcessed,
    lastSyncImagesWritten: result.imagesWritten,
  }))
}

export async function fetchGooglePlacesUsageSummary(): Promise<GooglePlacesUsageSummary> {
  const periodMonth = currentPeriodMonth()
  const stored = await getSanityServerClient().fetch<GooglePlacesUsageStored | null>(
    SITE_GOOGLE_PLACES_QUERY,
    {id: SITE_SETTINGS_DOCUMENT_ID},
  )

  const counts = normalizeStored(stored, periodMonth)
  const urls = googleCloudConsoleUrls()

  return {
    keyConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim()),
    writeTokenConfigured: Boolean(process.env.SANITY_API_WRITE_TOKEN?.trim()),
    periodMonth,
    textSearch: counts.textSearch ?? 0,
    placePhoto: counts.placePhoto ?? 0,
    apiErrors: counts.apiErrors ?? 0,
    totalRequests: (counts.textSearch ?? 0) + (counts.placePhoto ?? 0),
    lastRequestAt: counts.lastRequestAt ?? null,
    lastRequestKind: counts.lastRequestKind ?? null,
    lastSyncAt: counts.lastSyncAt ?? null,
    lastSyncVenuesProcessed: counts.lastSyncVenuesProcessed ?? null,
    lastSyncImagesWritten: counts.lastSyncImagesWritten ?? null,
    googleCloudApisUrl: urls.apis,
    googleCloudBillingUrl: urls.billing,
    fetchedAt: new Date().toISOString(),
  }
}
