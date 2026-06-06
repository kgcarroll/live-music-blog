import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import Link from 'next/link'
import type {TypedObject} from '@portabletext/types'
import {Suspense} from 'react'

import {ArticleBody} from '@/components/ArticleBody'
import {ListingEditorialFeed} from '@/components/ListingEditorialFeed'
import {fetchTagEditorialThroughPage} from '@/app/(site)/listingEditorialActions'
import {parseListPageParam} from '@/lib/listPagination'
import {sanityFetch} from '@/sanity/lib/live'
import {TAG_BY_SLUG, TAG_SLUGS} from '@/sanity/lib/queries'

type Props = {
  params: Promise<{slug: string}>
  searchParams: Promise<{page?: string}>
}

type TagHub = {
  _id: string
  title?: string | null
  slug?: string | null
  description?: TypedObject[] | null
}

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: TAG_SLUGS,
    perspective: 'published',
    stega: false,
  })
  return (data || []).map((row: {slug: string}) => ({slug: row.slug}))
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const {data} = await sanityFetch({
    query: TAG_BY_SLUG,
    params: {slug},
    stega: false,
  })
  const tag = (data ?? null) as TagHub | null
  if (!tag?.title) return {title: 'Not found'}
  return {
    title: tag.title,
    description: `Articles tagged ${tag.title}.`,
  }
}

export default async function TagHubPage({params, searchParams}: Props) {
  const {slug} = await params
  const {page: pageParam} = await searchParams
  const listPage = parseListPageParam(pageParam)

  const {data} = await sanityFetch({
    query: TAG_BY_SLUG,
    params: {slug},
  })
  const tag = (data ?? null) as TagHub | null
  if (!tag?._id || !tag.slug) notFound()

  const {items, hasMore} = await fetchTagEditorialThroughPage(tag._id, listPage)

  return (
    <div>
      <p className="mb-3">
        <Link
          href="/tags"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-300/90 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          <span aria-hidden="true">←</span>
          All tags
        </Link>
      </p>
      <h1 className="text-3xl font-bold text-zinc-50">{tag.title}</h1>
      {tag.description?.length ? (
        <div className="mt-6 max-w-3xl">
          <ArticleBody value={tag.description} />
        </div>
      ) : null}
      <Suspense fallback={null}>
        <ListingEditorialFeed
          mode="tag"
          tagId={tag._id}
          initialItems={items}
          initialHasMore={hasMore}
          initialPage={listPage}
          emptyMessage="No published articles for this tag yet."
        />
      </Suspense>
    </div>
  )
}
