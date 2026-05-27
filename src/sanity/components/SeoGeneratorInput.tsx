'use client'

import {LaunchIcon, ResetIcon, SparklesIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text, TextArea} from '@sanity/ui'
import {useCallback, useRef, useState} from 'react'
import {useDocumentOperation, useFormValue, useGetFormValue} from 'sanity'

import {
  SEO_DESCRIPTION_MAX_CHARS,
  SEO_TITLE_MAX_CHARS,
} from '@/lib/seoGeneration'
import {studioApiOrigin} from '@/lib/studioHomeCarousel'

type SeoResponse = {
  seoTitle?: string
  seoDescription?: string
  error?: string
  model?: string
  cached?: boolean
}

async function fetchSeoMetadata(
  documentId: string,
  options?: {
    regenerate?: boolean
    previousSeoTitle?: string
    previousSeoDescription?: string
    additionalPrompt?: string
    draft?: {
      _type?: string
      title?: string
      slug?: unknown
      excerpt?: string
      verdict?: unknown
      showDate?: unknown
      venueName?: unknown
      body?: unknown
    }
  },
): Promise<SeoResponse> {
  const response = await fetch(`${studioApiOrigin()}/api/studio/seo-generate`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({
      documentId,
      draft: options?.draft,
      regenerate: options?.regenerate === true,
      previousSeoTitle: options?.previousSeoTitle?.trim() || undefined,
      previousSeoDescription: options?.previousSeoDescription?.trim() || undefined,
      additionalPrompt: options?.additionalPrompt?.trim() || undefined,
    }),
  })
  const data = (await response.json().catch(() => ({}))) as SeoResponse
  if (!response.ok) {
    throw new Error(data.error || `SEO generation failed (${response.status})`)
  }
  return data
}

function charCount(text: string | undefined): number {
  return text?.trim().length ?? 0
}

export function SeoGeneratorPanel() {
  const getFormValue = useGetFormValue()
  // `useFormValue` updates as the form initializes/auto-saves drafts.
  const documentId = useFormValue(['_id']) as string | undefined
  const documentType = getFormValue(['_type']) as string | undefined
  const currentSeoTitle = useFormValue(['seoTitle']) as string | undefined
  const currentSeoDescription = useFormValue(['seoDescription']) as string | undefined

  // Sanity document operations expect the published id (no `drafts.` prefix).
  const operationId = (documentId ?? '').replace(/^drafts\./, '')
  const {patch} = useDocumentOperation(operationId, documentType ?? '')

  const [loading, setLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const additionalPromptRef = useRef(additionalPrompt)
  additionalPromptRef.current = additionalPrompt

  const applySeo = useCallback(
    (seoTitle: string, seoDescription: string) => {
      patch.execute([
        {set: {seoTitle: seoTitle.trim()}},
        {set: {seoDescription: seoDescription.trim()}},
      ])
    },
    [patch],
  )

  const runGenerate = useCallback(
    async (regenerate: boolean) => {
      const hasExisting = Boolean(currentSeoTitle?.trim() || currentSeoDescription?.trim())
      if (!regenerate && hasExisting) {
        const ok = window.confirm(
          'Replace the current SEO title and description with newly generated values?',
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
          slug: getFormValue(['slug']),
          excerpt: getFormValue(['excerpt']) as string | undefined,
          verdict: getFormValue(['verdict']),
          showDate: getFormValue(['showDate']),
          venueName: getFormValue(['venueName']),
          body: getFormValue(['body']),
        }

        const data = await fetchSeoMetadata(documentId ?? '', {
          regenerate,
          previousSeoTitle: regenerate ? currentSeoTitle : undefined,
          previousSeoDescription: regenerate ? currentSeoDescription : undefined,
          additionalPrompt: additionalPromptRef.current,
          draft,
        })

        const seoTitle = data.seoTitle?.trim() ?? ''
        const seoDescription = data.seoDescription?.trim() ?? ''
        if (!seoTitle || !seoDescription) {
          throw new Error('SEO generation returned empty fields.')
        }

        applySeo(seoTitle, seoDescription)
        setStatus(
          data.cached
            ? 'Loaded saved SEO metadata into the fields below.'
            : data.model
              ? `Generated with ${data.model}. Review the fields below, then publish when ready.`
              : 'Generated SEO metadata. Review the fields below, then publish when ready.',
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
        setIsRegenerating(false)
      }
    },
    [applySeo, currentSeoDescription, currentSeoTitle, getFormValue],
  )

  const disabled = loading || !documentType

  return (
    <Box paddingBottom={4}>
      <Stack space={4}>
        <Stack space={2}>
          <Text size={2} weight="semibold">
            Generate from body
          </Text>
          <Text size={1} muted>
            Creates SEO title and description from the article body using OpenAI. Values fill the
            fields below—edit them before publishing. Leave the prompt field empty to use the
            default rules, or add optional instructions for either button.
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
          <Stack space={2}>
            <Text size={1} muted>
              Current: title {charCount(currentSeoTitle)} / {SEO_TITLE_MAX_CHARS} chars ·
              description {charCount(currentSeoDescription)} / {SEO_DESCRIPTION_MAX_CHARS} chars
            </Text>
          </Stack>
        </Card>

        <Stack space={2}>
          <Text size={1} muted>
            Alter the default SEO prompt.
          </Text>
          <TextArea
            value={additionalPrompt}
            onChange={(event) => setAdditionalPrompt(event.currentTarget.value)}
            rows={2}
            placeholder="Optional: e.g. mention the venue, keep title under 55 characters…"
          />
        </Stack>

        {loading ? (
          <Flex align="center" gap={3}>
            <Spinner />
            <Text size={1} muted>
              {isRegenerating ? 'Regenerating SEO metadata…' : 'Generating SEO metadata…'}
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
            text="Generate from body"
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
