'use client'

import mapboxgl from 'mapbox-gl'
import {useEffect, useMemo, useRef} from 'react'

import type {VenueMapPin} from '@/lib/ticketmaster'
import {venueHref} from '@/lib/paths'
import {
  isVenueWithinMapRegion,
  VENUES_MAP_CENTER,
  VENUES_MAP_HEIGHT_CLASS,
  VENUES_MAP_ZOOM,
} from '@/lib/venues'

import 'mapbox-gl/dist/mapbox-gl.css'

function venuesToGeoJson(venues: VenueMapPin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((venue) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [venue.longitude, venue.latitude],
      },
      properties: {
        slug: venue.slug,
        name: venue.name,
        city: venue.city ?? '',
        state: venue.state ?? '',
        count: venue.upcomingEventCount,
        imageUrl: venue.imageUrl ?? '',
        nextShowName: venue.nextShowName ?? '',
        nextShowWhen: venue.nextShowWhen ?? '',
        nextShowUrl: venue.nextShowUrl ?? '',
      },
    })),
  }
}

export function VenuesMap({venues}: {venues: VenueMapPin[]}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  const mapVenues = useMemo(() => venues.filter(isVenueWithinMapRegion), [venues])

  useEffect(() => {
    if (!token || !containerRef.current || mapVenues.length === 0) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [VENUES_MAP_CENTER.lng, VENUES_MAP_CENTER.lat],
      zoom: VENUES_MAP_ZOOM,
    })
    map.addControl(new mapboxgl.NavigationControl({showCompass: false}), 'top-right')
    map.addControl(new mapboxgl.AttributionControl({compact: true}))
    mapRef.current = map

    const onLoad = () => {
      map.addSource('venues', {
        type: 'geojson',
        data: venuesToGeoJson(mapVenues),
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 48,
      })

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'venues',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#d97706',
          'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 25, 22],
          'circle-opacity': 0.75,
        },
      })

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'venues',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
        },
        paint: {'text-color': '#18181b'},
      })

      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'venues',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#fbbf24',
          'circle-radius': 4,
          'circle-stroke-width': 0.5,
          'circle-stroke-color': '#18181b',
        },
      })

      map.on('click', 'clusters', (event) => {
        const feature = event.features?.[0]
        if (!feature || feature.geometry.type !== 'Point') return
        const coordinates = feature.geometry.coordinates as [number, number]
        const clusterId = feature.properties?.cluster_id
        const source = map.getSource('venues') as mapboxgl.GeoJSONSource
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return
          map.easeTo({center: coordinates, zoom})
        })
      })

      map.on('click', 'unclustered-point', (event) => {
        const feature = event.features?.[0]
        if (!feature || feature.geometry.type !== 'Point') return
        const {slug, name, city, state, imageUrl, nextShowName, nextShowWhen, nextShowUrl} =
          feature.properties as {
            slug: string
            name: string
            city: string
            state: string
            imageUrl: string
            nextShowName: string
            nextShowWhen: string
            nextShowUrl: string
          }
        const popup = new mapboxgl.Popup({offset: 12, closeButton: false, maxWidth: '340px'})
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(
            venuePopupHtml({slug, name, city, state, imageUrl, nextShowName, nextShowWhen, nextShowUrl}),
          )
          .addTo(map)
      })

      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', 'unclustered-point', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'unclustered-point', () => {
        map.getCanvas().style.cursor = ''
      })
    }

    map.on('load', onLoad)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [token, mapVenues])

  if (!token) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-700 p-6 text-sm text-zinc-500">
        Map is not configured. Add <code className="text-zinc-400">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> to
        your environment.
      </p>
    )
  }

  if (!mapVenues.length) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-700 p-6 text-sm text-zinc-500">
        No venues with upcoming music shows to display on the map.
      </p>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${VENUES_MAP_HEIGHT_CLASS} w-full overflow-hidden rounded-xl border border-zinc-800`}
      role="region"
      aria-label="Map of venues with upcoming concerts"
    />
  )
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeHttpUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return trimmed
  } catch {
    return null
  }
}

function venuePopupHtml({
  slug,
  name,
  city,
  state,
  imageUrl,
  nextShowName,
  nextShowWhen,
  nextShowUrl,
}: {
  slug: string
  name: string
  city: string
  state: string
  imageUrl: string
  nextShowName: string
  nextShowWhen: string
  nextShowUrl: string
}): string {
  const place = [city, state].filter(Boolean).join(', ')
  const safeName = escapeHtml(name)
  const safeImage = safeHttpUrl(imageUrl)

  const showName = nextShowName.trim()
  const showWhen = nextShowWhen.trim()
  const showUrl = safeHttpUrl(nextShowUrl)
  const hasShow = Boolean(showName && showWhen)

  const squareImageMarkup = safeImage
    ? `<img src="${escapeHtml(safeImage)}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:6px;object-fit:cover;flex-shrink:0;background:#e4e4e7" />`
    : ''

  let showRowMarkup = ''
  if (hasShow) {
    const safeShowName = escapeHtml(showName)
    const titleMarkup = showUrl
      ? `<a href="${escapeHtml(showUrl)}" target="_blank" rel="noopener noreferrer" style="display:block;font-size:14px;font-weight:600;line-height:1.35;color:#18181b;text-decoration:none">${safeShowName}</a>`
      : `<span style="display:block;font-size:14px;font-weight:600;line-height:1.35;color:#18181b">${safeShowName}</span>`
    const showText = `<div style="min-width:0;flex:1"><p style="margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#71717a">Next show</p>${titleMarkup}<p style="margin:4px 0 0;font-size:13px;line-height:1.4;color:#52525b">${escapeHtml(showWhen)}</p></div>`
    showRowMarkup = `<div style="margin-top:10px;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:8px;background:#f4f4f5">${squareImageMarkup}${showText}</div>`
  } else if (safeImage) {
    showRowMarkup = `<div style="margin-top:10px;line-height:0">${squareImageMarkup}</div>`
  }

  const headerBlock = `<header style="margin:0;padding:0 0 10px;border-bottom:1px solid #e4e4e7"><p style="margin:0;font-size:16px;font-weight:700;line-height:1.25;color:#18181b">${safeName}</p>${
    place
      ? `<p style="margin:4px 0 0;font-size:13px;line-height:1.35;color:#52525b">${escapeHtml(place)}</p>`
      : ''
  }</header>`

  const footerLink = `<p style="margin:12px 0 0"><a href="${venueHref(slug)}" style="font-size:13px;font-weight:600;color:#b45309;text-decoration:underline">View venue</a></p>`

  return `<div style="width:304px;padding:2px 0;font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.4;color:#18181b">${headerBlock}${showRowMarkup}${footerLink}</div>`
}
