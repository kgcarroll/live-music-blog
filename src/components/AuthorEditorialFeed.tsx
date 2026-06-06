'use client'

import {useCallback, useState} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import {loadOlderAuthorEditorial} from '@/app/(site)/authorEditorialActions'
import {EditorialCard, EditorialCardSkeleton, type EditorialCardItem} from '@/components/EditorialCard'
import {AUTHOR_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'
import {listPageHref} from '@/lib/listPagination'

export function AuthorEditorialFeed({
  authorSlug,
  initialHasMore,
  initialItems,
  initialPage,
}: {
  authorSlug: string
  initialHasMore: boolean
  initialItems: EditorialCardItem[]
  initialPage: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(initialPage)

  const loadOlder = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const nextPage = page + 1
      const offset = nextPage * AUTHOR_EDITORIAL_PAGE_SIZE
      const result = await loadOlderAuthorEditorial(authorSlug, offset)
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item._id))
        const next = [...prev]
        for (const row of result.items) {
          if (row?._id && !seen.has(row._id)) {
            seen.add(row._id)
            next.push(row)
          }
        }
        return next
      })
      setPage(nextPage)
      setHasMore(result.hasMore)
      router.replace(listPageHref(pathname, nextPage, searchParams), {scroll: false})
    } finally {
      setLoading(false)
    }
  }, [authorSlug, hasMore, loading, page, pathname, router, searchParams])

  return (
    <>
      <div className="mt-10 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <EditorialCard key={item._id} item={item} />
        ))}
        {loading
          ? Array.from({length: AUTHOR_EDITORIAL_PAGE_SIZE}, (_, index) => (
              <EditorialCardSkeleton key={`author-skeleton-${index}`} />
            ))
          : null}
      </div>
      {!items.length ? <p className="mt-8 text-sm text-zinc-500">No published posts for this author yet.</p> : null}
      {hasMore ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            className="px-2 py-1 text-sm font-medium uppercase tracking-wide text-zinc-300 transition hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            onClick={loadOlder}
          >
            {loading ? 'Loading...' : 'Older'}
          </button>
        </div>
      ) : null}
    </>
  )
}
