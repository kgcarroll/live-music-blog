'use client'

import {LaunchIcon, RefreshIcon} from '@sanity/icons'
import {Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useEffect, useState} from 'react'

import type {AlgoliaUsageSummary} from '@/lib/algoliaUsage'
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

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB'] as const
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

function panelTone(summary: AlgoliaUsageSummary | null): 'positive' | 'caution' | 'critical' | 'default' {
  if (!summary) return 'default'
  if (!summary.searchConfigured || !summary.adminConfigured) return 'critical'
  if (!summary.usageAvailable) return 'caution'
  return 'positive'
}

export function AlgoliaUsagePanel() {
  const [summary, setSummary] = useState<AlgoliaUsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const loadUsage = useCallback(async () => {
    const response = await fetch(`${studioApiOrigin()}/api/studio/algolia-usage?days=30`, {
      credentials: 'same-origin',
    })
    if (!response.ok) {
      throw new Error('Could not load Algolia usage.')
    }
    return (await response.json()) as AlgoliaUsageSummary
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
        if (!cancelled) setMessage('Could not load Algolia usage.')
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
      setMessage('Could not load Algolia usage.')
    } finally {
      setLoading(false)
    }
  }, [loadUsage])

  const tone = panelTone(summary)
  const configuredIndex = summary?.indexName ?? '—'

  return (
    <Stack space={4}>
      <Flex align="center" justify="space-between" gap={3}>
        <Text size={1} muted>
          Index stats from the Search API; operation totals from the Usage API for the last 30 days.
          Compare with the Algolia dashboard for billing. Reindex via npm run algolia:index or the
          Sanity webhook.
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
            {!summary?.searchConfigured ? (
              <Text size={1} weight="semibold">
                Public search is not configured. Set NEXT_PUBLIC_ALGOLIA_APPLICATION_ID,
                NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY, and NEXT_PUBLIC_ALGOLIA_INDEX_NAME.
              </Text>
            ) : !summary.adminConfigured ? (
              <Text size={1} weight="semibold">
                Admin key is not configured. Set ALGOLIA_ADMIN_API_KEY for index stats and reindex.
              </Text>
            ) : summary.usageAvailable ? (
              <Text size={1} weight="semibold">
                Live data from Algolia for index {configuredIndex} (application{' '}
                {summary.applicationId ?? '—'}).
              </Text>
            ) : (
              <Text size={1} weight="semibold">
                Index stats loaded. Usage totals unavailable
                {summary.usageError ? `: ${summary.usageError}` : '.'}
              </Text>
            )}

            {summary?.usageError && summary.usageAvailable ? (
              <Text size={1} muted>
                {summary.usageError}
              </Text>
            ) : null}

            <Stack space={3}>
              <Text size={1} weight="semibold">
                Index ({configuredIndex})
              </Text>
              <StatusRow
                label="Records"
                value={summary?.recordCount != null ? formatInteger(summary.recordCount) : '—'}
                emphasize
              />
              <StatusRow
                label="Data size"
                value={
                  summary?.dataSizeBytes != null ? formatBytes(summary.dataSizeBytes) : '—'
                }
              />
              <StatusRow
                label="File size"
                value={
                  summary?.fileSizeBytes != null ? formatBytes(summary.fileSizeBytes) : '—'
                }
              />
              <StatusRow
                label="Index updated"
                value={summary ? formatStatusWhen(summary.indexUpdatedAt) : '—'}
              />
              <StatusRow
                label="Pending tasks"
                value={
                  summary?.pendingTask == null ? '—' : summary.pendingTask ? 'Yes' : 'No'
                }
              />
              <StatusRow
                label="Indices in app"
                value={summary?.totalIndices != null ? formatInteger(summary.totalIndices) : '—'}
              />
            </Stack>

            <Stack space={3}>
              <Text size={1} weight="semibold">
                Operations (last {summary?.periodDays ?? 30} days)
              </Text>
              <StatusRow
                label="Search operations"
                value={
                  summary?.totalSearchOperations != null
                    ? formatInteger(summary.totalSearchOperations)
                    : '—'
                }
                emphasize
              />
              <StatusRow
                label="Indexing operations"
                value={
                  summary?.totalIndexingOperations != null
                    ? formatInteger(summary.totalIndexingOperations)
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
                href={summary?.dashboardUsageUrl ?? 'https://dashboard.algolia.com/account/billing/usage'}
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="Algolia Usage"
              />
              <Button
                as="a"
                href={
                  summary?.dashboardExplorerUrl ?? 'https://dashboard.algolia.com/'
                }
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="Index Explorer"
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
