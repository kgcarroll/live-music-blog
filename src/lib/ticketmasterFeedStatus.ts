import {SCHEDULE_REVALIDATE_SECONDS} from '@/lib/schedule'
import {SITE_SETTINGS_DOCUMENT_ID} from '@/sanity/constants'
import {getSanityWriteClient} from '@/sanity/lib/writeClient'

export type TicketmasterFeedStatusError = 'not_configured' | 'api_error' | 'rate_limit'

export type TicketmasterFeedStatus = {
  lastAttemptAt: string
  lastSuccessAt?: string | null
  lastError?: TicketmasterFeedStatusError | null
  lastHttpStatus?: number | null
  eventCount?: number | null
  venueCount?: number | null
  pagesFetched?: number | null
  apiKeyFingerprint?: string | null
  dmaId?: string | null
}

export type TicketmasterFeedStatusInput = {
  lastAttemptAt: string
  lastSuccessAt?: string | null
  lastError?: TicketmasterFeedStatusError | null
  lastHttpStatus?: number | null
  eventCount?: number | null
  venueCount?: number | null
  pagesFetched?: number | null
  apiKeyFingerprint?: string | null
  dmaId?: string | null
}

export function isRateLimitedStatus(status: TicketmasterFeedStatus | null | undefined): boolean {
  if (!status) return false
  return status.lastError === 'rate_limit' || status.lastHttpStatus === 429
}

export function cacheExpiresAt(lastSuccessAt: string | null | undefined): Date | null {
  if (!lastSuccessAt) return null
  const base = Date.parse(lastSuccessAt)
  if (Number.isNaN(base)) return null
  return new Date(base + SCHEDULE_REVALIDATE_SECONDS * 1000)
}

export function formatStatusWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export async function persistTicketmasterFeedStatus(input: TicketmasterFeedStatusInput): Promise<void> {
  const writeClient = getSanityWriteClient()
  if (!writeClient) {
    console.warn('[ticketmaster] SANITY_API_WRITE_TOKEN not set; feed status not saved to Site Settings.')
    return
  }

  const payload: TicketmasterFeedStatus = {
    lastAttemptAt: input.lastAttemptAt,
    lastSuccessAt: input.lastSuccessAt ?? null,
    lastError: input.lastError ?? null,
    lastHttpStatus: input.lastHttpStatus ?? null,
    eventCount: input.eventCount ?? null,
    venueCount: input.venueCount ?? null,
    pagesFetched: input.pagesFetched ?? null,
    apiKeyFingerprint: input.apiKeyFingerprint ?? null,
    dmaId: input.dmaId ?? null,
  }

  try {
    await writeClient
      .patch(SITE_SETTINGS_DOCUMENT_ID)
      .set({ticketmasterFeedStatus: payload})
      .commit({visibility: 'async'})
  } catch (error) {
    console.warn('[ticketmaster] Failed to persist feed status to Site Settings:', error)
  }
}
