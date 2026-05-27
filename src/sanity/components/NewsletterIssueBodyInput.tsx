'use client'

import {SparklesIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useMemo, useState} from 'react'
import {set, type ArrayOfObjectsInputProps} from 'sanity'

import {studioApiOrigin} from '@/lib/studioHomeCarousel'

type GenerateResponse = {
  blocks?: unknown[]
  model?: string
  rawRssItemCount?: number
  filteredItemCount?: number
  selectedItemCount?: number
  generatedItemCount?: number
  error?: string
}

async function generateNewsletterBody(payload: {days: number; maxItems: number}) {
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
  return {
    blocks: data.blocks,
    model: data.model,
    rawRssItemCount: data.rawRssItemCount,
    filteredItemCount: data.filteredItemCount,
    selectedItemCount: data.selectedItemCount,
    generatedItemCount: data.generatedItemCount,
  }
}

export function NewsletterIssueBodyInput(props: ArrayOfObjectsInputProps) {
  const {readOnly, onChange} = props

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<string | null>(null)
  const [counts, setCounts] = useState<string | null>(null)

  const hasBody = useMemo(() => Array.isArray(props.value) && props.value.length > 0, [props.value])
  const canGenerate = !readOnly

  const run = useCallback(async () => {
    if (!canGenerate) return
    if (
      hasBody &&
      !window.confirm('Replace the current body with a generated 30-day digest? This only updates the draft.')
    ) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await generateNewsletterBody({days: 30, maxItems: 200})
      onChange(set(result.blocks as any))
      setModel(result.model ?? null)
      setCounts(
        result.rawRssItemCount != null &&
          result.filteredItemCount != null &&
          result.generatedItemCount != null
          ? `Found ${result.rawRssItemCount} in RSS · ${result.filteredItemCount} in last 30 days · generated ${result.generatedItemCount}`
          : null,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate newsletter body.')
    } finally {
      setLoading(false)
    }
  }, [canGenerate, hasBody, onChange])

  return (
    <Stack space={3}>
      <Card padding={3} radius={2} border>
        <Flex gap={2} wrap="wrap" align="center" justify="space-between">
          <Flex gap={2} wrap="wrap" align="center">
            <Button
              icon={SparklesIcon}
              text={loading ? 'Generating…' : 'Generate body (last 30 days)'}
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

