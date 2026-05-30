'use client'

import {LaunchIcon, ResetIcon, SparklesIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text, TextArea} from '@sanity/ui'
import {useCallback, useRef, useState} from 'react'
import {useDocumentOperation, useGetFormValue} from 'sanity'

import {studioApiOrigin} from '@/lib/studioHomeCarousel'

type ShowMetadataResponse = {
  showDate?: string | null
  venueName?: string | null
  confidence?: 'high' | 'medium' | 'low'
  note?: string | null
  error?: string
  model?: string
}

async function fetchLiveConcertMetadata(
  documentId: string,
  options?: {
    regenerate?: boolean
    previousShowDate?: string
    previousVenueName?: string
    additionalPrompt?: string
    draft?: {
      _type?: string
      title?: string
      excerpt?: string
      verdict?: unknown
      reviewSubject?: unknown
      showDate?: unknown
      venueName?: unknown
      body?: unknown
    }
  },
): Promise<ShowMetadataResponse> {
  const response = await fetch(`${studioApiOrigin()}/api/studio/show-metadata-generate`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({
      documentId,
      draft: options?.draft,
      regenerate: options?.regenerate === true,
      previousShowDate: options?.previousShowDate?.trim() || undefined,
      previousVenueName: options?.previousVenueName?.trim() || undefined,
      additionalPrompt: options?.additionalPrompt?.trim() || undefined,
    }),
  })
  const data = (await response.json().catch(() => ({}))) as ShowMetadataResponse
  if (!response.ok) {
    throw new Error(data.error || `Concert metadata suggestion failed (${response.status})`)
  }
  return data
}

function formatShowDatePreview(value: string | null | undefined): string {
  if (!value?.trim()) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
}

function confidenceLabel(confidence: ShowMetadataResponse['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'High confidence'
    case 'medium':
      return 'Medium confidence'
    default:
      return 'Low confidence'
  }
}

export function LiveConcertJsonLdSuggestPanel() {
  const getFormValue = useGetFormValue()
  const documentId = getFormValue(['_id']) as string | undefined
  const documentType = getFormValue(['_type']) as string | undefined
  const currentShowDate = getFormValue(['showDate']) as string | undefined
  const currentVenueName = getFormValue(['venueName']) as string | undefined

  const operationId = (documentId ?? '').replace(/^drafts\./, '')
  const {patch} = useDocumentOperation(operationId, documentType ?? '')

  const [loading, setLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const additionalPromptRef = useRef(additionalPrompt)
  additionalPromptRef.current = additionalPrompt

  const applyConcertFields = useCallback(
    (showDate: string | null | undefined, venueName: string | null | undefined) => {
      const ops: Array<{set: Record<string, string>}> = []
      if (showDate?.trim()) {
        ops.push({set: {showDate: showDate.trim()}})
      }
      if (venueName?.trim()) {
        ops.push({set: {venueName: venueName.trim()}})
      }
      if (ops.length) {
        patch.execute(ops)
      }
    },
    [patch],
  )

  const runGenerate = useCallback(
    async (regenerate: boolean) => {
      const hasExisting = Boolean(currentShowDate?.trim() || currentVenueName?.trim())
      if (!regenerate && hasExisting) {
        const ok = window.confirm(
          'Replace the current concert date and/or venue with newly suggested values?',
        )
        if (!ok) return
      }

      setLoading(true)
      setIsRegenerating(regenerate)
      setError(null)
      setStatus(null)

      try {
        const draft = {
          _type: getFormValue(['_type']) as string | undefined,
          title: getFormValue(['title']) as string | undefined,
          excerpt: getFormValue(['excerpt']) as string | undefined,
          verdict: getFormValue(['verdict']),
          reviewSubject: getFormValue(['reviewSubject']),
          showDate: getFormValue(['showDate']),
          venueName: getFormValue(['venueName']),
          body: getFormValue(['body']),
        }

        const data = await fetchLiveConcertMetadata(documentId ?? '', {
          regenerate,
          previousShowDate: regenerate ? currentShowDate : undefined,
          previousVenueName: regenerate ? currentVenueName : undefined,
          additionalPrompt: additionalPromptRef.current,
          draft,
        })

        applyConcertFields(data.showDate, data.venueName)

        const parts = [
          data.model ? `Suggested with ${data.model}.` : 'Suggestion ready.',
          confidenceLabel(data.confidence),
          data.note,
          data.showDate ? `Concert date → ${formatShowDatePreview(data.showDate)}` : null,
          data.venueName ? `Venue → ${data.venueName}` : null,
          'Review the fields below, then publish when ready.',
        ].filter(Boolean)

        setStatus(parts.join(' '))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
        setIsRegenerating(false)
      }
    },
    [applyConcertFields, currentShowDate, currentVenueName, documentId, getFormValue],
  )

  const disabled = loading || documentType !== 'review'

  return (
    <Box paddingTop={2} paddingBottom={2}>
      <Stack space={4}>
        <Stack space={2}>
          <Text size={2} weight="semibold">
            Suggest concert date &amp; venue
          </Text>
          <Text size={1} muted>
            Optional. Fills the concert fields below for Google structured data. Uses the review
            text plus your Ticketmaster schedule and archives as reference.
            {' '}
            <a
              href="https://platform.openai.com/settings/organization/usage"
              target="_blank"
              rel="noopener noreferrer"
              style={{display: 'inline-flex', alignItems: 'center', gap: 4}}
            >
              OpenAI Usage <LaunchIcon />
            </a>
          </Text>
        </Stack>

        <Card padding={3} radius={2} tone="transparent" border>
          <Text size={1} muted>
            Current: {formatShowDatePreview(currentShowDate)} ·{' '}
            {currentVenueName?.trim() || 'Venue not set'}
          </Text>
        </Card>

        <Stack space={2}>
          <Text size={1} muted>
            Optional instructions for the suggestion.
          </Text>
          <TextArea
            value={additionalPrompt}
            onChange={(event) => setAdditionalPrompt(event.currentTarget.value)}
            rows={2}
            placeholder="Optional: e.g. matinee, festival main stage, May 28 at Union Transfer…"
          />
        </Stack>

        {loading ? (
          <Flex align="center" gap={3}>
            <Spinner />
            <Text size={1} muted>
              {isRegenerating ? 'Regenerating…' : 'Suggesting concert date and venue…'}
            </Text>
          </Flex>
        ) : null}

        {error ? (
          <Card padding={3} radius={2} tone="critical">
            <Text size={1}>{error}</Text>
          </Card>
        ) : null}

        {status ? (
          <Card padding={3} radius={2} tone="positive">
            <Text size={1}>{status}</Text>
          </Card>
        ) : null}

        <Flex gap={2} wrap="wrap">
          <Button
            icon={SparklesIcon}
            text="Suggest from body"
            tone="primary"
            disabled={disabled}
            onClick={() => void runGenerate(false)}
          />
          <Button
            icon={ResetIcon}
            mode="ghost"
            text="Regenerate"
            disabled={disabled}
            onClick={() => void runGenerate(true)}
          />
        </Flex>
      </Stack>
    </Box>
  )
}
