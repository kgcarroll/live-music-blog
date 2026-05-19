import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import type {TypedObject} from '@portabletext/types'
import {ArticleBody} from '@/components/ArticleBody'
import {AuthorEditorialFeed} from '@/components/AuthorEditorialFeed'
import type {EditorialCardItem} from '@/components/EditorialCard'
import {AUTHOR_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {sanityFetch} from '@/sanity/lib/live'
import {AUTHOR_BY_SLUG, AUTHOR_SLUGS, POSTS_BY_AUTHOR_SLUG} from '@/sanity/lib/queries'

type Props = {params: Promise<{slug: string}>}

type AuthorPageData = {
  name?: string | null
  slug?: string | null
  bio?: TypedObject[] | null
}

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: AUTHOR_SLUGS,
    perspective: 'published',
    stega: false,
  })
  return (data || []).map((row: {slug: string}) => ({slug: row.slug}))
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const {data} = await sanityFetch({
    query: AUTHOR_BY_SLUG,
    params: {slug},
    stega: false,
  })
  if (!data?.name) return {title: 'Not found'}
  return {
    title: `${data.name} · Authors`,
    description: `Posts by ${data.name}.`,
  }
}

export default async function AuthorPostsPage({params}: Props) {
  const {slug} = await params
  const {data: author} = await sanityFetch({
    query: AUTHOR_BY_SLUG,
    params: {slug},
  })
  const authorData = (author ?? null) as AuthorPageData | null
  if (!authorData?.slug) notFound()

  const {data: posts} = await sanityFetch({
    query: POSTS_BY_AUTHOR_SLUG,
    params: {slug, start: 0, end: AUTHOR_EDITORIAL_PAGE_SIZE + 1},
  })
  const rows = (posts ?? []) as EditorialCardItem[]
  const items = rows.slice(0, AUTHOR_EDITORIAL_PAGE_SIZE)
  const hasMore = rows.length > AUTHOR_EDITORIAL_PAGE_SIZE

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-50">{authorData.name}</h1>
      {authorData.bio?.length ? (
        <div className="mt-6">
          <ArticleBody value={authorData.bio} />
        </div>
      ) : (
        <p className="mt-3 max-w-2xl text-zinc-400">Interviews, photo posts, and reviews by this author.</p>
      )}
      <AuthorEditorialFeed authorSlug={slug} initialHasMore={hasMore} initialItems={items} />
    </div>
  )
}
