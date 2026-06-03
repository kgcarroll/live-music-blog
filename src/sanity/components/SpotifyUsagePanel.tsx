'use client'

import {LaunchIcon, RefreshIcon} from '@sanity/icons'
import {Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useEffect, useState} from 'react'

import type {SpotifyUsageSummary} from '@/lib/spotifyUsage'
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

function connectionLabel(status: SpotifyUsageSummary['apiConnectionStatus']): string {
  switch (status) {
    case 'ok':
      return 'Connected'
    case 'auth_failed':
      return 'Auth failed'
    default:
      return 'Not configured'
  }
}

function panelTone(summary: SpotifyUsageSummary | null): 'positive' | 'caution' | 'critical' | 'default' {
  if (!summary) return 'default'
  if (!summary.apiConfigured || summary.apiConnectionStatus === 'auth_failed') return 'critical'
  if (!summary.openAiCurationConfigured) return 'caution'
  return 'positive'
}

export function SpotifyUsagePanel() {
  const [summary, setSummary] = useState<SpotifyUsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const loadUsage = useCallback(async () => {
    const response = await fetch(`${studioApiOrigin()}/api/studio/spotify-usage`, {
      credentials: 'same-origin',
    })
    if (!response.ok) {
      throw new Error('Could not load Spotify usage.')
    }
    return (await response.json()) as SpotifyUsageSummary
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
        if (!cancelled) setMessage('Could not load Spotify usage.')
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
      setMessage('Could not load Spotify usage.')
    } finally {
      setLoading(false)
    }
  }, [loadUsage])

  const tone = panelTone(summary)

  return (
    <Stack space={4}>
      <Flex align="center" justify="space-between" gap={3}>
        <Text size={1} muted>
          Spotify does not expose billing or request quotas via API. This tab verifies Client
          Credentials and summarizes cached artist matches and event curations in Sanity. Lineup
          curation uses OPENAI_API_KEY; searches use SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.
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
            {!summary?.apiConfigured ? (
              <Text size={1} weight="semibold">
                Spotify Web API is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.
              </Text>
            ) : summary.apiConnectionStatus === 'auth_failed' ? (
              <Text size={1} weight="semibold">
                Credentials are set but token exchange failed. Check the Client ID and secret in the
                Spotify Developer Dashboard.
              </Text>
            ) : !summary.openAiCurationConfigured ? (
              <Text size={1} weight="semibold">
                API connection OK. Set OPENAI_API_KEY to run lineup curation on feed sync.
              </Text>
            ) : (
              <Text size={1} weight="semibold">
                Web API connected. Cached matches and curations reflect feed sync and npm run
                spotify-artist:sync.
              </Text>
            )}

            <Stack space={3}>
              <Text size={1} weight="semibold">
                API
              </Text>
              <StatusRow
                label="Connection"
                value={summary ? connectionLabel(summary.apiConnectionStatus) : '—'}
                emphasize
              />
              <StatusRow
                label="Client ID"
                value={summary?.clientIdFingerprint ?? '—'}
              />
              <StatusRow
                label="OpenAI curation"
                value={summary?.openAiCurationConfigured ? 'Configured' : 'Not set'}
              />
              <StatusRow
                label="Curation version"
                value={summary ? String(summary.curationVersion) : '—'}
              />
              <StatusRow
                label="Max events per feed sync"
                value={summary ? formatInteger(summary.syncMaxEventsPerRun) : '—'}
              />
            </Stack>

            <Stack space={3}>
              <Text size={1} weight="semibold">
                Artist matches (Sanity)
              </Text>
              <StatusRow
                label="Total cached"
                value={summary ? formatInteger(summary.artistMatchesTotal) : '—'}
                emphasize
              />
              <StatusRow
                label="Matched"
                value={summary ? formatInteger(summary.artistMatched) : '—'}
              />
              <StatusRow
                label="Ambiguous"
                value={summary ? formatInteger(summary.artistAmbiguous) : '—'}
              />
              <StatusRow
                label="Not found"
                value={summary ? formatInteger(summary.artistNotFound) : '—'}
              />
              <StatusRow
                label="Stale (need re-sync)"
                value={summary ? formatInteger(summary.artistStale) : '—'}
              />
              <StatusRow
                label="Last resolved"
                value={summary ? formatStatusWhen(summary.lastArtistResolvedAt) : '—'}
              />
            </Stack>

            <Stack space={3}>
              <Text size={1} weight="semibold">
                Event curations (Sanity)
              </Text>
              <StatusRow
                label="Events curated"
                value={summary ? formatInteger(summary.eventCurationsTotal) : '—'}
                emphasize
              />
              <StatusRow
                label="Embeds planned"
                value={summary ? formatInteger(summary.embedsPlanned) : '—'}
              />
              <StatusRow
                label="Stale curations"
                value={summary ? formatInteger(summary.eventCurationsStale) : '—'}
              />
              <StatusRow
                label="Last curated"
                value={summary ? formatStatusWhen(summary.lastEventCuratedAt) : '—'}
              />
              <StatusRow
                label="Fetched at"
                value={summary ? formatStatusWhen(summary.fetchedAt) : '—'}
              />
            </Stack>

            <Flex gap={2} wrap="wrap">
              <Button
                as="a"
                href={summary?.dashboardUrl ?? 'https://developer.spotify.com/dashboard'}
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="Spotify Dashboard"
              />
              <Button
                as="a"
                href={
                  summary?.documentationUrl ??
                  'https://developer.spotify.com/documentation/web-api'
                }
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="Web API Docs"
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
