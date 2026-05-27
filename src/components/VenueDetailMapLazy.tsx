'use client'

import dynamic from 'next/dynamic'

import {VENUE_DETAIL_MAP_HEIGHT_CLASS} from '@/lib/venues'

const VenueDetailMap = dynamic(
  () => import('@/components/VenueDetailMap').then((mod) => ({default: mod.VenueDetailMap})),
  {
    ssr: false,
    loading: () => (
      <div
        className={`${VENUE_DETAIL_MAP_HEIGHT_CLASS} w-full animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60`}
        aria-busy="true"
        aria-label="Loading map"
      />
    ),
  },
)

export function VenueDetailMapLazy(props: {
  latitude: number
  longitude: number
  name: string
}) {
  return <VenueDetailMap {...props} />
}
