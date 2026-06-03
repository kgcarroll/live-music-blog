'use client'

import {LaunchIcon, RefreshIcon} from '@sanity/icons'
import {Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useEffect, useState} from 'react'

import type {ResendUsageSummary} from '@/lib/resendUsage'
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

function panelTone(summary: ResendUsageSummary | null): 'positive' | 'caution' | 'critical' | 'default' {
  if (!summary) return 'default'
  if (!summary.apiKeyConfigured) return 'critical'
  if (summary.usingDefaultFrom || !summary.contactFormConfigured) return 'caution'
  return 'positive'
}

export function ResendUsagePanel() {
  const [summary, setSummary] = useState<ResendUsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const loadUsage = useCallback(async () => {
    const response = await fetch(`${studioApiOrigin()}/api/studio/resend-usage?days=30`, {
      credentials: 'same-origin',
    })
    if (!response.ok) {
      throw new Error('Could not load Resend usage.')
    }
    return (await response.json()) as ResendUsageSummary
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
        if (!cancelled) setMessage('Could not load Resend usage.')
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
      setMessage('Could not load Resend usage.')
    } finally {
      setLoading(false)
    }
  }, [loadUsage])

  const tone = panelTone(summary)

  return (
    <Stack space={4}>
      <Flex align="center" justify="space-between" gap={3}>
        <Text size={1} muted>
          Live data from the Resend API for contact form and newsletter email. Sent-email counts cover
          the last 30 days. Compare quotas and billing in the Resend dashboard.
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
            {!summary?.apiKeyConfigured ? (
              <Text size={1} weight="semibold">
                Resend is not configured. Set RESEND_API_KEY on the site.
              </Text>
            ) : (
              <Text size={1} weight="semibold">
                Contact form {summary.contactFormConfigured ? 'ready' : 'needs CONTACT_TO_EMAIL'}.
                {summary.usingDefaultFrom
                  ? ' Using Resend test sender (onboarding@resend.dev) until RESEND_FROM is set.'
                  : null}
              </Text>
            )}

            {summary?.apiError ? (
              <Text size={1} muted>
                {summary.apiError}
              </Text>
            ) : null}

            <Stack space={3}>
              <Text size={1} weight="semibold">
                Configuration
              </Text>
              <StatusRow label="From address" value={summary?.fromAddress ?? '—'} />
              <StatusRow
                label="Contact inbox"
                value={summary?.contactToEmail ?? '—'}
              />
              <StatusRow
                label="Newsletter audience"
                value={
                  summary?.configuredAudienceName ??
                  summary?.configuredAudienceId ??
                  '—'
                }
              />
              <StatusRow
                label="Primary domain"
                value={
                  summary?.primaryDomainName
                    ? `${summary.primaryDomainName} (${summary.primaryDomainStatus ?? 'unknown'})`
                    : '—'
                }
              />
              <StatusRow
                label="Verified domains"
                value={summary?.domainCount != null ? formatInteger(summary.domainCount) : '—'}
              />
            </Stack>

            <Stack space={3}>
              <Text size={1} weight="semibold">
                Newsletter
              </Text>
              <StatusRow
                label="Audiences"
                value={summary?.audienceCount != null ? formatInteger(summary.audienceCount) : '—'}
              />
              <StatusRow
                label="Contacts (configured audience)"
                value={
                  summary?.newsletterContactCount != null
                    ? formatInteger(summary.newsletterContactCount)
                    : '—'
                }
                emphasize
              />
              <StatusRow
                label="Broadcasts"
                value={summary?.broadcastCount != null ? formatInteger(summary.broadcastCount) : '—'}
              />
              <StatusRow
                label="Last broadcast"
                value={summary ? formatStatusWhen(summary.lastBroadcastAt) : '—'}
              />
              <StatusRow
                label="Last broadcast status"
                value={summary?.lastBroadcastStatus ?? '—'}
              />
            </Stack>

            <Stack space={3}>
              <Text size={1} weight="semibold">
                Sent emails (last {summary?.periodDays ?? 30} days)
              </Text>
              <StatusRow
                label="Emails sent"
                value={summary?.emailsInPeriod != null ? formatInteger(summary.emailsInPeriod) : '—'}
                emphasize
              />
              <StatusRow
                label="Delivered / opened / clicked"
                value={
                  summary?.emailsDelivered != null ? formatInteger(summary.emailsDelivered) : '—'
                }
              />
              <StatusRow
                label="Bounced"
                value={summary?.emailsBounced != null ? formatInteger(summary.emailsBounced) : '—'}
              />
              <StatusRow
                label="Failed / complained"
                value={summary?.emailsFailed != null ? formatInteger(summary.emailsFailed) : '—'}
              />
              <StatusRow
                label="Other status"
                value={
                  summary?.emailsOtherStatus != null ? formatInteger(summary.emailsOtherStatus) : '—'
                }
              />
              <StatusRow
                label="Last email"
                value={summary ? formatStatusWhen(summary.lastEmailAt) : '—'}
              />
              <StatusRow
                label="Last email subject"
                value={summary?.lastEmailSubject ?? '—'}
              />
              <StatusRow
                label="Fetched at"
                value={summary ? formatStatusWhen(summary.fetchedAt) : '—'}
              />
            </Stack>

            <Flex gap={2} wrap="wrap">
              <Button
                as="a"
                href={summary?.dashboardEmailsUrl ?? 'https://resend.com/emails'}
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="Resend Emails"
              />
              <Button
                as="a"
                href={summary?.dashboardUsageUrl ?? 'https://resend.com/settings/usage'}
                icon={LaunchIcon}
                mode="ghost"
                rel="noopener noreferrer"
                target="_blank"
                text="Resend Usage"
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
