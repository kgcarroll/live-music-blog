'use client'

import {useCallback, useState} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import {
  loadOlderSectionEditorial,
  loadOlderTagEditorial,
} from '@/app/(site)/listingEditorialActions'
import {EditorialCard, EditorialCardSkeleton, type EditorialCardItem} from '@/components/EditorialCard'
import {
  EDITORIAL_LIST_PAGE_SIZE,
  SECTION_EDITORIAL_PAGE_SIZE,
  TAG_EDITORIAL_PAGE_SIZE,
} from '@/lib/homeEditorial'
import {listPageHref} from '@/lib/listPagination'

type ListingEditorialFeedProps = {
  initialHasMore: boolean
  initialItems: EditorialCardItem[]
  initialPage: number
  emptyMessage: string
} & (
  | {mode: 'section'; sectionType: string}
  | {mode: 'tag'; tagId: string}
)

export function ListingEditorialFeed(props: ListingEditorialFeedProps) {
  const {initialHasMore, initialItems, initialPage, emptyMessage} = props
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(initialPage)

  const pageSize =
    props.mode === 'section' ? SECTION_EDITORIAL_PAGE_SIZE : TAG_EDITORIAL_PAGE_SIZE

  const loadOlder = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const nextPage = page + 1
      const offset = nextPage * pageSize
      const result =
        props.mode === 'section'
          ? await loadOlderSectionEditorial(props.sectionType, offset)
          : await loadOlderTagEditorial(props.tagId, offset)

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
  }, [
    hasMore,
    loading,
    page,
    pageSize,
    pathname,
    props.mode,
    props.mode === 'section' ? props.sectionType : props.tagId,
    router,
    searchParams,
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
