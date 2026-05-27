'use client'

import mapboxgl from 'mapbox-gl'
import {useEffect, useRef} from 'react'

import {VENUE_DETAIL_MAP_HEIGHT_CLASS, VENUE_DETAIL_MAP_ZOOM} from '@/lib/venues'

import 'mapbox-gl/dist/mapbox-gl.css'

export function VenueDetailMap({
  latitude,
  longitude,
  name,
}: {
  latitude: number
  longitude: number
  name: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()

  useEffect(() => {
    if (!token || !containerRef.current) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [longitude, latitude],
      zoom: VENUE_DETAIL_MAP_ZOOM,
      cooperativeGestures: true,
    })

    map.addControl(new mapboxgl.NavigationControl({showCompass: false}), 'top-right')
    map.addControl(new mapboxgl.AttributionControl({compact: true}))

    const marker = new mapboxgl.Marker({color: '#fbbf24'}).setLngLat([longitude, latitude]).addTo(map)

    return () => {
      marker.remove()
      map.remove()
    }
  }, [latitude, longitude, token])

  if (!token) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 ${VENUE_DETAIL_MAP_HEIGHT_CLASS}`}
      >
        <p className="text-center text-sm text-zinc-500">Map is not configured.</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden rounded-xl border border-zinc-800 ${VENUE_DETAIL_MAP_HEIGHT_CLASS}`}
      role="img"
      aria-label={`Map showing the location of ${name}`}
    />
  )
}
