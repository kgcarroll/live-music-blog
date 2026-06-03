import {SITE_SETTINGS_DOCUMENT_ID} from '@/sanity/constants'
import {client} from '@/sanity/lib/client'
import {getSanityWriteClient} from '@/sanity/lib/writeClient'

export type MapboxLoadSource = 'venues_hub' | 'venue_detail'

export type MapboxUsageStored = {
  periodMonth?: string | null
  venuesHub?: number | null
  venueDetail?: number | null
  lastLoadAt?: string | null
  lastLoadSource?: MapboxLoadSource | null
}

export type MapboxUsageSummary = {
  tokenConfigured: boolean
  venuesMapEnabled: boolean | null
  periodMonth: string
  venuesHub: number
  venueDetail: number
  totalLoads: number
  lastLoadAt: string | null
  lastLoadSource: MapboxLoadSource | null
  writeTokenConfigured: boolean
  fetchedAt: string
}

function currentPeriodMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function normalizeUsage(
  stored: MapboxUsageStored | null | undefined,
  periodMonth: string,
): Pick<MapboxUsageSummary, 'venuesHub' | 'venueDetail' | 'lastLoadAt' | 'lastLoadSource'> {
  if (!stored || stored.periodMonth !== periodMonth) {
    return {
      venuesHub: 0,
      venueDetail: 0,
      lastLoadAt: null,
      lastLoadSource: null,
    }
  }

  return {
    venuesHub: stored.venuesHub ?? 0,
    venueDetail: stored.venueDetail ?? 0,
    lastLoadAt: stored.lastLoadAt ?? null,
    lastLoadSource: stored.lastLoadSource ?? null,
  }
}

const SITE_MAPBOX_QUERY = `*[_id == $id][0]{
  venuesMapEnabled,
  mapboxUsage
}`

export async function fetchMapboxUsageSummary(): Promise<MapboxUsageSummary> {
  const periodMonth = currentPeriodMonth()
  const row = await client.fetch<{venuesMapEnabled?: boolean | null; mapboxUsage?: MapboxUsageStored}>(
    SITE_MAPBOX_QUERY,
    {id: SITE_SETTINGS_DOCUMENT_ID},
  )

  const counts = normalizeUsage(row?.mapboxUsage, periodMonth)

  return {
    tokenConfigured: Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()),
    venuesMapEnabled: row?.venuesMapEnabled ?? null,
    periodMonth,
    ...counts,
    totalLoads: counts.venuesHub + counts.venueDetail,
    writeTokenConfigured: Boolean(process.env.SANITY_API_WRITE_TOKEN?.trim()),
    fetchedAt: new Date().toISOString(),
  }
}

export async function recordMapboxLoad(source: MapboxLoadSource): Promise<void> {
  const writeClient = getSanityWriteClient()
  if (!writeClient) {
    console.warn('[mapbox] SANITY_API_WRITE_TOKEN not set; map load not recorded.')
    return
  }

  const periodMonth = currentPeriodMonth()
  const stored = await writeClient.fetch<MapboxUsageStored | null>(
    `*[_id == $id][0].mapboxUsage`,
    {id: SITE_SETTINGS_DOCUMENT_ID},
  )

  const reset = stored?.periodMonth !== periodMonth
  const venuesHub = (reset ? 0 : (stored?.venuesHub ?? 0)) + (source === 'venues_hub' ? 1 : 0)
  const venueDetail =
    (reset ? 0 : (stored?.venueDetail ?? 0)) + (source === 'venue_detail' ? 1 : 0)

  const payload: MapboxUsageStored = {
    periodMonth,
    venuesHub,
    venueDetail,
    lastLoadAt: new Date().toISOString(),
    lastLoadSource: source,
  }

  try {
    await writeClient
      .patch(SITE_SETTINGS_DOCUMENT_ID)
      .set({mapboxUsage: payload})
      .commit({visibility: 'async'})
  } catch (error) {
    console.warn('[mapbox] Failed to persist map load:', error)
  }
}
