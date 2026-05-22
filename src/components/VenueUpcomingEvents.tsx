'use client'

import {useCallback, useState} from 'react'
import {loadMoreVenueEvents} from '@/app/(site)/venues/venueEventsActions'
import {ScheduleEventCard, ScheduleEventCardSkeleton} from '@/components/ScheduleEventCard'
import {SCHEDULE_PAGE_SIZE} from '@/lib/schedule'
import type {ScheduleEvent} from '@/lib/ticketmaster'

export function VenueUpcomingEvents({
  venueId,
  initialEvents,
  initialHasMore,
}: {
  venueId: string
  initialEvents: ScheduleEvent[]
  initialHasMore: boolean
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
      const result = await loadMoreVenueEvents(venueId, nextPage)
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id))
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
  }, [hasMore, loading, page, venueId])

  if (!events.length) {
    return <p className="mt-6 text-sm text-zinc-500">No upcoming music events at this venue in the next 30 days.</p>
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {events.map((event) => (
          <ScheduleEventCard key={event.id} event={event} />
        ))}
        {loading
          ? Array.from({length: SCHEDULE_PAGE_SIZE}, (_, i) => (
              <ScheduleEventCardSkeleton key={`venue-event-skeleton-${i}`} />
            ))
          : null}
      </div>
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
