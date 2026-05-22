'use client'

import dynamic from 'next/dynamic'

import type {VenueMapPin} from '@/lib/ticketmaster'
import {VENUES_MAP_HEIGHT_CLASS} from '@/lib/venues'

const VenuesMap = dynamic(
  () => import('@/components/VenuesMap').then((mod) => ({default: mod.VenuesMap})),
  {
    ssr: false,
    loading: () => (
      <div
        className={`${VENUES_MAP_HEIGHT_CLASS} w-full animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60`}
        aria-busy="true"
        aria-label="Loading map"
      />
    ),
  },
)

export function VenuesMapLazy({venues}: {venues: VenueMapPin[]}) {
  return <VenuesMap venues={venues} />
}
