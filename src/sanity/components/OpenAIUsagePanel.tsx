'use client'

import {LaunchIcon, RefreshIcon} from '@sanity/icons'
import {Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useEffect, useState} from 'react'

import type {OpenAIUsageSummary} from '@/lib/openaiUsage'
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

function formatUsd(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return '—'
  if (currency.toLowerCase() === 'usd') {
    return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(amount)
  }
  return `${amount.toFixed(4)} ${currency.toUpperCase()}`
}

function panelTone(
  summary: OpenAIUsageSummary | null,
): 'positive' | 'caution' | 'critical' | 'default' {
  if (!summary) return 'default'
  if (summary.error === 'forbidden' || summary.error === 'not_configured') return 'critical'
  if (summary.error) return 'caution'
  return 'positive'
}

export function OpenAIUsagePanel() {
  const [summary, setSummary] = useState<OpenAIUsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const loadUsage = useCallback(async () => {
    const response = await fetch(`${studioApiOrigin()}/api/studio/openai-usage?days=30`, {
      credentials: 'same-origin',
    })
    if (!response.ok) {
      throw new Error('Could not load OpenAI usage.')
    }
    return (await response.json()) as OpenAIUsageSummary
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
        if (!cancelled) setMessage('Could not load OpenAI usage.')
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
      setMessage('Could not load OpenAI usage.')
    } finally {
      setLoading(false)
    }
  }, [loadUsage])

  const tone = panelTone(summary)

  return (
    <Stack space={4}>
      <Flex align="center" justify="space-between" gap={3}>
        <Text size={1} muted>
          Organization-wide completions usage for the last {summary?.periodDays ?? 30} days. Requires
          OPENAI_ADMIN_API_KEY with read access on the site.
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
            {summary?.error === 'not_configured' ? (
              <Text size={1} weight="semibold">
                OpenAI is not configured. Set OPENAI_ADMIN_API_KEY on the site (recommended) or an API
                key with the api.usage.read scope.
              </Text>
            ) : summary?.error === 'forbidden' ? (
              <Text size={1} weight="semibold">
                This API key cannot read organization usage ({summary.errorMessage ?? 'forbidden'}).
                Create an admin key at platform.openai.com → Settings → Admin keys.
              </Text>
            ) : summary?.error ? (
              <Text size={1} weight="semibold">
                Could not load full metrics: {summary.errorMessage ?? summary.error}
              </Text>
            ) : (
              <Text size={1} weight="semibold">
                Totals from OpenAI Usage API (completions). Other product lines (e.g. embeddings) are not
                included here.
              </Text>
            )}

            <Stack space={3}>
              <StatusRow
                label="Total requests"
                value={summary ? formatInteger(summary.totalRequests) : '—'}
                emphasize
              />
              <StatusRow
                label="Total tokens"
                value={summary ? formatInteger(summary.totalTokens) : '—'}
              />
              <StatusRow
                label="Input tokens"
                value={summary ? formatInteger(summary.totalInputTokens) : '—'}
              />
              <StatusRow
                label="Output tokens"
                value={summary ? formatInteger(summary.totalOutputTokens) : '—'}
              />
              <StatusRow
                label="Total spend"
                value={
                  summary && summary.error !== 'not_configured' && summary.error !== 'forbidden'
                    ? formatUsd(summary.totalSpendUsd, summary.currency)
                    : '—'
                }
                emphasize
              />
              <StatusRow
                label="Fetched at"
                value={summary ? formatStatusWhen(summary.fetchedAt) : '—'}
              />
            </Stack>

            <Flex gap={2} wrap="wrap">
              <Button
                as="a"
                href="https://platform.openai.com/settings/organization/usage"
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="OpenAI Usage"
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
