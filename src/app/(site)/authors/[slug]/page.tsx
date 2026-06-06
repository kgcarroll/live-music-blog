import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import Link from 'next/link'
import type {TypedObject} from '@portabletext/types'
import {Suspense} from 'react'
import {ArticleBody} from '@/components/ArticleBody'
import {AuthorEditorialFeed} from '@/components/AuthorEditorialFeed'
import {fetchAuthorEditorialThroughPage} from '@/app/(site)/authorEditorialActions'
import {parseListPageParam} from '@/lib/listPagination'
import {sanityFetch} from '@/sanity/lib/live'
import {AUTHOR_BY_SLUG, AUTHOR_SLUGS} from '@/sanity/lib/queries'

type Props = {
  params: Promise<{slug: string}>
  searchParams: Promise<{page?: string}>
}

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

export default async function AuthorPostsPage({params, searchParams}: Props) {
  const {slug} = await params
  const {page: pageParam} = await searchParams
  const listPage = parseListPageParam(pageParam)

  const {data: author} = await sanityFetch({
    query: AUTHOR_BY_SLUG,
    params: {slug},
  })
  const authorData = (author ?? null) as AuthorPageData | null
  if (!authorData?.slug) notFound()

  const {items, hasMore} = await fetchAuthorEditorialThroughPage(slug, listPage)

  return (
    <div>
      <p className="mb-3">
        <Link
          href="/authors"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-300/90 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          <span aria-hidden="true">←</span>
          All authors
        </Link>
      </p>
      <h1 className="text-3xl font-bold text-zinc-50">{authorData.name}</h1>
      {authorData.bio?.length ? (
        <div className="mt-6">
          <ArticleBody value={authorData.bio} />
        </div>
      ) : (
        <p className="mt-3 max-w-2xl text-zinc-400">Interviews, photo posts, and reviews by this author.</p>
      )}
      <Suspense fallback={null}>
        <AuthorEditorialFeed
          authorSlug={slug}
          initialHasMore={hasMore}
          initialItems={items}
          initialPage={listPage}
        />
      </Suspense>
    </div>
  )
}
