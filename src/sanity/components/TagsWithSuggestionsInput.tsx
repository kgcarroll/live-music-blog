'use client'

import {uuid} from '@sanity/uuid'
import {SparklesIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Spinner, Stack, Text, TextArea} from '@sanity/ui'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  type ArrayOfObjectsInputProps,
  type Reference,
  useClient,
  useFormValue,
  useGetFormValue,
} from 'sanity'
import {usePaneRouter} from 'sanity/structure'

import {
  TAG_FOCUS_FIELD_PATH,
  TAG_FROM_TITLE_TEMPLATE_ID,
  TAG_LINKED_TO_ARTICLE_EVENT,
  type TagLinkedToArticleDetail,
} from '@/sanity/constants'
import {
  saveTagCreateSession,
  scrollElementIntoDocumentPanel,
  type ReturnPanesState,
} from '@/sanity/lib/tagCreateNavigation'
import {publishedDocumentId} from '@/lib/tagSuggestionStorage'
import {apiVersion} from '@/sanity/lib/client'
import {studioApiOrigin} from '@/lib/studioHomeCarousel'

type SuggestedTag = {_id: string; title: string; slug?: string | null}
type StoredTagSuggestions = {
  tags?: SuggestedTag[]
  newTags?: string[]
  model?: string | null
}
type TagSuggestResponse = {
  tags?: SuggestedTag[]
  newTags?: string[]
  model?: string
  error?: string
}

const EDITORIAL_TYPES = new Set(['interview', 'news', 'review'])

async function fetchSuggestions(documentId: string, additionalPrompt?: string): Promise<TagSuggestResponse> {
  const response = await fetch(`${studioApiOrigin()}/api/studio/tag-suggest`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({documentId, additionalPrompt: additionalPrompt?.trim() || undefined}),
  })
  const data = (await response.json().catch(() => ({}))) as TagSuggestResponse
  if (!response.ok) throw new Error(data.error || `Tag suggestion failed (${response.status})`)
  return data
}

function tagTitleKey(title: string): string {
  return title.trim().toLowerCase()
}

function filterNewTagLabels(newTags: string[], excludeTitleKeys: Set<string>): string[] {
  return newTags.filter((t) => !excludeTitleKeys.has(tagTitleKey(t)))
}

function uniqStrings(list: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const v = item.trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out
}

function currentRefIds(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set()
  return new Set(
    value
      .map((t) => (t && typeof t === 'object' && '_ref' in t ? (t as any)._ref : ''))
      .filter((v) => typeof v === 'string' && v.trim())
      .map((v) => v.trim()),
  )
}

function normalizeStored(raw: unknown): {tags: SuggestedTag[]; newTags: string[]; model: string | null} | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as StoredTagSuggestions
  const tags = Array.isArray(value.tags)
    ? value.tags
        .filter((t) => t && typeof t === 'object' && typeof (t as {title?: string}).title === 'string')
        .map((t) => {
          const row = t as {_id?: string; tagId?: string; title: string; slug?: string | null}
          const id = String(row.tagId ?? row._id ?? '').trim()
          return {_id: id, title: row.title.trim(), slug: row.slug ?? null}
        })
        .filter((t) => t._id && t.title)
    : []
  const newTags = uniqStrings(Array.isArray(value.newTags) ? value.newTags : [])
  const model = typeof value.model === 'string' && value.model.trim() ? value.model.trim() : null
  if (!tags.length && !newTags.length) return null
  return {tags, newTags, model}
}

function filterSuggestions(
  stored: {tags: SuggestedTag[]; newTags: string[]; model: string | null},
  currentIds: Set<string>,
  excludeNewTagTitleKeys: Set<string> = new Set(),
) {
  return {
    tags: stored.tags.filter((t) => !currentIds.has(t._id)),
    newTags: filterNewTagLabels(stored.newTags, excludeNewTagTitleKeys),
    model: stored.model,
  }
}

function CreateTagLink({
  title,
  ChildLink,
  articleId,
  articleType,
}: {
  title: string
  ChildLink: ReturnType<typeof usePaneRouter>['ChildLink']
  articleId: string
  articleType: string
}) {
  const childId = useMemo(() => uuid(), [])
  const linkToArticleId = useMemo(() => publishedDocumentId(articleId), [articleId])
  const {routerPanesState, groupIndex, siblingIndex} = usePaneRouter()

  const captureReturnNavigation = useCallback(() => {
    const group = routerPanesState[groupIndex]
    if (!group) return

    const returnPanes: ReturnPanesState = {
      panes: [
        ...routerPanesState.slice(0, groupIndex),
        group.slice(0, siblingIndex + 1),
      ],
    }

    saveTagCreateSession(returnPanes, {
      articleDocumentId: linkToArticleId,
      articleType,
      tagTitle: title,
      tagDocumentId: childId,
    })
  }, [articleType, childId, groupIndex, linkToArticleId, routerPanesState, siblingIndex, title])

  return (
    <Box onPointerDownCapture={captureReturnNavigation}>
      <ChildLink
        childId={childId}
        childParameters={{type: 'tag', template: TAG_FROM_TITLE_TEMPLATE_ID}}
        childPayload={{title, linkToArticleId, linkToArticleType: articleType}}
      >
        <Button text={title} mode="ghost" fontSize={1} />
      </ChildLink>
    </Box>
  )
}

export function TagsWithSuggestionsInput(props: ArrayOfObjectsInputProps) {
  const getFormValue = useGetFormValue()
  const client = useClient({apiVersion})
  const documentType = getFormValue(['_type']) as string | undefined
  const documentId = getFormValue(['_id']) as string | undefined
  const storedRaw = useFormValue(['tagSuggestions'])

  const tagsValue = useFormValue(props.path) as Reference[] | undefined
  const currentIds = useMemo(() => currentRefIds(tagsValue), [tagsValue])

  const paneRouter = usePaneRouter()
  const {ChildLink, setParams} = paneRouter

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<string | null>(null)
  const [suggested, setSuggested] = useState<SuggestedTag[]>([])
  const [newTags, setNewTags] = useState<string[]>([])
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const additionalPromptRef = useRef(additionalPrompt)
  additionalPromptRef.current = additionalPrompt
  const excludeNewTagTitleKeysRef = useRef<Set<string>>(new Set())
  const tagsSectionRef = useRef<HTMLDivElement>(null)

  const show = EDITORIAL_TYPES.has(documentType ?? '')

  const applyStored = useCallback(
    (stored: {tags: SuggestedTag[]; newTags: string[]; model: string | null}) => {
      const filtered = filterSuggestions(stored, currentIds, excludeNewTagTitleKeysRef.current)
      setSuggested(filtered.tags)
      setNewTags(filtered.newTags)
      setModel(filtered.model)
    },
    [currentIds],
  )

  const refetchStoredSuggestions = useCallback(async () => {
    if (!documentId) return
    const publishedId = publishedDocumentId(documentId)
    const draftId = `drafts.${publishedId}`
    const raw = await client.fetch<unknown>(
      `coalesce(*[_id == $draftId][0].tagSuggestions, *[_id == $publishedId][0].tagSuggestions)`,
      {draftId, publishedId},
    )
    const stored = normalizeStored(raw)
    if (stored) applyStored(stored)
  }, [applyStored, client, documentId])

  useEffect(() => {
    const stored = normalizeStored(storedRaw)
    if (!stored) return
    applyStored(stored)
  }, [storedRaw, applyStored])

  useEffect(() => {
    if (!documentId || !show) return

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TagLinkedToArticleDetail>).detail
      if (publishedDocumentId(documentId) !== publishedDocumentId(detail.articleDocumentId)) {
        return
      }

      setParams({path: TAG_FOCUS_FIELD_PATH})

      const tagRef = publishedDocumentId(detail.tagId)
      const inForm = currentRefIds(getFormValue(props.path))
      if (!inForm.has(tagRef)) {
        props.onItemAppend({_type: 'reference', _ref: tagRef} as Reference & {_key: string})
      }

      excludeNewTagTitleKeysRef.current.add(tagTitleKey(detail.tagTitle))
      setNewTags((prev) => filterNewTagLabels(prev, excludeNewTagTitleKeysRef.current))
      void refetchStoredSuggestions()
      window.requestAnimationFrame(() => {
        scrollElementIntoDocumentPanel(tagsSectionRef.current, 400)
      })
    }

    window.addEventListener(TAG_LINKED_TO_ARTICLE_EVENT, handler)
    return () => window.removeEventListener(TAG_LINKED_TO_ARTICLE_EVENT, handler)
  }, [documentId, getFormValue, props.onItemAppend, props.path, refetchStoredSuggestions, setParams, show])

  useEffect(() => {
    if (!show || currentIds.size === 0) return

    const refs = [...currentIds]
    void client
      .fetch<string[]>(`*[_type == "tag" && _id in $refs].title`, {refs})
      .then((titles) => {
        for (const title of titles) {
          if (title?.trim()) excludeNewTagTitleKeysRef.current.add(tagTitleKey(title))
        }
        const stored = normalizeStored(storedRaw)
        if (stored) applyStored(stored)
        else setNewTags((prev) => filterNewTagLabels(prev, excludeNewTagTitleKeysRef.current))
      })
      .catch(() => undefined)
  }, [applyStored, client, currentIds, show, storedRaw])

  const run = useCallback(async () => {
    if (!documentId) {
      setError('Document id is missing.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSuggestions(documentId, additionalPromptRef.current)
      const stored = {
        tags: (data.tags ?? []).filter((t) => t._id && t.title),
        newTags: uniqStrings((data.newTags ?? []).filter(Boolean)),
        model: data.model ?? null,
      }
      applyStored(stored)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not suggest tags.')
    } finally {
      setLoading(false)
    }
  }, [applyStored, documentId])

  const applyTag = useCallback(
    (tagId: string) => {
      if (currentIds.has(tagId)) return
      props.onItemAppend({_type: 'reference', _ref: tagId} as Reference & {_key: string})
      setSuggested((prev) => prev.filter((t) => t._id !== tagId))
    },
    [currentIds, props.onItemAppend],
  )

  return (
    <Stack space={4}>
      {show ? (
        <Card
          ref={tagsSectionRef}
          padding={3}
          radius={2}
          tone="transparent"
          border
          data-testid="tag-suggestions-panel"
        >
          <Stack space={3}>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                Suggested tags
              </Text>
              <Text size={1} muted>
                Generates 3–8 suggested existing tags from the article body. Click a suggestion to
                add it. Suggestions are saved on this document and remain after you close and reopen
                it.
              </Text>
            </Stack>

            <Stack space={2}>
              <Text size={1} muted>
                Optional instructions
              </Text>
              <TextArea
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.currentTarget.value)}
                rows={2}
                placeholder="Optional: e.g. prioritize venues, avoid generic tags…"
              />
            </Stack>

            <Flex gap={2} wrap="wrap" align="center">
              <Button
                icon={SparklesIcon}
                text={loading ? 'Suggesting…' : 'Suggest tags'}
                tone="primary"
                mode="ghost"
                disabled={loading || !documentId}
                onClick={() => void run()}
              />
              {loading ? (
                <Flex align="center" gap={2}>
                  <Spinner muted />
                  <Text size={1} muted>
                    Reading the article…
                  </Text>
                </Flex>
              ) : null}
              {model ? (
                <Text size={1} muted>
                  {model}
                </Text>
              ) : null}
            </Flex>

            {error ? (
              <Card padding={3} radius={2} tone="critical">
                <Text size={1}>{error}</Text>
              </Card>
            ) : null}

            {suggested.length ? (
              <Box>
                <Flex gap={2} wrap="wrap">
                  {suggested.map((t) => (
                    <Button key={t._id} text={t.title} mode="ghost" onClick={() => applyTag(t._id)} />
                  ))}
                </Flex>
              </Box>
            ) : null}

            {newTags.length ? (
              <Stack space={2}>
                <Text size={1} muted>
                  Missing tags you might want to create (opens a new Tag in a split pane; publishing
                  it adds the tag to this article)
                </Text>
                <Flex gap={2} wrap="wrap">
                  {newTags.map((name) =>
                    documentId && documentType ? (
                      <CreateTagLink
                        key={name}
                        title={name}
                        ChildLink={ChildLink}
                        articleId={documentId}
                        articleType={documentType}
                      />
                    ) : null,
                  )}
                </Flex>
              </Stack>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      {props.renderDefault(props)}
    </Stack>
  )
}
