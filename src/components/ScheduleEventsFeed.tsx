'use client'

import {useCallback, useState} from 'react'
import {loadMoreScheduleEvents} from '@/app/(site)/events/eventsActions'
import {ScheduleEventCard, ScheduleEventCardSkeleton} from '@/components/ScheduleEventCard'
import {ScheduleEventListItem, ScheduleEventListSkeleton} from '@/components/ScheduleEventListItem'
import type {ScheduleViewMode} from '@/components/ScheduleViewToggle'
import {SCHEDULE_PAGE_SIZE} from '@/lib/schedule'
import type {ScheduleEvent} from '@/lib/ticketmaster'

export function ScheduleEventsFeed({
  view,
  initialEvents,
  initialHasMore,
  emptyMessage,
}: {
  view: ScheduleViewMode
  initialEvents: ScheduleEvent[]
  initialHasMore: boolean
  emptyMessage: string
}) {
  const [events, setEvents] = useState(initialEvents)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(0)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const nextPage = page + 1
      const result = await loadMoreScheduleEvents(nextPage)
      setEvents((prev) => {
        const seen = new Set(prev.map((event) => event.id))
        const next = [...prev]
        for (const event of result.events) {
          if (!seen.has(event.id)) {
            seen.add(event.id)
            next.push(event)
          }
        }
        return next
      })
      setPage(nextPage)
      setHasMore(result.hasMore)
    } finally {
      setLoading(false)
    }
  }, [hasMore, loading, page])

  const skeletons = Array.from({length: SCHEDULE_PAGE_SIZE}, (_, index) =>
    view === 'grid' ? (
      <ScheduleEventCardSkeleton key={`schedule-skeleton-${index}`} />
    ) : (
      <ScheduleEventListSkeleton key={`schedule-skeleton-${index}`} />
    ),
  )

  return (
    <>
      {view === 'grid' ? (
        <div className="mt-10 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {events.map((event) => (
            <ScheduleEventCard key={event.id} event={event} />
          ))}
          {loading ? skeletons : null}
        </div>
      ) : (
        <div className="mt-10 w-full min-w-0">
          <div
            className="mb-1 hidden border-b border-zinc-800 pb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.25fr)_auto] sm:gap-4"
            aria-hidden="true"
          >
            <span>Title</span>
            <span>Date / time</span>
            <span>Location</span>
            <span className="text-right">Tickets</span>
          </div>
          <ul className="list-none p-0">
            {events.map((event) => (
              <ScheduleEventListItem key={event.id} event={event} />
            ))}
            {loading ? skeletons : null}
          </ul>
        </div>
      )}

      {!events.length && !loading ? (
        <p className="mt-8 text-sm text-zinc-500">{emptyMessage}</p>
      ) : null}
      {hasMore ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            className="px-2 py-1 text-sm font-medium uppercase tracking-wide text-zinc-300 transition hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            onClick={loadMore}
          >
            {loading ? 'Loading...' : 'More'}
          </button>
        </div>
      ) : null}
    </>
  )
}
