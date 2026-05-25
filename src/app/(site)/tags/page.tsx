import type {Metadata} from 'next'
import Link from 'next/link'
import type {TypedObject} from '@portabletext/types'

import {ArticleBody} from '@/components/ArticleBody'
import {buildHubPageMetadata} from '@/lib/hubMetadata'
import {tagHref} from '@/lib/paths'
import {sanityFetch} from '@/sanity/lib/live'
import {ALL_TAGS, SITE_SETTINGS} from '@/sanity/lib/queries'

export async function generateMetadata(): Promise<Metadata> {
  return buildHubPageMetadata({
    title: 'Tags',
    path: '/tags',
    introKey: 'tagsHubPortable',
    fallbackDescription: 'Browse articles by topic on philadelphiamusic.live.',
  })
}

type TagListItem = {
  _id: string
  title?: string | null
  slug?: string | null
  count?: number | null
}

export default async function TagsPage() {
  const [{data}, {data: settings}] = await Promise.all([
    sanityFetch({
      query: ALL_TAGS,
      perspective: 'published',
      stega: false,
    }),
    sanityFetch({query: SITE_SETTINGS, stega: false}),
  ])

  const tags = ((data ?? []) as TagListItem[]).filter((tag) => tag.title?.trim() && tag.slug?.trim())
  const intro = settings?.tagsHubPortable as TypedObject[] | null | undefined

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-zinc-50">Tags</h1>
      {intro?.length ? (
        <div className="mt-6 max-w-2xl">
          <ArticleBody value={intro} />
        </div>
      ) : (
        <p className="mt-3 max-w-2xl text-zinc-400">
          Browse interviews, news, and reviews by topic.
        </p>
      )}

      {tags.length ? (
        <ul className="mt-8 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag._id}>
              <Link
                href={tagHref(tag.slug!.trim())}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 transition hover:border-amber-500/50 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
              >
                <span>{tag.title?.trim()}</span>
                <span className="tabular-nums text-zinc-500">({tag.count ?? 0})</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">No tags published yet.</p>
      )}
    </div>
  )
}
