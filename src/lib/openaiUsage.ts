/** Server-only OpenAI Organization Usage + Costs APIs. */

const OPENAI_API_BASE = 'https://api.openai.com/v1'

const DEFAULT_PERIOD_DAYS = 30

type UsageResult = {
  input_tokens?: number
  output_tokens?: number
  num_model_requests?: number
}

type UsageBucket = {
  results?: UsageResult[]
}

type CostsResult = {
  amount?: {value?: number | string; currency?: string}
}

type CostsBucket = {
  results?: CostsResult[]
}

type PaginatedResponse<T> = {
  data?: T[]
  next_page?: string | null
}

export type OpenAIUsageSummary = {
  periodDays: number
  totalRequests: number
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalSpendUsd: number
  currency: string
  fetchedAt: string
  configured: boolean
  error?: 'not_configured' | 'forbidden' | 'api_error'
  errorMessage?: string
}

function getAdminApiKey(): string | null {
  const admin = process.env.OPENAI_ADMIN_API_KEY?.trim()
  if (admin) return admin
  return process.env.OPENAI_API_KEY?.trim() || null
}

export function isOpenAIUsageConfigured(): boolean {
  return getAdminApiKey() != null
}

async function fetchPaginatedBuckets<T extends UsageBucket | CostsBucket>(
  path: string,
  baseParams: Record<string, string | number>,
): Promise<{ok: true; buckets: T[]} | {ok: false; status: number; message: string}> {
  const key = getAdminApiKey()
  if (!key) {
    return {ok: false, status: 0, message: 'OpenAI API key is not configured'}
  }

  const buckets: T[] = []
  let page: string | undefined

  for (let guard = 0; guard < 50; guard++) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(baseParams)) {
      params.set(k, String(v))
    }
    if (page) params.set('page', page)

    let response: Response
    try {
      response = await fetch(`${OPENAI_API_BASE}${path}?${params.toString()}`, {
        headers: {Authorization: `Bearer ${key}`},
        cache: 'no-store',
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

    let json: PaginatedResponse<T>
    try {
      json = (await response.json()) as PaginatedResponse<T>
    } catch {
      return {ok: false, status: response.status, message: 'invalid JSON response'}
    }

    buckets.push(...(json.data ?? []))
    page = json.next_page ?? undefined
    if (!page) break
  }

  return {ok: true, buckets}
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function sumUsageBuckets(buckets: UsageBucket[]): {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
} {
  let totalRequests = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const bucket of buckets) {
    for (const row of bucket.results ?? []) {
      totalRequests += toFiniteNumber(row.num_model_requests)
      totalInputTokens += toFiniteNumber(row.input_tokens)
      totalOutputTokens += toFiniteNumber(row.output_tokens)
    }
  }

  return {totalRequests, totalInputTokens, totalOutputTokens}
}

function sumCostBuckets(buckets: CostsBucket[]): {totalSpendUsd: number; currency: string} {
  let totalSpendUsd = 0
  let currency = 'usd'

  for (const bucket of buckets) {
    for (const row of bucket.results ?? []) {
      const amount = row.amount
      if (amount?.value != null && amount.value !== '') {
        totalSpendUsd += toFiniteNumber(amount.value)
      }
      if (amount?.currency) currency = amount.currency
    }
  }

  return {totalSpendUsd, currency}
}

/** Organization-wide completions usage + costs for the last N days. */
export async function fetchOpenAIUsageSummary(
  periodDays = DEFAULT_PERIOD_DAYS,
): Promise<OpenAIUsageSummary> {
  const fetchedAt = new Date().toISOString()
  const key = getAdminApiKey()

  if (!key) {
    return {
      periodDays,
      totalRequests: 0,
      totalTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalSpendUsd: 0,
      currency: 'usd',
      fetchedAt,
      configured: false,
      error: 'not_configured',
      errorMessage: 'Set OPENAI_ADMIN_API_KEY (recommended) or OPENAI_API_KEY with usage read access.',
    }
  }

  const startTime = Math.floor(Date.now() / 1000) - periodDays * 24 * 60 * 60
  const limit = Math.min(Math.max(periodDays, 1), 180)

  const usageParams = {
    start_time: startTime,
    bucket_width: '1d',
    limit,
  }

  const costsParams = {
    start_time: startTime,
    bucket_width: '1d',
    limit,
  }

  const [usage, costs] = await Promise.all([
    fetchPaginatedBuckets<UsageBucket>('/organization/usage/completions', usageParams),
    fetchPaginatedBuckets<CostsBucket>('/organization/costs', costsParams),
  ])

  if (!usage.ok) {
    const error =
      usage.status === 401 || usage.status === 403
        ? 'forbidden'
        : usage.status === 0
          ? 'not_configured'
          : 'api_error'
    return {
      periodDays,
      totalRequests: 0,
      totalTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalSpendUsd: 0,
      currency: 'usd',
      fetchedAt,
      configured: true,
      error,
      errorMessage: usage.message,
    }
  }

  const {totalRequests, totalInputTokens, totalOutputTokens} = sumUsageBuckets(usage.buckets)

  let totalSpendUsd = 0
  let currency = 'usd'
  if (costs.ok) {
    const summed = sumCostBuckets(costs.buckets)
    totalSpendUsd = summed.totalSpendUsd
    currency = summed.currency
  }

  return {
    periodDays,
    totalRequests,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalInputTokens,
    totalOutputTokens,
    totalSpendUsd,
    currency,
    fetchedAt,
    configured: true,
    error: costs.ok ? undefined : 'api_error',
    errorMessage: costs.ok ? undefined : costs.message,
  }
}
