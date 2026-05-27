'use client'

import {ResetIcon, SparklesIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {useCallback, useMemo, useState} from 'react'
import {set, type StringInputProps, useFormValue, useGetFormValue} from 'sanity'

import {studioApiOrigin} from '@/lib/studioHomeCarousel'

type AltResponse = {alt?: string; error?: string; model?: string}

async function generateAlt(payload: {
  assetRef: string
  documentType?: string
  documentTitle?: string
  captionHint?: string
}): Promise<{alt: string; model?: string}> {
  const response = await fetch(`${studioApiOrigin()}/api/studio/alt-generate`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as AltResponse
  if (!response.ok) {
    throw new Error(data.error || `Alt generation failed (${response.status})`)
  }
  const alt = String(data.alt ?? '').trim()
  if (!alt) throw new Error('Alt generation returned empty text.')
  return {alt, model: data.model}
}

export function AiAltTextInput(props: StringInputProps) {
  const {value, onChange, readOnly} = props

  const parentPath = useMemo(() => props.path.slice(0, -1), [props.path])
  const assetRef = useFormValue([...parentPath, 'asset', '_ref']) as string | undefined
  const captionHint = useFormValue([...parentPath, 'caption']) as string | undefined

  const getFormValue = useGetFormValue()
  const documentType = getFormValue(['_type']) as string | undefined
  const documentTitle = getFormValue(['title']) as string | undefined

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<string | null>(null)

  const canGenerate = Boolean(assetRef && !readOnly)

  const run = useCallback(async () => {
    if (!assetRef) {
      setError('Upload/select an image first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await generateAlt({
        assetRef,
        documentType,
        documentTitle,
        captionHint: captionHint?.trim() || undefined,
      })
      onChange(set(result.alt))
      setModel(result.model ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate alt text.')
    } finally {
      setLoading(false)
    }
  }, [assetRef, captionHint, documentTitle, documentType, onChange])

  return (
    <Stack space={3}>
      {props.renderDefault(props)}

      <Box>
        <Flex gap={2} wrap="wrap" align="center">
          <Button
            icon={SparklesIcon}
            text={loading ? 'Generating…' : value?.trim() ? 'Regenerate alt text' : 'Generate alt text'}
            tone="primary"
            mode="ghost"
            disabled={!canGenerate || loading}
            onClick={() => void run()}
          />
          {loading ? (
            <Flex align="center" gap={2}>
              <Spinner muted />
              <Text size={1} muted>
                Looking at the image…
              </Text>
            </Flex>
          ) : null}
          {model ? (
            <Text size={1} muted>
              {model}
            </Text>
          ) : null}
        </Flex>
      </Box>

      {error ? (
        <Card padding={3} radius={2} tone="critical">
          <Text size={1}>{error}</Text>
        </Card>
      ) : null}
    </Stack>
  )
}

