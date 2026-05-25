'use client'

import dynamic from 'next/dynamic'

import type {VenueMapPin} from '@/lib/ticketmaster'
import type {VenueMapCenter} from '@/lib/venueFilters'
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

export function VenuesMapLazy({
  venues,
  initialCenter,
  syncCenter,
  radiusMiles,
  onMapCenterChange,
}: {
  venues: VenueMapPin[]
  initialCenter: VenueMapCenter
  syncCenter: VenueMapCenter
  radiusMiles: number | null
  onMapCenterChange: (center: VenueMapCenter) => void
}) {
  return (
    <VenuesMap
      venues={venues}
      initialCenter={initialCenter}
      syncCenter={syncCenter}
      radiusMiles={radiusMiles}
      onMapCenterChange={onMapCenterChange}
    />
  )
}
