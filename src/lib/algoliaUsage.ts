/** Server-only Algolia dashboard metrics (Search + Usage APIs). */

import {algoliasearch} from 'algoliasearch'

import {
  getAlgoliaAdminApiKey,
  getAlgoliaApplicationId,
  getAlgoliaPublicEnv,
  isAlgoliaSearchConfigured,
} from '@/lib/algoliaPublicEnv'

const USAGE_API_BASE = 'https://usage.algolia.com/1/usage'
const DEFAULT_PERIOD_DAYS = 30

type UsagePoint = {t?: number; v?: number}

type UsageApiResponse = Record<string, UsagePoint[] | undefined>

export type AlgoliaUsageSummary = {
  periodDays: number
  fetchedAt: string
  searchConfigured: boolean
  adminConfigured: boolean
  applicationId: string | null
  indexName: string | null
  indexExists: boolean | null
  recordCount: number | null
  dataSizeBytes: number | null
  fileSizeBytes: number | null
  indexUpdatedAt: string | null
  indexCreatedAt: string | null
  pendingTask: boolean | null
  totalIndices: number | null
  usageAvailable: boolean
  usageError: string | null
  usageKeySource: 'usage' | 'admin' | 'none'
  totalSearchOperations: number | null
  totalIndexingOperations: number | null
  dashboardUsageUrl: string
  dashboardExplorerUrl: string
  dashboardApiKeysUrl: string
}

function getUsageApiKey(): {key: string | null; source: AlgoliaUsageSummary['usageKeySource']} {
  const usage = process.env.ALGOLIA_USAGE_API_KEY?.trim()
  if (usage) return {key: usage, source: 'usage'}
  const admin = getAlgoliaAdminApiKey()
  if (admin) return {key: admin, source: 'admin'}
  return {key: null, source: 'none'}
}

function usageDateRange(periodDays: number): {startDate: string; endDate: string} {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - periodDays)
  const fmt = (d: Date) => `${d.toISOString().slice(0, 10)}T00:00:00Z`
  return {startDate: fmt(start), endDate: fmt(end)}
}

function sumUsageSeries(series: UsagePoint[] | undefined): number {
  return (series ?? []).reduce((sum, point) => sum + (point.v ?? 0), 0)
}

function dashboardUrls(appId: string | null, indexName: string | null) {
  const app = appId?.trim()
  const index = indexName?.trim()
  return {
    dashboardUsageUrl: app
      ? `https://dashboard.algolia.com/apps/${encodeURIComponent(app)}/usage`
      : 'https://dashboard.algolia.com/account/billing/usage',
    dashboardExplorerUrl:
      app && index
        ? `https://dashboard.algolia.com/apps/${encodeURIComponent(app)}/explorer/browse/${encodeURIComponent(index)}`
        : app
          ? `https://dashboard.algolia.com/apps/${encodeURIComponent(app)}/explorer`
          : 'https://dashboard.algolia.com/',
    dashboardApiKeysUrl: 'https://dashboard.algolia.com/account/api-keys',
  }
}

async function fetchUsageTotals(
  appId: string,
  apiKey: string,
  periodDays: number,
): Promise<
  | {ok: true; search: number; indexing: number}
  | {ok: false; message: string; forbidden?: boolean}
> {
  const {startDate, endDate} = usageDateRange(periodDays)
  const statistics = 'total_search_operations,total_indexing_operations'
  const params = new URLSearchParams({
    startDate,
    endDate,
    granularity: 'daily',
  })

  let response: Response
  try {
    response = await fetch(`${USAGE_API_BASE}/${statistics}?${params.toString()}`, {
      headers: {
        'x-algolia-application-id': appId,
        'x-algolia-api-key': apiKey,
      },
      cache: 'no-store',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network error'
    return {ok: false, message}
  }

  if (!response.ok) {
    let message = response.statusText
    try {
      const json = (await response.json()) as {message?: string}
      message = json.message || message
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      message,
      forbidden: response.status === 403 || response.status === 402,
    }
  }

  try {
    const json = (await response.json()) as UsageApiResponse
    return {
      ok: true,
      search: sumUsageSeries(json.total_search_operations),
      indexing: sumUsageSeries(json.total_indexing_operations),
    }
  } catch {
    return {ok: false, message: 'invalid JSON response'}
  }
}

export async function fetchAlgoliaUsageSummary(
  periodDays = DEFAULT_PERIOD_DAYS,
): Promise<AlgoliaUsageSummary> {
  const days =
    Number.isFinite(periodDays) && periodDays > 0
      ? Math.min(Math.floor(periodDays), 90)
      : DEFAULT_PERIOD_DAYS

  const {appId, indexName} = getAlgoliaPublicEnv()
  const applicationId = getAlgoliaApplicationId() || appId || null
  const adminKey = getAlgoliaAdminApiKey()
  const {key: usageKey, source: usageKeySource} = getUsageApiKey()
  const urls = dashboardUrls(applicationId, indexName || null)

  const base: AlgoliaUsageSummary = {
    periodDays: days,
    fetchedAt: new Date().toISOString(),
    searchConfigured: isAlgoliaSearchConfigured(),
    adminConfigured: Boolean(adminKey),
    applicationId: applicationId || null,
    indexName: indexName || null,
    indexExists: null,
    recordCount: null,
    dataSizeBytes: null,
    fileSizeBytes: null,
    indexUpdatedAt: null,
    indexCreatedAt: null,
    pendingTask: null,
    totalIndices: null,
    usageAvailable: false,
    usageError: null,
    usageKeySource,
    totalSearchOperations: null,
    totalIndexingOperations: null,
    ...urls,
  }

  if (!applicationId || !adminKey) {
    base.usageError = !applicationId
      ? 'Algolia application ID is not configured.'
      : 'ALGOLIA_ADMIN_API_KEY is not configured.'
    return base
  }

  try {
    const client = algoliasearch(applicationId, adminKey)
    const {items} = await client.listIndices()
    base.totalIndices = items?.length ?? 0

    const targetName = indexName?.trim()
    const index = targetName ? items?.find((item) => item.name === targetName) : items?.[0]

    if (targetName) {
      base.indexExists = Boolean(index)
    } else if (items?.length) {
      base.indexExists = true
    }

    if (index) {
      base.recordCount = index.entries ?? null
      base.dataSizeBytes = index.dataSize ?? null
      base.fileSizeBytes = index.fileSize ?? null
      base.indexUpdatedAt = index.updatedAt ?? null
      base.indexCreatedAt = index.createdAt ?? null
      base.pendingTask = index.pendingTask ?? null
    }
  } catch (error) {
    base.usageError =
      error instanceof Error ? error.message : 'Could not list Algolia indices.'
    return base
  }

  if (!usageKey) {
    base.usageError = 'No API key available for Usage API.'
    return base
  }

  const usage = await fetchUsageTotals(applicationId, usageKey, days)
  if (!usage.ok) {
    base.usageError = usage.forbidden
      ? 'Usage API requires a Usage API key (Premium) or your plan may not include it. Index stats above still apply.'
      : usage.message
    return base
  }

  base.usageAvailable = true
  base.totalSearchOperations = usage.search
  base.totalIndexingOperations = usage.indexing
  base.usageError = null

  if (usageKeySource === 'admin') {
    base.usageError =
      'Usage totals fetched with admin key. For production, set ALGOLIA_USAGE_API_KEY (Usage scope) from the Algolia dashboard.'
  }

  return base
}
