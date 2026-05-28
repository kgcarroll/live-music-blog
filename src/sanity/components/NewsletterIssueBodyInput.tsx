'use client'

import {SparklesIcon} from '@sanity/icons'
import {Box, Button, Card, Checkbox, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useMemo, useState} from 'react'
import {set, useDocumentOperation, useFormValue, useGetFormValue, type ArrayOfObjectsInputProps} from 'sanity'

import {
  NEWSLETTER_DIGEST_DAYS,
  NEWSLETTER_EVENTS_DAYS,
  NEWSLETTER_EVENTS_LIMIT,
  NEWSLETTER_MAX_PER_SECTION,
} from '@/lib/newsletterBodyGeneration'
import {studioApiOrigin} from '@/lib/studioHomeCarousel'

type SectionCount = {inIssue: number; inWindow: number}

type GenerateResponse = {
  blocks?: unknown[]
  model?: string
  emailSubject?: string
  previewText?: string
  windowPostCount?: number
  selectedPostCount?: number
  generatedItemCount?: number
  sectionCounts?: {
    news?: SectionCount
    review?: SectionCount
    interview?: SectionCount
  }
  upcomingEventCount?: number
  eventsError?: string | null
  error?: string
}

async function generateNewsletterBody(payload: {
  days: number
  maxPerSection: number
  includeUpcomingShows: boolean
  eventsDays: number
  eventsLimit: number
}) {
  const response = await fetch(`${studioApiOrigin()}/api/studio/newsletter-issue-generate`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => ({}))) as GenerateResponse
  if (!response.ok) throw new Error(data.error || `Generate failed (${response.status})`)
  if (!Array.isArray(data.blocks) || !data.blocks.length) throw new Error('Generator returned no blocks.')
  return data
}

function formatSectionCounts(counts: GenerateResponse['sectionCounts']): string | null {
  if (!counts) return null
  const parts: string[] = []
  const news = counts.news
  const review = counts.review
  const interview = counts.interview
  if (news) parts.push(`news ${news.inIssue}/${news.inWindow}`)
  if (review) parts.push(`reviews ${review.inIssue}/${review.inWindow}`)
  if (interview) parts.push(`interviews ${interview.inIssue}/${interview.inWindow}`)
  return parts.length ? parts.join(' · ') : null
}

export function NewsletterIssueBodyInput(props: ArrayOfObjectsInputProps) {
  const {readOnly, onChange} = props
  const getFormValue = useGetFormValue()
  const documentId = useFormValue(['_id']) as string | undefined
  const documentType = getFormValue(['_type']) as string | undefined

  // Document operations expect the published id (no `drafts.` prefix).
  const operationId = (documentId ?? '').replace(/^drafts\./, '')
  const {patch} = useDocumentOperation(operationId, documentType ?? '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<string | null>(null)
  const [counts, setCounts] = useState<string | null>(null)
  const [includeUpcomingShows, setIncludeUpcomingShows] = useState(false)

  const hasBody = useMemo(() => Array.isArray(props.value) && props.value.length > 0, [props.value])
  const canGenerate = !readOnly

  const run = useCallback(async () => {
    if (!canGenerate) return
    if (
      hasBody &&
      !window.confirm(
        `Replace the current body with a generated ${NEWSLETTER_DIGEST_DAYS}-day biweekly digest? This only updates the draft.`,
      )
    ) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await generateNewsletterBody({
        days: NEWSLETTER_DIGEST_DAYS,
        maxPerSection: NEWSLETTER_MAX_PER_SECTION,
        includeUpcomingShows,
        eventsDays: NEWSLETTER_EVENTS_DAYS,
        eventsLimit: NEWSLETTER_EVENTS_LIMIT,
      })
      onChange(set(result.blocks as any))
      if (patch && (result.emailSubject?.trim() || result.previewText?.trim())) {
        patch.execute([
          ...(result.emailSubject?.trim() ? [{set: {emailSubject: result.emailSubject.trim()}}] : []),
          ...(result.previewText?.trim() ? [{set: {previewText: result.previewText.trim()}}] : []),
        ])
      }
      setModel(result.model ?? null)

      const sectionLine = formatSectionCounts(result.sectionCounts)
      const eventsLine =
        includeUpcomingShows && result.upcomingEventCount != null
          ? `${result.upcomingEventCount} upcoming shows`
          : null
      const eventsWarn =
        includeUpcomingShows && result.eventsError === 'not_configured'
          ? 'shows skipped (Ticketmaster not configured)'
          : includeUpcomingShows && result.eventsError === 'api_error'
            ? 'shows unavailable (Ticketmaster error)'
            : null

      const lines = [
        result.windowPostCount != null
          ? `${result.windowPostCount} articles in last ${NEWSLETTER_DIGEST_DAYS} days`
          : null,
        sectionLine,
        eventsLine,
        eventsWarn,
      ].filter(Boolean)

      setCounts(lines.length ? lines.join(' · ') : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate newsletter body.')
    } finally {
      setLoading(false)
    }
  }, [canGenerate, hasBody, includeUpcomingShows, onChange, patch])

  return (
    <Stack space={3}>
      <Card padding={3} radius={2} border>
        <Stack space={3}>
          <Text size={1} muted>
            Builds a biweekly digest from published Sanity articles (up to {NEWSLETTER_MAX_PER_SECTION} per
            section: news, reviews, interviews). Draft only.
          </Text>

          <Flex align="center">
            <Checkbox
              checked={includeUpcomingShows}
              disabled={!canGenerate || loading}
              onChange={(event) => setIncludeUpcomingShows(event.currentTarget.checked)}
            />
            <Box flex={1} paddingLeft={3}>
              <Stack space={2}>
                <Text size={1} weight="medium">
                  Include upcoming shows
                </Text>
                <Text size={1} muted>
                  Adds up to {NEWSLETTER_EVENTS_LIMIT} concerts in the next {NEWSLETTER_EVENTS_DAYS} days,
                  spread across days when possible (not only the soonest shows). Links to /events/[slug].
                </Text>
              </Stack>
            </Box>
          </Flex>

          <Flex gap={2} wrap="wrap" align="center" justify="space-between">
            <Flex gap={2} wrap="wrap" align="center">
              <Button
                icon={SparklesIcon}
                text={loading ? 'Generating…' : `Generate body (last ${NEWSLETTER_DIGEST_DAYS} days)`}
                tone="primary"
                mode="default"
                disabled={!canGenerate || loading}
                onClick={() => void run()}
              />
              {loading ? (
                <Flex align="center" gap={2}>
                  <Spinner muted />
                  <Text size={1} muted>
                    Writing digest…
                  </Text>
                </Flex>
              ) : null}
            </Flex>
            {model ? (
              <Stack space={2}>
                <Text size={1} muted>
                  {model}
                </Text>
                {counts ? (
                  <Text size={1} muted>
                    {counts}
                  </Text>
                ) : null}
              </Stack>
            ) : (
              <Text size={1} muted>
                Draft only
              </Text>
            )}
          </Flex>
        </Stack>
      </Card>

      {props.renderDefault(props)}

      {error ? (
        <Card padding={3} radius={2} tone="critical">
          <Text size={1}>{error}</Text>
        </Card>
      ) : null}
    </Stack>
  )
}
