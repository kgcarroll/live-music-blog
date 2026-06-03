'use client'

import {LaunchIcon, RefreshIcon} from '@sanity/icons'
import {Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useEffect, useState} from 'react'

import type {MapboxUsageSummary} from '@/lib/mapboxUsage'
import {formatStatusWhen} from '@/lib/ticketmasterFeedStatus'
import {studioApiOrigin} from '@/lib/studioHomeCarousel'

function StatusRow({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  const valueWeight = emphasize ? 'semibold' : 'medium'
  return (
    <Flex justify="space-between" gap={3}>
      <Text size={1} muted={!emphasize} weight={emphasize ? 'semibold' : 'regular'}>
        {label}
      </Text>
      <Text size={1} weight={valueWeight}>
        {value}
      </Text>
    </Flex>
  )
}

function formatInteger(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

function sourceLabel(source: MapboxUsageSummary['lastLoadSource']): string {
  switch (source) {
    case 'venues_hub':
      return 'Venues hub (/venues)'
    case 'venue_detail':
      return 'Venue detail'
    default:
      return '—'
  }
}

function panelTone(summary: MapboxUsageSummary | null): 'positive' | 'caution' | 'critical' | 'default' {
  if (!summary) return 'default'
  if (!summary.tokenConfigured) return 'critical'
  if (!summary.writeTokenConfigured) return 'caution'
  return 'positive'
}

export function MapboxUsagePanel() {
  const [summary, setSummary] = useState<MapboxUsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const loadUsage = useCallback(async () => {
    const response = await fetch(`${studioApiOrigin()}/api/studio/mapbox-usage`, {
      credentials: 'same-origin',
    })
    if (!response.ok) {
      throw new Error('Could not load Mapbox usage.')
    }
    return (await response.json()) as MapboxUsageSummary
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setMessage(null)
      try {
        const data = await loadUsage()
        if (!cancelled) setSummary(data)
      } catch {
        if (!cancelled) setMessage('Could not load Mapbox usage.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadUsage])

  const onRefresh = useCallback(async () => {
    setMessage(null)
    setLoading(true)
    try {
      setSummary(await loadUsage())
    } catch {
      setMessage('Could not load Mapbox usage.')
    } finally {
      setLoading(false)
    }
  }, [loadUsage])

  const tone = panelTone(summary)
  const siteOrigin = studioApiOrigin()

  return (
    <Stack space={4}>
      <Flex align="center" justify="space-between" gap={3}>
        <Text size={1} muted>
          Map loads are counted on the public site when a Mapbox map finishes loading, then stored in
          Site Settings. Mapbox does not expose a simple usage API for most plans - compare these totals
          with the Mapbox Statistics dashboard.
        </Text>
        <Button
          icon={RefreshIcon}
          text="Refresh"
          mode="ghost"
          disabled={loading}
          onClick={onRefresh}
        />
      </Flex>

      {loading ? (
        <Flex align="center" gap={2} padding={4}>
          <Spinner muted />
          <Text size={1} muted>
            Loading usage…
          </Text>
        </Flex>
      ) : (
        <Card padding={4} radius={2} shadow={1} tone={tone}>
          <Stack space={4}>
            {!summary?.tokenConfigured ? (
              <Text size={1} weight="semibold">
                Mapbox is not configured. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN on the site.
              </Text>
            ) : !summary.writeTokenConfigured ? (
              <Text size={1} weight="semibold">
                SANITY_API_WRITE_TOKEN is not set on the site, so map loads will not be recorded.
              </Text>
            ) : (
              <Text size={1} weight="semibold">
                Totals for calendar month {summary.periodMonth} (UTC). Each successful map load on /venues
                or a venue page increments the counter once.
              </Text>
            )}

            <Stack space={3}>
              <StatusRow
                label="Venues map enabled"
                value={
                  summary?.venuesMapEnabled == null
                    ? '—'
                    : summary.venuesMapEnabled
                      ? 'Yes'
                      : 'No (hub map off)'
                }
              />
              <StatusRow
                label="Venues hub loads"
                value={summary ? formatInteger(summary.venuesHub) : '—'}
              />
              <StatusRow
                label="Venue detail loads"
                value={summary ? formatInteger(summary.venueDetail) : '—'}
              />
              <StatusRow
                label="Total map loads (month)"
                value={summary ? formatInteger(summary.totalLoads) : '—'}
                emphasize
              />
              <StatusRow
                label="Last load"
                value={summary ? formatStatusWhen(summary.lastLoadAt) : '—'}
              />
              <StatusRow
                label="Last load source"
                value={summary ? sourceLabel(summary.lastLoadSource) : '—'}
              />
              <StatusRow
                label="Fetched at"
                value={summary ? formatStatusWhen(summary.fetchedAt) : '—'}
              />
            </Stack>

            <Flex gap={2} wrap="wrap">
              <Button
                as="a"
                href="https://account.mapbox.com/statistics/"
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="Mapbox Statistics"
              />
              <Button
                as="a"
                href={`${siteOrigin}/venues`}
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="Open /venues"
              />
            </Flex>
          </Stack>
        </Card>
      )}

      {message ? (
        <Text size={1} muted>
          {message}
        </Text>
      ) : null}
    </Stack>
  )
}
