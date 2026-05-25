import type {Metadata} from 'next'
import Link from 'next/link'
import type {TypedObject} from '@portabletext/types'

import {ArticleBody} from '@/components/ArticleBody'
import {authorHref} from '@/lib/paths'
import {buildHubPageMetadata} from '@/lib/hubMetadata'
import {sanityFetch} from '@/sanity/lib/live'
import {ALL_AUTHORS, SITE_SETTINGS} from '@/sanity/lib/queries'

export async function generateMetadata(): Promise<Metadata> {
  return buildHubPageMetadata({
    title: 'Authors',
    path: '/authors',
    introKey: 'authorsHubPortable',
    fallbackDescription: 'Contributors and writers for philadelphiamusic.live.',
  })
}

type AuthorListItem = {
  _id: string
  name?: string | null
  slug?: string | null
  count?: number | null
}

export default async function AuthorsPage() {
  const [{data}, {data: settings}] = await Promise.all([
    sanityFetch({
      query: ALL_AUTHORS,
      perspective: 'published',
      stega: false,
    }),
    sanityFetch({query: SITE_SETTINGS, stega: false}),
  ])

  const authors = ((data ?? []) as AuthorListItem[]).filter(
    (author) => author.name?.trim() && author.slug?.trim(),
  )
  const intro = settings?.authorsHubPortable as TypedObject[] | null | undefined

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-zinc-50">Authors</h1>
      {intro?.length ? (
        <div className="mt-6 max-w-2xl">
          <ArticleBody value={intro} />
        </div>
      ) : (
        <p className="mt-3 max-w-2xl text-zinc-400">
          Writers and contributors across interviews, news, and reviews.
        </p>
      )}

      {authors.length ? (
        <ul className="mt-8 flex flex-wrap gap-2">
          {authors.map((author) => (
            <li key={author._id}>
              <Link
                href={authorHref(author.slug!.trim())}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 transition hover:border-amber-500/50 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
              >
                <span>{author.name?.trim()}</span>
                <span className="tabular-nums text-zinc-500">({author.count ?? 0})</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">No authors published yet.</p>
      )}
    </div>
  )
}
