'use client'

import {useCallback, useState} from 'react'
import {
  loadOlderSectionEditorial,
  loadOlderTagEditorial,
} from '@/app/(site)/listingEditorialActions'
import {EditorialCard, EditorialCardSkeleton, type EditorialCardItem} from '@/components/EditorialCard'
import {EDITORIAL_LIST_PAGE_SIZE} from '@/lib/homeEditorial'

type ListingEditorialFeedProps = {
  initialHasMore: boolean
  initialItems: EditorialCardItem[]
  emptyMessage: string
} & (
  | {mode: 'section'; sectionType: string}
  | {mode: 'tag'; tagId: string}
)

export function ListingEditorialFeed(props: ListingEditorialFeedProps) {
  const {initialHasMore, initialItems, emptyMessage} = props
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)

  const loadOlder = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      const page =
        props.mode === 'section'
          ? await loadOlderSectionEditorial(props.sectionType, items.length)
          : await loadOlderTagEditorial(props.tagId, items.length)

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
  }, [
    items.length,
    loading,
    props.mode,
    props.mode === 'section' ? props.sectionType : props.tagId,
  ])

  return (
    <>
      <div className="mt-10 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <EditorialCard key={item._id} item={item} />
        ))}
        {loading
          ? Array.from({length: EDITORIAL_LIST_PAGE_SIZE}, (_, index) => (
              <EditorialCardSkeleton key={`listing-skeleton-${index}`} />
            ))
          : null}
      </div>
      {!items.length ? <p className="mt-8 text-sm text-zinc-500">{emptyMessage}</p> : null}
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
