'use client'

import {LaunchIcon, RefreshIcon} from '@sanity/icons'
import {Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useEffect, useState} from 'react'

import type {GooglePlacesUsageSummary} from '@/lib/googlePlacesUsage'
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

function requestKindLabel(kind: GooglePlacesUsageSummary['lastRequestKind']): string {
  switch (kind) {
    case 'text_search':
      return 'Text Search'
    case 'place_photo':
      return 'Place Photo'
    case 'api_error':
      return 'API error'
    default:
      return '—'
  }
}

function panelTone(
  summary: GooglePlacesUsageSummary | null,
): 'positive' | 'caution' | 'critical' | 'default' {
  if (!summary) return 'default'
  if (!summary.keyConfigured) return 'critical'
  if (!summary.writeTokenConfigured) return 'caution'
  return 'positive'
}

export function GooglePlacesUsagePanel() {
  const [summary, setSummary] = useState<GooglePlacesUsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const loadUsage = useCallback(async () => {
    const response = await fetch(`${studioApiOrigin()}/api/studio/google-places-usage`, {
      credentials: 'same-origin',
    })
    if (!response.ok) {
      throw new Error('Could not load Google Places usage.')
    }
    return (await response.json()) as GooglePlacesUsageSummary
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
        if (!cancelled) setMessage('Could not load Google Places usage.')
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
      setMessage('Could not load Google Places usage.')
    } finally {
      setLoading(false)
    }
  }, [loadUsage])

  const tone = panelTone(summary)

  return (
    <Stack space={4}>
      <Flex align="center" justify="space-between" gap={3}>
        <Text size={1} muted>
          Counters increment when the server syncs stale venue images (up to 5 per feed refresh), not
          when you only clear the Ticketmaster cache. After clearing cache, open /events on the site to
          refetch the feed. Billing in Google Cloud is authoritative. Cached venueImage docs skip API
          calls until stale.
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
            {!summary?.keyConfigured ? (
              <Text size={1} weight="semibold">
                Google Places is not configured. Set GOOGLE_PLACES_API_KEY on the site.
              </Text>
            ) : !summary.writeTokenConfigured ? (
              <Text size={1} weight="semibold">
                SANITY_API_WRITE_TOKEN is not set on the site, so API calls will not be recorded.
              </Text>
            ) : (
              <Text size={1} weight="semibold">
                Site-reported totals for calendar month {summary.periodMonth} (UTC). A successful
                venue match is typically one Text Search plus one Place Photo request.
              </Text>
            )}

            <Stack space={3}>
              <Text size={1} weight="semibold">
                API requests (month)
              </Text>
              <StatusRow
                label="Text Search"
                value={summary ? formatInteger(summary.textSearch) : '—'}
              />
              <StatusRow
                label="Place Photo"
                value={summary ? formatInteger(summary.placePhoto) : '—'}
              />
              <StatusRow
                label="Failed requests"
                value={summary ? formatInteger(summary.apiErrors) : '—'}
              />
              <StatusRow
                label="Total API requests"
                value={summary ? formatInteger(summary.totalRequests) : '—'}
                emphasize
              />
              <StatusRow
                label="Last request"
                value={summary ? formatStatusWhen(summary.lastRequestAt) : '—'}
              />
              <StatusRow
                label="Last request type"
                value={summary ? requestKindLabel(summary.lastRequestKind) : '—'}
              />
            </Stack>

            <Stack space={3}>
              <Text size={1} weight="semibold">
                Venue image sync
              </Text>
              <StatusRow
                label="Last sync"
                value={summary ? formatStatusWhen(summary.lastSyncAt) : '—'}
              />
              <StatusRow
                label="Venues processed (last sync)"
                value={
                  summary?.lastSyncVenuesProcessed != null
                    ? formatInteger(summary.lastSyncVenuesProcessed)
                    : '—'
                }
              />
              <StatusRow
                label="Images written (last sync)"
                value={
                  summary?.lastSyncImagesWritten != null
                    ? formatInteger(summary.lastSyncImagesWritten)
                    : '—'
                }
              />
              <StatusRow
                label="Fetched at"
                value={summary ? formatStatusWhen(summary.fetchedAt) : '—'}
              />
            </Stack>

            <Flex gap={2} wrap="wrap">
              <Button
                as="a"
                href={summary?.googleCloudApisUrl ?? 'https://console.cloud.google.com/apis/dashboard'}
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="Google Cloud APIs"
              />
              <Button
                as="a"
                href={summary?.googleCloudBillingUrl ?? 'https://console.cloud.google.com/billing'}
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="Google Cloud Billing"
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
