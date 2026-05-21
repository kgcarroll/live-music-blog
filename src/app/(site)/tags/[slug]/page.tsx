import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'

import {ArticleBody} from '@/components/ArticleBody'
import {ListingEditorialFeed} from '@/components/ListingEditorialFeed'
import type {EditorialCardItem} from '@/components/EditorialCard'
import {TAG_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {sanityFetch} from '@/sanity/lib/live'
import {POSTS_BY_TAG_ID_PAGE, TAG_BY_SLUG, TAG_SLUGS} from '@/sanity/lib/queries'

type Props = {params: Promise<{slug: string}>}

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

export default async function TagHubPage({params}: Props) {
  const {slug} = await params
  const {data} = await sanityFetch({
    query: TAG_BY_SLUG,
    params: {slug},
  })
  const tag = (data ?? null) as TagHub | null
  if (!tag?._id || !tag.slug) notFound()

  const {data: rows} = await sanityFetch({
    query: POSTS_BY_TAG_ID_PAGE,
    params: {tagId: tag._id, start: 0, end: TAG_EDITORIAL_PAGE_SIZE + 1},
  })

  const items = ((rows ?? []) as EditorialCardItem[]).slice(0, TAG_EDITORIAL_PAGE_SIZE)
  const hasMore = (rows ?? []).length > TAG_EDITORIAL_PAGE_SIZE

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-50">{tag.title}</h1>
      {tag.description?.length ? (
        <div className="mt-6 max-w-3xl">
          <ArticleBody value={tag.description} />
        </div>
      ) : null}
      <ListingEditorialFeed
        mode="tag"
        tagId={tag._id}
        initialItems={items}
        initialHasMore={hasMore}
        emptyMessage="No published articles for this tag yet."
      />
    </div>
  )
}
