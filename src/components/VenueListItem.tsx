import Link from 'next/link'

import type {VenueMapPin} from '@/lib/ticketmaster'
import {venueHref} from '@/lib/paths'

export function VenueListItem({venue}: {venue: VenueMapPin}) {
  const place = [venue.city, venue.state].filter(Boolean).join(', ')

  return (
    <li className="grid grid-cols-1 gap-1 border-b border-zinc-800/90 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)_minmax(0,0.75fr)_auto] sm:items-center sm:gap-4">
      <h2 className="text-sm font-semibold leading-snug text-zinc-50 sm:text-base">
        <Link
          href={venueHref(venue.slug)}
          className="rounded-sm outline-none transition-colors hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          {venue.name}
        </Link>
      </h2>
      <p className="text-xs text-zinc-500 sm:text-sm">{place || '—'}</p>
      <p className="text-xs tabular-nums text-zinc-400 sm:text-sm">
        {venue.upcomingEventCount} show{venue.upcomingEventCount === 1 ? '' : 's'}
      </p>
      <p className="sm:text-right">
        <Link
          href={venueHref(venue.slug)}
          className="text-xs font-medium uppercase tracking-wide text-amber-300 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          View
        </Link>
      </p>
    </li>
  )
}
