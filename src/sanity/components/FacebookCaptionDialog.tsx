'use client'

import {CopyIcon, LaunchIcon, ResetIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text, TextArea} from '@sanity/ui'
import {useCallback, useEffect, useRef, useState} from 'react'

import {countWords, FACEBOOK_CAPTION_MAX_WORDS} from '@/lib/facebookCaption'
import {studioApiOrigin} from '@/lib/studioHomeCarousel'

type CaptionResponse = {
  caption?: string
  articleUrl?: string
  title?: string
  error?: string
  model?: string
  cached?: boolean
}

async function persistCaption(documentId: string, caption: string): Promise<void> {
  const response = await fetch(`${studioApiOrigin()}/api/studio/facebook-caption`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    body: JSON.stringify({documentId, save: true, caption}),
  })
  const data = (await response.json().catch(() => ({}))) as {error?: string}
  if (!response.ok) {
    throw new Error(data.error || `Save failed (${response.status})`)
  }
}

async function fetchCaption(
  documentId: string,
  options?: {regenerate?: boolean; previousCaption?: string; additionalPrompt?: string},
): Promise<CaptionResponse> {
  const response = await fetch(`${studioApiOrigin()}/api/studio/facebook-caption`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({
      documentId,
      regenerate: options?.regenerate === true,
      previousCaption: options?.previousCaption?.trim() || undefined,
      additionalPrompt: options?.additionalPrompt?.trim() || undefined,
    }),
  })
  const data = (await response.json().catch(() => ({}))) as CaptionResponse
  if (!response.ok) {
    throw new Error(data.error || `Caption failed (${response.status})`)
  }
  return data
}

export function FacebookCaptionDialog({
  documentId,
  onClose,
  registerBeforeClose,
}: {
  documentId: string
  onClose: () => void
  /** Lets the Studio dialog backdrop/Escape run the same save logic as Close. */
  registerBeforeClose?: (fn: (() => Promise<void>) | null) => void
}) {
  const [caption, setCaption] = useState('')
  const [articleUrl, setArticleUrl] = useState('')
  const [title, setTitle] = useState('')
  const [model, setModel] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const additionalPromptRef = useRef(additionalPrompt)
  const captionRef = useRef(caption)
  captionRef.current = caption
  additionalPromptRef.current = additionalPrompt

  const persistCurrentCaption = useCallback(async () => {
    const text = captionRef.current.trim()
    if (!text || loading) return
    await persistCaption(documentId, text)
    setFromCache(true)
    setModel(null)
  }, [documentId, loading])

  useEffect(() => {
    registerBeforeClose?.(persistCurrentCaption)
    return () => registerBeforeClose?.(null)
  }, [persistCurrentCaption, registerBeforeClose])

  const handleClose = useCallback(async () => {
    setSaving(true)
    try {
      await persistCurrentCaption()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save caption')
    } finally {
      setSaving(false)
    }
  }, [onClose, persistCurrentCaption])

  const loadCaption = useCallback(async (regenerate = false, extraPrompt?: string) => {
    setLoading(true)
    setIsRegenerating(regenerate)
    setError(null)
    setCopyStatus(null)
    const previousCaption = regenerate ? captionRef.current : undefined
    try {
      const data = await fetchCaption(documentId, {
        regenerate,
        previousCaption,
        additionalPrompt: regenerate ? extraPrompt : undefined,
      })
      setCaption(data.caption ?? '')
      setArticleUrl(data.articleUrl ?? '')
      setTitle(data.title ?? '')
      setModel(data.model ?? null)
      setFromCache(data.cached === true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    void loadCaption()
  }, [loadCaption])

  const copyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus(`${label} copied`)
    } catch {
      setCopyStatus(`Could not copy ${label.toLowerCase()}`)
    }
  }, [])

  const copyAll = useCallback(async () => {
    const url = articleUrl.trim()
    const text = caption.trim()
    const combined = url ? `${text}\n\n${url}` : text
    await copyText(combined, 'Caption and link')
  }, [articleUrl, caption, copyText])

  return (
    <Box padding={4} style={{maxWidth: 520}}>
      <Stack space={4}>
        <Stack space={2}>
          <Text size={2} weight="semibold">
            Facebook Caption
          </Text>
          <Text size={1} muted>
            Generate a short post, edit if needed, then copy and paste onto your Facebook Page. Add
            the cover image manually in Facebook. Edits are saved when you close. Generate and
            Regenerate use OpenAI credits.{' '}
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

        {title ? (
          <Card padding={3} radius={2} tone="transparent" border>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                {title}
              </Text>
              {articleUrl ? (
                <Text size={1} muted style={{wordBreak: 'break-all'}}>
                  {articleUrl}
                </Text>
              ) : null}
            </Stack>
          </Card>
        ) : null}

        {loading ? (
          <Flex align="center" gap={3} paddingY={4}>
            <Spinner />
            <Text size={1} muted>
              {isRegenerating ? 'Generating caption…' : 'Loading…'}
            </Text>
          </Flex>
        ) : null}

        {error ? (
          <Card padding={3} radius={2} tone="critical">
            <Text size={1}>{error}</Text>
          </Card>
        ) : null}

        {!loading && !error ? (
          <>
            <Stack space={2}>
              <Text size={1} muted>
                {countWords(caption)} / {FACEBOOK_CAPTION_MAX_WORDS} words
                {fromCache ? ' · saved' : model ? ` · ${model}` : ''}
              </Text>
              <TextArea
                value={caption}
                onChange={(event) => setCaption(event.currentTarget.value)}
                rows={6}
              />
            </Stack>

            <Stack space={2}>
              <Text size={1} muted>
                Additional prompt (used on Regenerate only)
              </Text>
              <TextArea
                value={additionalPrompt}
                onChange={(event) => setAdditionalPrompt(event.currentTarget.value)}
                rows={2}
                placeholder="Optional: e.g. emphasize the venue, remove adjectives, mention it’s a benefit show…"
              />
            </Stack>

            <Flex gap={2} wrap="wrap">
              <Button
                icon={CopyIcon}
                text="Copy caption + link"
                tone="primary"
                onClick={() => void copyAll()}
                disabled={!caption.trim()}
              />
              <Button
                icon={CopyIcon}
                mode="ghost"
                text="Copy caption only"
                onClick={() => void copyText(caption.trim(), 'Caption')}
                disabled={!caption.trim()}
              />
              <Button
                icon={CopyIcon}
                mode="ghost"
                text="Copy link only"
                onClick={() => void copyText(articleUrl.trim(), 'Link')}
                disabled={!articleUrl.trim()}
              />
              <Button
                icon={ResetIcon}
                mode="ghost"
                text="Regenerate"
                onClick={() => void loadCaption(true, additionalPromptRef.current)}
                disabled={loading}
              />
            </Flex>

            {copyStatus ? (
              <Text size={1} muted>
                {copyStatus}
              </Text>
            ) : null}
          </>
        ) : null}

        {error ? (
          <Button icon={ResetIcon} text="Try again" onClick={() => void loadCaption(true)} disabled={loading} />
        ) : null}

        <Flex justify="flex-end">
          <Button
            text={saving ? 'Saving…' : 'Close'}
            mode="ghost"
            onClick={() => void handleClose()}
            disabled={saving || loading}
          />
        </Flex>
      </Stack>
    </Box>
  )
}
