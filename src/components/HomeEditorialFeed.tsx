'use client'

import Link from 'next/link'
import {useCallback, useState} from 'react'
import {EditorialCard, EditorialCardSkeleton, type EditorialCardItem} from '@/components/EditorialCard'
import {loadOlderHomeEditorial} from '@/app/(site)/homeEditorialActions'
import {HOME_EDITORIAL_PAGE_SIZE} from '@/lib/homeEditorial'

export function HomeEditorialFeed({
  excludeCarouselIds,
  initialItems,
}: {
  excludeCarouselIds: string[]
  initialItems: EditorialCardItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialItems.length === HOME_EDITORIAL_PAGE_SIZE)

  const loadOlder = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      const more = await loadOlderHomeEditorial(items.length, excludeCarouselIds)
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i._id))
        const next = [...prev]
        for (const row of more) {
          if (row?._id && !seen.has(row._id)) {
            seen.add(row._id)
            next.push(row)
          }
        }
        return next
      })
      setHasMore(more.length === HOME_EDITORIAL_PAGE_SIZE)
    } finally {
      setLoading(false)
    }
  }, [excludeCarouselIds, items.length, loading])

  return (
    <>
      <section className="grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <EditorialCard key={item._id} item={item} />
        ))}
        {loading
          ? Array.from({length: HOME_EDITORIAL_PAGE_SIZE}, (_, index) => (
              <EditorialCardSkeleton key={`home-skeleton-${index}`} />
            ))
          : null}
      </section>
      {!items.length ? (
        <p className="mt-8 rounded-lg border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
          No stories yet. Open{' '}
          <Link href="/studio" className="text-amber-300 underline">
            Sanity Studio
          </Link>{' '}
          to add interviews, news, or reviews.
        </p>
      ) : null}
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
