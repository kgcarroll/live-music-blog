import Link from 'next/link'

import type {VenueMapPin} from '@/lib/ticketmaster'
import {venueHref} from '@/lib/paths'

export function VenueCard({venue}: {venue: VenueMapPin}) {
  const place = [venue.city, venue.state].filter(Boolean).join(', ')

  return (
    <article className="group flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-sm transition hover:border-amber-500/40">
      <Link
        href={venueHref(venue.slug)}
        className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-zinc-800"
      >
        {venue.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Ticketmaster CDN
          <img
            src={venue.imageUrl}
            alt=""
            width={venue.imageWidth ?? undefined}
            height={venue.imageHeight ?? undefined}
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, min(400px, 33vw)"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
            No image
          </div>
        )}
      </Link>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <p className="shrink-0 text-xs leading-snug">
          <span className="uppercase tracking-wide text-amber-300">Venue</span>
          {place ? (
            <>
              <span className="mx-1.5 text-zinc-600" aria-hidden="true">
                |
              </span>
              <span className="text-zinc-400">{place}</span>
            </>
          ) : null}
        </p>
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-50 sm:text-base">
          <Link
            href={venueHref(venue.slug)}
            className="rounded-sm outline-none transition-colors hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-400/50"
          >
            {venue.name}
          </Link>
        </h2>
        <p className="mt-auto shrink-0 pt-1 text-xs text-zinc-500">
          {venue.upcomingEventCount} upcoming show{venue.upcomingEventCount === 1 ? '' : 's'}
        </p>
        {venue.imageSource === 'google_places' && venue.imageAttribution ? (
          <p className="shrink-0 text-[10px] leading-snug text-zinc-600" title={venue.imageAttribution}>
            Photo: {venue.imageAttribution}
          </p>
        ) : null}
      </div>
    </article>
  )
}
