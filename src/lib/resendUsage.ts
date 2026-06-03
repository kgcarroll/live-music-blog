/** Server-only Resend metrics for the Integration Dashboard. */

import {getResendClient, getResendFromAddress} from '@/lib/newsletter/resendAudience'

const RESEND_API_BASE = 'https://api.resend.com'
const DEFAULT_PERIOD_DAYS = 30
const EMAIL_PAGE_LIMIT = 100
const MAX_EMAIL_PAGES = 50

type ResendListResponse<T> = {
  object?: string
  has_more?: boolean
  data?: T[]
}

type ResendEmailRow = {
  id?: string
  created_at?: string
  last_event?: string | null
  subject?: string | null
}

type ResendDomainRow = {
  id?: string
  name?: string
  status?: string
  region?: string
}

type ResendAudienceRow = {
  id?: string
  name?: string
}

type ResendBroadcastRow = {
  id?: string
  name?: string
  status?: string
  created_at?: string
  sent_at?: string | null
}

type ResendContactRow = {
  id?: string
  email?: string
  unsubscribed?: boolean
}

export type ResendUsageSummary = {
  periodDays: number
  fetchedAt: string
  apiKeyConfigured: boolean
  fromAddress: string | null
  usingDefaultFrom: boolean
  contactFormConfigured: boolean
  contactToEmail: string | null
  audienceIdConfigured: boolean
  configuredAudienceId: string | null
  configuredAudienceName: string | null
  domainCount: number | null
  primaryDomainName: string | null
  primaryDomainStatus: string | null
  audienceCount: number | null
  newsletterContactCount: number | null
  broadcastCount: number | null
  lastBroadcastStatus: string | null
  lastBroadcastAt: string | null
  emailsInPeriod: number | null
  emailsDelivered: number | null
  emailsBounced: number | null
  emailsFailed: number | null
  emailsOtherStatus: number | null
  lastEmailAt: string | null
  lastEmailSubject: string | null
  apiError: string | null
  dashboardEmailsUrl: string
  dashboardContactsUrl: string
  dashboardUsageUrl: string
}

function getApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null
}

function periodStartIso(periodDays: number): string {
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - periodDays)
  return start.toISOString()
}

async function resendFetch<T>(path: string): Promise<
  | {ok: true; data: T}
  | {ok: false; status: number; message: string}
> {
  const apiKey = getApiKey()
  if (!apiKey) {
    return {ok: false, status: 0, message: 'RESEND_API_KEY is not configured'}
  }

  let response: Response
  try {
    response = await fetch(`${RESEND_API_BASE}${path}`, {
      headers: {Authorization: `Bearer ${apiKey}`},
      cache: 'no-store',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network error'
    return {ok: false, status: 0, message}
  }

  if (!response.ok) {
    let message = response.statusText
    try {
      const json = (await response.json()) as {message?: string}
      message = json.message || message
    } catch {
      /* ignore */
    }
    return {ok: false, status: response.status, message}
  }

  try {
    return {ok: true, data: (await response.json()) as T}
  } catch {
    return {ok: false, status: response.status, message: 'invalid JSON response'}
  }
}

function classifyEmailEvent(lastEvent: string | null | undefined): 'delivered' | 'bounced' | 'failed' | 'other' {
  const event = lastEvent?.toLowerCase() ?? ''
  if (event.includes('deliver') || event === 'opened' || event === 'clicked') return 'delivered'
  if (event.includes('bounce')) return 'bounced'
  if (event.includes('fail') || event.includes('complain') || event === 'rejected') return 'failed'
  return 'other'
}

async function countEmailsInPeriod(periodDays: number): Promise<
  | {
      total: number
      delivered: number
      bounced: number
      failed: number
      other: number
      lastAt: string | null
      lastSubject: string | null
    }
  | {error: string}
> {
  const startIso = periodStartIso(periodDays)
  let after: string | undefined
  let total = 0
  let delivered = 0
  let bounced = 0
  let failed = 0
  let other = 0
  let lastAt: string | null = null
  let lastSubject: string | null = null
  let reachedPeriodEnd = false

  for (let page = 0; page < MAX_EMAIL_PAGES && !reachedPeriodEnd; page++) {
    const query = new URLSearchParams({limit: String(EMAIL_PAGE_LIMIT)})
    if (after) query.set('after', after)

    const result = await resendFetch<ResendListResponse<ResendEmailRow>>(`/emails?${query.toString()}`)
    if (!result.ok) return {error: result.message}

    const rows = result.data.data ?? []
    if (!rows.length) break

    for (const row of rows) {
      const createdAt = row.created_at
      if (createdAt && createdAt < startIso) {
        reachedPeriodEnd = true
        break
      }

      total += 1
      if (!lastAt && createdAt) {
        lastAt = createdAt
        lastSubject = row.subject ?? null
      }

      const bucket = classifyEmailEvent(row.last_event)
      if (bucket === 'delivered') delivered += 1
      else if (bucket === 'bounced') bounced += 1
      else if (bucket === 'failed') failed += 1
      else other += 1
    }

    if (reachedPeriodEnd || !result.data.has_more) break
    after = rows[rows.length - 1]?.id
    if (!after) break
  }

  return {total, delivered, bounced, failed, other, lastAt, lastSubject}
}

async function countContactsForAudience(audienceId: string): Promise<number | {error: string}> {
  let after: string | undefined
  let count = 0

  for (let page = 0; page < MAX_EMAIL_PAGES; page++) {
    const query = new URLSearchParams({
      audience_id: audienceId,
      limit: String(EMAIL_PAGE_LIMIT),
    })
    if (after) query.set('after', after)

    const result = await resendFetch<ResendListResponse<ResendContactRow>>(`/contacts?${query.toString()}`)
    if (!result.ok) return {error: result.message}

    const rows = result.data.data ?? []
    count += rows.length

    if (!result.data.has_more || !rows.length) break
    after = rows[rows.length - 1]?.id
    if (!after) break
  }

  return count
}

export async function fetchResendUsageSummary(
  periodDays = DEFAULT_PERIOD_DAYS,
): Promise<ResendUsageSummary> {
  const days =
    Number.isFinite(periodDays) && periodDays > 0
      ? Math.min(Math.floor(periodDays), 90)
      : DEFAULT_PERIOD_DAYS

  const apiKeyConfigured = Boolean(getApiKey())
  const fromAddress = getResendFromAddress()
  const usingDefaultFrom = !fromAddress
  const displayFrom = fromAddress || 'onboarding@resend.dev'
  const contactToEmail = process.env.CONTACT_TO_EMAIL?.trim() || null
  const configuredAudienceId = process.env.RESEND_AUDIENCE_ID?.trim() || null
  const configuredAudienceName = process.env.RESEND_AUDIENCE_NAME?.trim() || null

  const summary: ResendUsageSummary = {
    periodDays: days,
    fetchedAt: new Date().toISOString(),
    apiKeyConfigured,
    fromAddress: displayFrom,
    usingDefaultFrom,
    contactFormConfigured: Boolean(contactToEmail && apiKeyConfigured),
    contactToEmail,
    audienceIdConfigured: Boolean(configuredAudienceId),
    configuredAudienceId,
    configuredAudienceName,
    domainCount: null,
    primaryDomainName: null,
    primaryDomainStatus: null,
    audienceCount: null,
    newsletterContactCount: null,
    broadcastCount: null,
    lastBroadcastStatus: null,
    lastBroadcastAt: null,
    emailsInPeriod: null,
    emailsDelivered: null,
    emailsBounced: null,
    emailsFailed: null,
    emailsOtherStatus: null,
    lastEmailAt: null,
    lastEmailSubject: null,
    apiError: null,
    dashboardEmailsUrl: 'https://resend.com/emails',
    dashboardContactsUrl: 'https://resend.com/audiences',
    dashboardUsageUrl: 'https://resend.com/settings/usage',
  }

  if (!apiKeyConfigured) {
    summary.apiError = 'RESEND_API_KEY is not configured on the site.'
    return summary
  }

  const resend = getResendClient()
  if (!resend) {
    summary.apiError = 'Could not initialize Resend client.'
    return summary
  }

  const [domainsResult, audiencesResult, broadcastsResult, emailCounts] = await Promise.all([
    resend.domains.list(),
    resend.audiences.list(),
    resend.broadcasts.list(),
    countEmailsInPeriod(days),
  ])

  if (domainsResult.error) {
    summary.apiError = domainsResult.error.message
  } else {
    const domains = (domainsResult.data?.data ?? []) as ResendDomainRow[]
    summary.domainCount = domains.length
    const primary = domains[0]
    if (primary) {
      summary.primaryDomainName = primary.name ?? null
      summary.primaryDomainStatus = primary.status ?? null
    }
  }

  if (!audiencesResult.error) {
    const audiences = (audiencesResult.data?.data ?? []) as ResendAudienceRow[]
    summary.audienceCount = audiences.length

    const targetAudience =
      (configuredAudienceId
        ? audiences.find((row) => row.id === configuredAudienceId)
        : null) ??
      (configuredAudienceName
        ? audiences.find((row) => row.name === configuredAudienceName)
        : null) ??
      audiences[0]

    if (targetAudience?.id) {
      summary.configuredAudienceId = summary.configuredAudienceId ?? targetAudience.id
      summary.configuredAudienceName = targetAudience.name ?? summary.configuredAudienceName

      const contactCount = await countContactsForAudience(targetAudience.id)
      if (typeof contactCount === 'number') {
        summary.newsletterContactCount = contactCount
      } else if (!summary.apiError) {
        summary.apiError = contactCount.error
      }
    }
  } else if (!summary.apiError) {
    summary.apiError = audiencesResult.error.message
  }

  if (!broadcastsResult.error) {
    const broadcasts = (broadcastsResult.data?.data ?? []) as ResendBroadcastRow[]
    summary.broadcastCount = broadcasts.length
    const sorted = [...broadcasts].sort((a, b) => {
      const aTime = Date.parse(a.sent_at ?? a.created_at ?? '') || 0
      const bTime = Date.parse(b.sent_at ?? b.created_at ?? '') || 0
      return bTime - aTime
    })
    const latest = sorted[0]
    if (latest) {
      summary.lastBroadcastStatus = latest.status ?? null
      summary.lastBroadcastAt = latest.sent_at ?? latest.created_at ?? null
    }
  } else if (!summary.apiError) {
    summary.apiError = broadcastsResult.error.message
  }

  if ('error' in emailCounts) {
    if (!summary.apiError) summary.apiError = emailCounts.error
  } else {
    summary.emailsInPeriod = emailCounts.total
    summary.emailsDelivered = emailCounts.delivered
    summary.emailsBounced = emailCounts.bounced
    summary.emailsFailed = emailCounts.failed
    summary.emailsOtherStatus = emailCounts.other
    summary.lastEmailAt = emailCounts.lastAt
    summary.lastEmailSubject = emailCounts.lastSubject
  }

  return summary
}
