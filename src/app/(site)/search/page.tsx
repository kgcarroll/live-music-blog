import type {Metadata} from 'next'

import {SearchPageView} from './SearchPageView'

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

/** Server shell only — search UI is client-only so URL sync does not re-run this page in a loop. */
export default function SearchPage() {
  return <SearchPageView />
}
