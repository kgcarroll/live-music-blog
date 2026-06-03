import {unstable_cache} from 'next/cache'
import {NextResponse} from 'next/server'

import {fetchOpenAIUsageSummary} from '@/lib/openaiUsage'
import {siteOrigin} from '@/lib/siteUrl'

function isSameOriginRequest(request: Request): boolean {
  const allowed = siteOrigin()
  const origin = request.headers.get('origin')?.trim()
  if (origin && (origin === allowed || origin.startsWith(`${allowed}/`))) return true

  const referer = request.headers.get('referer')?.trim()
  if (referer && (referer === allowed || referer.startsWith(`${allowed}/`))) return true

  if (process.env.NODE_ENV === 'development') return true

  return false
}

const getCachedOpenAIUsageSummary = unstable_cache(
  async (periodDays: number) => fetchOpenAIUsageSummary(periodDays),
  ['studio-openai-usage-summary'],
  {revalidate: 300, tags: ['openai-usage']},
)

/** OpenAI organization usage totals for the Integration Dashboard (Studio only). */
export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403})
  }

  const url = new URL(request.url)
  const daysParam = url.searchParams.get('days')
  const parsed = daysParam ? Number(daysParam) : NaN
  const periodDays =
    Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 180) : 30

  const refresh = url.searchParams.get('refresh') === '1'
  const summary = refresh
    ? await fetchOpenAIUsageSummary(periodDays)
    : await getCachedOpenAIUsageSummary(periodDays)

  return NextResponse.json(summary)
}
