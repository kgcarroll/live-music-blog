'use client'

import {CalendarIcon, LaunchIcon, RefreshIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useEffect, useState} from 'react'
import {useClient} from 'sanity'

import {
  cacheExpiresAt,
  formatStatusWhen,
  isRateLimitedStatus,
  type TicketmasterFeedStatus,
} from '@/lib/ticketmasterFeedStatus'
import {SCHEDULE_REVALIDATE_SECONDS} from '@/lib/schedule'
import {studioApiOrigin} from '@/lib/studioHomeCarousel'
import {apiVersion} from '@/sanity/lib/client'
import {SITE_SETTINGS_DOCUMENT_ID} from '@/sanity/constants'

const STATUS_QUERY = `*[_id == $id][0].ticketmasterFeedStatus`

function errorLabel(error: TicketmasterFeedStatus['lastError']): string {
  switch (error) {
    case 'rate_limit':
      return 'Rate limited (429)'
    case 'not_configured':
      return 'API key not configured'
    case 'api_error':
      return 'API error'
    default:
      return 'None'
  }
}

function statusTone(
  status: TicketmasterFeedStatus | null,
): 'positive' | 'caution' | 'critical' | 'default' {
  if (!status) return 'default'
  if (isRateLimitedStatus(status)) return 'critical'
  if (status.lastError) return 'caution'
  if (status.lastSuccessAt) return 'positive'
  return 'default'
}

function StatusRow({label, value}: {label: string; value: string}) {
  return (
    <Flex justify="space-between" gap={3}>
      <Text size={1} muted>
        {label}
      </Text>
      <Text size={1} weight="medium">
        {value}
      </Text>
    </Flex>
  )
}

export function TicketmasterFeedDesk({embedded = false}: {embedded?: boolean}) {
  const client = useClient({apiVersion})
  const [status, setStatus] = useState<TicketmasterFeedStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    const data = await client.fetch<TicketmasterFeedStatus | null>(STATUS_QUERY, {
      id: SITE_SETTINGS_DOCUMENT_ID,
    })
    setStatus(data ?? null)
  }, [client])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await loadStatus()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadStatus])

  const onRefreshStatus = useCallback(async () => {
    setMessage(null)
    setLoading(true)
    try {
      await loadStatus()
    } finally {
      setLoading(false)
    }
  }, [loadStatus])

  const onRevalidateFeed = useCallback(async () => {
    setMessage(null)
    setRefreshing(true)
    try {
      const response = await fetch(`${studioApiOrigin()}/api/studio/ticketmaster-revalidate`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        setMessage('Could not clear the feed cache.')
        return
      }
      setMessage(
        'Cache cleared. Open /events on the site to refetch the feed (and run venue image sync), then refresh status.',
      )
    } catch {
      setMessage('Could not clear the feed cache.')
    } finally {
      setRefreshing(false)
    }
  }, [])

  const tone = statusTone(status)
  const cacheExpiry = cacheExpiresAt(status?.lastSuccessAt)
  const cacheMinutes = Math.round(SCHEDULE_REVALIDATE_SECONDS / 60)

  const content = (
      <Stack space={4}>
        {!embedded ? (
          <Flex align="center" justify="space-between" gap={3}>
            <Flex align="center" gap={2}>
              <CalendarIcon />
              <Text size={2} weight="semibold">
                Ticketmaster feed
              </Text>
            </Flex>
            <Flex gap={2}>
              <Button
                icon={RefreshIcon}
                text="Refresh status"
                mode="ghost"
                disabled={loading || refreshing}
                onClick={onRefreshStatus}
              />
              <Button
                icon={LaunchIcon}
                text="Open /events"
                mode="ghost"
                tone="primary"
                as="a"
                href={`${studioApiOrigin()}/events`}
                target="_blank"
                rel="noopener noreferrer"
              />
            </Flex>
          </Flex>
        ) : (
          <Flex align="center" justify="flex-end" gap={2}>
            <Button
              icon={RefreshIcon}
              text="Refresh status"
              mode="ghost"
              disabled={loading || refreshing}
              onClick={onRefreshStatus}
            />
            <Button
              icon={LaunchIcon}
              text="Open /events"
              mode="ghost"
              tone="primary"
              as="a"
              href={`${studioApiOrigin()}/events`}
              target="_blank"
              rel="noopener noreferrer"
            />
          </Flex>
        )}

        <Text size={1} muted>
          Status is written to Site Settings when the server refreshes the cached Discovery feed (~{cacheMinutes}{' '}
          minutes). Requires SANITY_API_WRITE_TOKEN on the site.
        </Text>

        {loading ? (
          <Flex align="center" gap={2} padding={4}>
            <Spinner muted />
            <Text size={1} muted>
              Loading status…
            </Text>
          </Flex>
        ) : (
          <Card padding={4} radius={2} shadow={1} tone={tone}>
            <Stack space={4}>
              {isRateLimitedStatus(status) ? (
                <Text size={1} weight="semibold">
                  Ticketmaster returned HTTP 429 (rate limit). /events and /venues may show stale or empty data until
                  the quota resets and a fetch succeeds.
                </Text>
              ) : status?.lastError ? (
                <Text size={1} weight="semibold">
                  Last feed refresh failed ({errorLabel(status.lastError)}). The site may still serve an older cached
                  feed if one exists.
                </Text>
              ) : status?.lastSuccessAt ? (
                <Text size={1} weight="semibold">
                  Last feed refresh succeeded.
                </Text>
              ) : (
                <Text size={1} weight="semibold">
                  No feed status recorded yet. Visit /events on the site (or clear cache below) to run a fetch.
                </Text>
              )}

              <Stack space={3}>
                <StatusRow label="Last attempt" value={formatStatusWhen(status?.lastAttemptAt)} />
                <StatusRow label="Last success" value={formatStatusWhen(status?.lastSuccessAt)} />
                <StatusRow label="Last error" value={errorLabel(status?.lastError ?? null)} />
                <StatusRow
                  label="Last HTTP status"
                  value={status?.lastHttpStatus != null ? String(status.lastHttpStatus) : '—'}
                />
                <StatusRow
                  label="Events in feed"
                  value={status?.eventCount != null ? String(status.eventCount) : '—'}
                />
                <StatusRow
                  label="Venues in feed"
                  value={status?.venueCount != null ? String(status.venueCount) : '—'}
                />
                <StatusRow
                  label="API pages fetched"
                  value={status?.pagesFetched != null ? String(status.pagesFetched) : '—'}
                />
                <StatusRow label="DMA id" value={status?.dmaId ?? '—'} />
                <StatusRow label="API key fingerprint" value={status?.apiKeyFingerprint ?? '—'} />
                <StatusRow
                  label="Cache expires ~"
                  value={cacheExpiry ? formatStatusWhen(cacheExpiry.toISOString()) : '—'}
                />
              </Stack>
            </Stack>
          </Card>
        )}

        <Flex gap={2} wrap="wrap">
          <Button
            text={refreshing ? 'Clearing cache…' : 'Clear feed cache'}
            tone="primary"
            disabled={refreshing || loading}
            onClick={onRevalidateFeed}
          />
        </Flex>

        {message ? (
          <Text size={1} muted>
            {message}
          </Text>
        ) : null}
      </Stack>
  )

  if (embedded) return content

  return (
    <Box padding={4} sizing="border">
      {content}
    </Box>
  )
}
