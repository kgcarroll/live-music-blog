import type {Metadata} from 'next'
import {SearchExperience} from './SearchExperience'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{q?: string | string[]}>
}

function firstQueryParam(q: string | string[] | undefined): string {
  if (q == null) return ''
  const v = Array.isArray(q) ? q[0] : q
  return typeof v === 'string' ? v : ''
}

export async function generateMetadata({searchParams}: PageProps): Promise<Metadata> {
  const sp = await searchParams
  const q = firstQueryParam(sp.q).trim()
  const title = q ? `Search — ${q.length > 48 ? `${q.slice(0, 48)}…` : q}` : 'Search'
  return {
    title,
    ...(q
      ? {
          robots: {index: false, follow: true},
        }
      : {}),
  }
}

export default async function SearchPage({searchParams}: PageProps) {
  const sp = await searchParams
  const initialQuery = firstQueryParam(sp.q)

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-50">Search</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-500">
        Articles, interviews, photos, and reviews. The URL updates after you stop typing.
      </p>
      <div className="mt-8">
        <SearchExperience initialQuery={initialQuery} />
      </div>
    </div>
  )
}
