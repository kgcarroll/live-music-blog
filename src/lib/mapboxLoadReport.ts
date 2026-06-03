'use client'

import type {MapboxLoadSource} from '@/lib/mapboxUsage'

const recentKeys = new Set<string>()

/** Report one Mapbox map load after `map.on('load')`. Dedupes React Strict Mode remounts on the same page. */
export function reportMapboxLoad(source: MapboxLoadSource): void {
  if (typeof window === 'undefined') return

  const key = `${source}:${window.location.pathname}`
  if (recentKeys.has(key)) return
  recentKeys.add(key)
  window.setTimeout(() => recentKeys.delete(key), 4000)

  void fetch('/api/studio/mapbox-load', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({source}),
    credentials: 'same-origin',
    keepalive: true,
  }).catch(() => {
    // Non-blocking telemetry
  })
}
