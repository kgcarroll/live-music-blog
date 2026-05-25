'use client'

import mapboxgl from 'mapbox-gl'
import {useEffect, useRef} from 'react'

import type {VenueMapPin} from '@/lib/ticketmaster'
import {eventHref, venueHref} from '@/lib/paths'
import {
  circleBounds,
  circlePolygonGeoJson,
  type VenueMapCenter,
} from '@/lib/venueFilters'
import {
  VENUES_MAP_HEIGHT_CLASS,
  VENUES_MAP_ZOOM,
} from '@/lib/venues'

import 'mapbox-gl/dist/mapbox-gl.css'

const UNCLUSTERED_POINT_RADIUS = 5
const POPUP_VIEW_PADDING = {top: 16, bottom: 16, left: 16, right: 16} as const
const RADIUS_FIT_PADDING = 48

function fitMapToRadius(map: mapboxgl.Map, center: VenueMapCenter, radiusMiles: number | null) {
  if (radiusMiles == null) {
    map.easeTo({
      center: [center.lng, center.lat],
      zoom: VENUES_MAP_ZOOM,
      duration: 500,
    })
    return
  }

  map.fitBounds(circleBounds(center, radiusMiles), {
    padding: RADIUS_FIT_PADDING,
    duration: 500,
    maxZoom: radiusMiles <= 5 ? 16 : 14,
  })
}

function panMapToFitPopup(map: mapboxgl.Map, popup: mapboxgl.Popup) {
  const popupEl = popup.getElement()
  if (!popupEl) return

  const mapContainer = map.getContainer()
  const mapWidth = mapContainer.clientWidth
  const mapHeight = mapContainer.clientHeight
  const popupRect = popupEl.getBoundingClientRect()
  const mapRect = mapContainer.getBoundingClientRect()

  const popupLeft = popupRect.left - mapRect.left
  const popupTop = popupRect.top - mapRect.top
  const popupRight = popupLeft + popupRect.width
  const popupBottom = popupTop + popupRect.height

  let panX = 0
  let panY = 0

  if (popupLeft < POPUP_VIEW_PADDING.left) {
    panX = popupLeft - POPUP_VIEW_PADDING.left
  } else if (popupRight > mapWidth - POPUP_VIEW_PADDING.right) {
    panX = popupRight - (mapWidth - POPUP_VIEW_PADDING.right)
  }

  if (popupTop < POPUP_VIEW_PADDING.top) {
    panY = popupTop - POPUP_VIEW_PADDING.top
  } else if (popupBottom > mapHeight - POPUP_VIEW_PADDING.bottom) {
    panY = popupBottom - (mapHeight - POPUP_VIEW_PADDING.bottom)
  }

  if (panX !== 0 || panY !== 0) {
    map.panBy([panX, panY], {duration: 300})
  }
}

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
        nextShowSlug: venue.nextShowSlug ?? '',
      },
    })),
  }
}

function updateRadiusCircle(
  map: mapboxgl.Map,
  center: VenueMapCenter,
  radiusMiles: number | null,
) {
  const source = map.getSource('radius-circle') as mapboxgl.GeoJSONSource | undefined
  if (!source) return

  if (radiusMiles == null) {
    source.setData({type: 'FeatureCollection', features: []})
    map.setLayoutProperty('radius-circle-fill', 'visibility', 'none')
    map.setLayoutProperty('radius-circle-outline', 'visibility', 'none')
    return
  }

  source.setData(circlePolygonGeoJson(center, radiusMiles))
  map.setLayoutProperty('radius-circle-fill', 'visibility', 'visible')
  map.setLayoutProperty('radius-circle-outline', 'visibility', 'visible')
}

export function VenuesMap({
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
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const mapReadyRef = useRef(false)
  const onMapCenterChangeRef = useRef(onMapCenterChange)
  const radiusMilesRef = useRef(radiusMiles)
  const prevRadiusMilesRef = useRef<number | null | undefined>(undefined)
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()

  onMapCenterChangeRef.current = onMapCenterChange
  radiusMilesRef.current = radiusMiles

  useEffect(() => {
    if (!token || !containerRef.current) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [initialCenter.lng, initialCenter.lat],
      zoom: VENUES_MAP_ZOOM,
      cooperativeGestures: true,
    })
    map.addControl(new mapboxgl.NavigationControl({showCompass: false}), 'top-right')
    map.addControl(new mapboxgl.AttributionControl({compact: true}))
    mapRef.current = map

    const onLoad = () => {
      map.addSource('radius-circle', {
        type: 'geojson',
        data: {type: 'FeatureCollection', features: []},
      })

      map.addLayer({
        id: 'radius-circle-fill',
        type: 'fill',
        source: 'radius-circle',
        layout: {visibility: 'none'},
        paint: {
          'fill-color': '#fbbf24',
          'fill-opacity': 0.06,
        },
      })

      map.addLayer({
        id: 'radius-circle-outline',
        type: 'line',
        source: 'radius-circle',
        layout: {visibility: 'none'},
        paint: {
          'line-color': '#fbbf24',
          'line-opacity': 0.35,
          'line-width': 1.5,
        },
      })

      map.addSource('venues', {
        type: 'geojson',
        data: venuesToGeoJson(venues),
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
          'circle-radius': UNCLUSTERED_POINT_RADIUS,
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
        const {slug, name, city, state, imageUrl, nextShowName, nextShowWhen, nextShowSlug} =
          feature.properties as {
            slug: string
            name: string
            city: string
            state: string
            imageUrl: string
            nextShowName: string
            nextShowWhen: string
            nextShowSlug: string
          }
        popupRef.current?.remove()
        const coordinates = feature.geometry.coordinates as [number, number]
        const popup = new mapboxgl.Popup({
          anchor: 'bottom',
          offset: 12,
          closeButton: false,
          maxWidth: '340px',
        })
          .setLngLat(coordinates)
          .setHTML(
            venuePopupHtml({slug, name, city, state, imageUrl, nextShowName, nextShowWhen, nextShowSlug}),
          )
          .addTo(map)
        popupRef.current = popup
        requestAnimationFrame(() => panMapToFitPopup(map, popup))
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

      map.on('moveend', () => {
        const center = map.getCenter()
        const mapCenter = {lat: center.lat, lng: center.lng}
        onMapCenterChangeRef.current(mapCenter)
        updateRadiusCircle(map, mapCenter, radiusMilesRef.current)
      })

      mapReadyRef.current = true
      const loadCenter = {lat: initialCenter.lat, lng: initialCenter.lng}
      updateRadiusCircle(map, loadCenter, radiusMilesRef.current)
      if (radiusMilesRef.current != null) {
        fitMapToRadius(map, loadCenter, radiusMilesRef.current)
      }
      prevRadiusMilesRef.current = radiusMilesRef.current
    }

    map.on('load', onLoad)

    return () => {
      mapReadyRef.current = false
      popupRef.current?.remove()
      popupRef.current = null
      map.remove()
      mapRef.current = null
    }
    // Map initializes once; venue/radius updates use separate effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReadyRef.current) return
    const source = map.getSource('venues') as mapboxgl.GeoJSONSource | undefined
    source?.setData(venuesToGeoJson(venues))
  }, [venues])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReadyRef.current) return
    const center = map.getCenter()
    const mapCenter = {lat: center.lat, lng: center.lng}
    updateRadiusCircle(map, mapCenter, radiusMiles)

    if (radiusMiles != null) {
      fitMapToRadius(map, mapCenter, radiusMiles)
    } else if (prevRadiusMilesRef.current != null) {
      fitMapToRadius(map, mapCenter, null)
    }

    prevRadiusMilesRef.current = radiusMiles
  }, [radiusMiles])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReadyRef.current) return
    const current = map.getCenter()
    if (
      Math.abs(current.lat - syncCenter.lat) < 0.0001 &&
      Math.abs(current.lng - syncCenter.lng) < 0.0001
    ) {
      return
    }
    map.jumpTo({center: [syncCenter.lng, syncCenter.lat]})
    updateRadiusCircle(map, syncCenter, radiusMiles)
    if (radiusMiles != null) {
      fitMapToRadius(map, syncCenter, radiusMiles)
    }
  }, [syncCenter.lat, syncCenter.lng, radiusMiles])

  if (!token) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-700 p-6 text-sm text-zinc-500">
        Map is not configured. Add <code className="text-zinc-400">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> to
        your environment.
      </p>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${VENUES_MAP_HEIGHT_CLASS} w-full touch-pan-y overflow-hidden rounded-xl border border-zinc-800`}
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
  nextShowSlug,
}: {
  slug: string
  name: string
  city: string
  state: string
  imageUrl: string
  nextShowName: string
  nextShowWhen: string
  nextShowSlug: string
}): string {
  const place = [city, state].filter(Boolean).join(', ')
  const safeName = escapeHtml(name)
  const safeImage = safeHttpUrl(imageUrl)

  const showName = nextShowName.trim()
  const showWhen = nextShowWhen.trim()
  const showSlug = nextShowSlug.trim()
  const hasShow = Boolean(showName && showWhen)

  const squareImageMarkup = safeImage
    ? `<img src="${escapeHtml(safeImage)}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:6px;object-fit:cover;flex-shrink:0;background:#e4e4e7" />`
    : ''

  let showRowMarkup = ''
  if (hasShow) {
    const safeShowName = escapeHtml(showName)
    const showHref = showSlug ? eventHref(showSlug) : ''
    const titleMarkup = showHref
      ? `<a href="${escapeHtml(showHref)}" style="display:block;font-size:14px;font-weight:600;line-height:1.35;color:#18181b;text-decoration:none">${safeShowName}</a>`
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
