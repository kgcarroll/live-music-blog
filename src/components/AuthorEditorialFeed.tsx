'use client'

import {useCallback, useState} from 'react'
import {loadOlderAuthorEditorial} from '@/app/(site)/authorEditorialActions'
import {EditorialCard, EditorialCardSkeleton, type EditorialCardItem} from '@/components/EditorialCard'
import {AUTHOR_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'

export function AuthorEditorialFeed({
  authorSlug,
  initialHasMore,
  initialItems,
}: {
  authorSlug: string
  initialHasMore: boolean
  initialItems: EditorialCardItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)

  const loadOlder = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      const page = await loadOlderAuthorEditorial(authorSlug, items.length)
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item._id))
        const next = [...prev]
        for (const row of page.items) {
          if (row?._id && !seen.has(row._id)) {
            seen.add(row._id)
            next.push(row)
          }
        }
        return next
      })
      setHasMore(page.hasMore)
    } finally {
      setLoading(false)
    }
  }, [authorSlug, items.length, loading])

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
