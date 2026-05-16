import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'

import {ArticleBody} from '@/components/ArticleBody'
import {EditorialCard, type EditorialCardItem} from '@/components/EditorialCard'
import {sanityFetch} from '@/sanity/lib/live'
import {POSTS_BY_TAG_ID, TAG_BY_SLUG, TAG_SLUGS} from '@/sanity/lib/queries'

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

  const {data: posts} = await sanityFetch({
    query: POSTS_BY_TAG_ID,
    params: {tagId: tag._id},
  })
  const items = (posts ?? []) as EditorialCardItem[]

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-50">{tag.title}</h1>
      {tag.description?.length ? (
        <div className="mt-6 max-w-3xl">
          <ArticleBody value={tag.description} />
        </div>
      ) : null}
      <div className="mt-10 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <EditorialCard key={item._id} item={item} />
        ))}
      </div>
      {!items.length ? <p className="mt-8 text-sm text-zinc-500">No published articles for this tag yet.</p> : null}
    </div>
  )
}
