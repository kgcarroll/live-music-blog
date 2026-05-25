'use client'

import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import {ScheduleViewToggle, type ScheduleViewMode} from '@/components/ScheduleViewToggle'
import {VenuesMapFilters} from '@/components/VenuesMapFilters'
import {VenuesMapLazy} from '@/components/VenuesMapLazy'
import {VenuesVenuesFeed} from '@/components/VenuesVenuesFeed'
import type {VenueMapPin} from '@/lib/ticketmaster'
import {
  collectVenueCities,
  filterVenues,
  mapCenterForCityFilter,
  parseVenueFiltersFromSearchParams,
  radiusMilesForFilter,
  venueFiltersQueryString,
  type VenueFilterState,
  type VenueMapCenter,
} from '@/lib/venueFilters'
import {isVenueWithinMapRegion} from '@/lib/venues'

const VIEW_STORAGE_KEY = 'venues-view'

function readStoredView(): ScheduleViewMode {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    return stored === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export function VenuesPageClient({
  children,
  venues,
  emptyMessage,
  mapEnabled = true,
}: {
  children: ReactNode
  venues: VenueMapPin[]
  emptyMessage: string
  mapEnabled?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlKey = searchParams.toString()

  const [view, setView] = useState<ScheduleViewMode>('grid')
  const initialFiltersRef = useRef<VenueFilterState | null>(null)
  if (initialFiltersRef.current === null) {
    initialFiltersRef.current = parseVenueFiltersFromSearchParams(new URLSearchParams(urlKey))
  }
  const [filters, setFilters] = useState<VenueFilterState>(initialFiltersRef.current)

  useEffect(() => {
    setView(readStoredView())
  }, [])

  useEffect(() => {
    setFilters(parseVenueFiltersFromSearchParams(new URLSearchParams(urlKey)))
  }, [urlKey])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = venueFiltersQueryString(filters)
      const currentQuery = window.location.search
      if (nextQuery !== currentQuery) {
        router.replace(`${pathname}${nextQuery}`, {scroll: false})
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [filters, pathname, router])

  const setViewAndStore = useCallback((next: ScheduleViewMode) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const regionVenues = useMemo(() => venues.filter(isVenueWithinMapRegion), [venues])
  const cities = useMemo(() => collectVenueCities(regionVenues), [regionVenues])
  const filteredVenues = useMemo(() => filterVenues(regionVenues, filters), [regionVenues, filters])
  const radiusMiles = radiusMilesForFilter(filters.radius)

  const handleFilterChange = useCallback(
    (patch: Partial<Omit<VenueFilterState, 'center'>>) => {
      setFilters((current) => {
        const next: VenueFilterState = {...current, ...patch}
        if (patch.city !== undefined) {
          next.center = mapCenterForCityFilter(patch.city, regionVenues)
        }
        return next
      })
    },
    [regionVenues],
  )

  const handleMapCenterChange = useCallback((center: VenueMapCenter) => {
    setFilters((current) => {
      if (
        Math.abs(current.center.lat - center.lat) < 0.00005 &&
        Math.abs(current.center.lng - center.lng) < 0.00005
      ) {
        return current
      }
      return {...current, center}
    })
  }, [])

  const hasRegionVenues = regionVenues.length > 0
  const filterEmptyMessage = 'No venues match these filters. Try widening the radius or clearing filters.'

  return (
    <div>
      <div>
        {mapEnabled && hasRegionVenues ? (
          <>
            <VenuesMapLazy
              venues={filteredVenues}
              initialCenter={initialFiltersRef.current.center}
              syncCenter={filters.center}
              radiusMiles={radiusMiles}
              onMapCenterChange={handleMapCenterChange}
            />
            <VenuesMapFilters
              filters={filters}
              cities={cities}
              resultCount={filteredVenues.length}
              totalCount={regionVenues.length}
              onChange={handleFilterChange}
            />
          </>
        ) : !hasRegionVenues ? (
          <p className="text-sm text-zinc-500">{emptyMessage}</p>
        ) : null}
      </div>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 ${mapEnabled && hasRegionVenues ? 'mt-8' : ''}`}
      >
        <h1 className="text-3xl font-bold text-zinc-50">Venues</h1>
        {hasRegionVenues ? (
          <ScheduleViewToggle view={view} onChange={setViewAndStore} ariaLabel="Venues layout" />
        ) : null}
      </div>
      {children}
      {hasRegionVenues ? (
        <VenuesVenuesFeed
          view={view}
          venues={filteredVenues}
          emptyMessage={filteredVenues.length ? emptyMessage : filterEmptyMessage}
        />
      ) : null}
    </div>
  )
}
