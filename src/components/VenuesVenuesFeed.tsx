'use client'

import {VenueCard} from '@/components/VenueCard'
import {VenueListItem} from '@/components/VenueListItem'
import type {ScheduleViewMode} from '@/components/ScheduleViewToggle'
import type {VenueMapPin} from '@/lib/ticketmaster'

export function VenuesVenuesFeed({
  view,
  venues,
  emptyMessage,
}: {
  view: ScheduleViewMode
  venues: VenueMapPin[]
  emptyMessage: string
}) {
  if (!venues.length) {
    return <p className="mt-8 text-sm text-zinc-500">{emptyMessage}</p>
  }

  if (view === 'grid') {
    return (
      <div className="mt-10 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {venues.map((venue) => (
          <VenueCard key={venue.id} venue={venue} />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-10 w-full min-w-0">
      <div
        className="mb-1 hidden border-b border-zinc-800 pb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)_minmax(0,0.75fr)_auto] sm:gap-4"
        aria-hidden="true"
      >
        <span>Title</span>
        <span>Location</span>
        <span>Shows</span>
        <span className="text-right">View</span>
      </div>
      <ul className="list-none p-0">
        {venues.map((venue) => (
          <VenueListItem key={venue.id} venue={venue} />
        ))}
      </ul>
    </div>
  )
}
