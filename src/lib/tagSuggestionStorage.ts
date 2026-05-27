import {createClient} from 'next-sanity'

import {apiVersion, client} from '@/sanity/lib/client'

/** Shape persisted on the document (Sanity disallows `_`-prefixed field names). */
export type StoredSuggestedTag = {tagId: string; title: string; slug?: string | null}
export type StoredTagSuggestions = {
  tags?: StoredSuggestedTag[]
  newTags?: string[]
  model?: string | null
}

/** API / UI tag row before mapping to stored fields. */
export type SuggestedTagRef = {_id: string; title: string; slug?: string | null}

function getWriteClient() {
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim()
  if (!token) return null
  return createClient({
    projectId: client.config().projectId!,
    dataset: client.config().dataset!,
    apiVersion,
    token,
    useCdn: false,
  })
}

/** Published document id (strip drafts. prefix for perspective queries). */
export function publishedDocumentId(documentId: string): string {
  return documentId.replace(/^drafts\./, '')
}

/** Draft document id for Studio/API writes (never mutate published directly). */
export function draftDocumentId(documentId: string): string {
  const publishedId = publishedDocumentId(documentId)
  return documentId.startsWith('drafts.') ? documentId : `drafts.${publishedId}`
}

async function documentExists(id: string): Promise<boolean> {
  return client.fetch<boolean>(`defined(*[_id == $id][0]._id)`, {id}, {useCdn: false})
}

/**
 * Return the draft id for API patches. Creates a draft from the published document
 * when the article is open in Studio but only the published revision exists in the API.
 */
export async function ensureDraftDocument(
  write: NonNullable<ReturnType<typeof getWriteClient>>,
  documentId: string,
): Promise<string> {
  const draftId = draftDocumentId(documentId)
  if (await documentExists(draftId)) return draftId

  const publishedId = publishedDocumentId(documentId)
  const published = await client.fetch<Record<string, unknown> | null>(
    `*[_id == $publishedId][0]`,
    {publishedId},
    {useCdn: false},
  )

  if (!published) {
    throw new Error(
      'Save the article draft first, then run tag suggestions again.',
    )
  }

  const {_rev, _id, ...draftFields} = published
  const docType = draftFields._type
  if (typeof docType !== 'string' || !docType.trim()) {
    throw new Error('Could not create article draft: document type is missing.')
  }

  try {
    await write.create({
      ...draftFields,
      _type: docType,
      _id: draftId,
    })
  } catch {
    if (await documentExists(draftId)) return draftId
    throw new Error('Could not create article draft for tag linking.')
  }

  return draftId
}

function tagIdFromStoredRow(row: unknown): string {
  if (!row || typeof row !== 'object') return ''
  const r = row as {tagId?: string; _id?: string}
  return String(r.tagId ?? r._id ?? '').trim()
}

function normalizeStored(raw: unknown): StoredTagSuggestions | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as StoredTagSuggestions
  const tags = Array.isArray(value.tags)
    ? value.tags
        .filter((t) => t && typeof t === 'object' && tagIdFromStoredRow(t))
        .map((t) => ({
          tagId: tagIdFromStoredRow(t),
          title: String((t as StoredSuggestedTag).title ?? '').trim(),
          slug: (t as StoredSuggestedTag).slug ?? null,
        }))
        .filter((t) => t.tagId && t.title)
    : []
  const newTags = Array.isArray(value.newTags)
    ? value.newTags.map((t) => String(t ?? '').trim()).filter(Boolean)
    : []
  const model = typeof value.model === 'string' ? value.model.trim() || null : null
  if (!tags.length && !newTags.length) return null
  return {tags, newTags, model}
}

async function fetchSuggestionsOnDocument(id: string): Promise<StoredTagSuggestions | null> {
  const stored = await client.fetch<unknown>(`*[_id == $id][0].tagSuggestions`, {id}, {useCdn: false})
  return normalizeStored(stored)
}

/** Prefer draft suggestions (Studio edits) over published. */
export async function fetchStoredTagSuggestions(documentId: string): Promise<StoredTagSuggestions | null> {
  const publishedId = publishedDocumentId(documentId)
  const draftId = documentId.startsWith('drafts.') ? documentId : `drafts.${publishedId}`

  const fromDraft = await fetchSuggestionsOnDocument(draftId)
  if (fromDraft) return fromDraft

  return fetchSuggestionsOnDocument(publishedId)
}

export async function saveStoredTagSuggestions(
  documentId: string,
  suggestions: {
    tags?: SuggestedTagRef[]
    newTags?: string[]
    model?: string | null
  },
): Promise<void> {
  const write = getWriteClient()
  if (!write) {
    throw new Error('SANITY_API_WRITE_TOKEN is not configured on the server.')
  }
  const stored: StoredTagSuggestions = {
    tags: (suggestions.tags ?? [])
      .map((t) => ({
        tagId: t._id.trim(),
        title: t.title.trim(),
        slug: t.slug ?? null,
      }))
      .filter((t) => t.tagId && t.title),
    newTags: suggestions.newTags,
    model: suggestions.model,
  }
  const draftId = await ensureDraftDocument(write, documentId)
  await write.patch(draftId).set({tagSuggestions: stored}).commit()
}

function tagTitleKey(title: string): string {
  return title.trim().toLowerCase()
}

async function fetchRawTagSuggestions(id: string): Promise<StoredTagSuggestions | null> {
  const stored = await client.fetch<StoredTagSuggestions | null>(
    `*[_id == $id][0].tagSuggestions`,
    {id},
    {useCdn: false},
  )
  if (!stored || typeof stored !== 'object') return null
  return stored
}

/** Remove a missing-tag suggestion label after the tag is created and linked. */
export async function removeNewTagFromArticleSuggestions(
  articleDocumentId: string,
  tagTitle: string,
): Promise<void> {
  const write = getWriteClient()
  if (!write) {
    throw new Error('SANITY_API_WRITE_TOKEN is not configured on the server.')
  }

  const key = tagTitleKey(tagTitle)
  if (!key) return

  const draftId = await ensureDraftDocument(write, articleDocumentId)
  const publishedId = publishedDocumentId(articleDocumentId)
  let raw = await fetchRawTagSuggestions(draftId)
  if (!raw?.newTags?.length) {
    const fromPublished = await fetchRawTagSuggestions(publishedId)
    if (fromPublished?.newTags?.length) {
      raw = {...fromPublished, ...raw}
    }
  }
  if (!raw?.newTags?.length) return

  const newTags = raw.newTags.map((t) => String(t ?? '').trim()).filter(Boolean)
  const filtered = newTags.filter((t) => tagTitleKey(t) !== key)
  if (filtered.length === newTags.length) return

  await write
    .patch(draftId)
    .set({
      tagSuggestions: {
        ...raw,
        newTags: filtered,
      },
    })
    .commit()
}
