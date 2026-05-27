import {uuid} from '@sanity/uuid'
import type {SanityClient} from 'sanity'

import {draftDocumentId, publishedDocumentId} from '@/lib/tagSuggestionStorage'

export type TagLinkPending = {
  articleDocumentId: string
  articleType: string
  tagId: string
  tagTitle: string
}

type StoredTagSuggestions = {
  tags?: unknown[]
  newTags?: string[]
  model?: string | null
}

function tagTitleKey(title: string): string {
  return title.trim().toLowerCase()
}

async function documentExists(client: SanityClient, id: string): Promise<boolean> {
  return client.fetch<boolean>(`defined(*[_id == $id][0]._id)`, {id})
}

/** Ensure a draft exists for patching (copy published document if needed). */
export async function ensureArticleDraftId(
  client: SanityClient,
  articleDocumentId: string,
): Promise<string> {
  const draftId = draftDocumentId(articleDocumentId)
  if (await documentExists(client, draftId)) return draftId

  const publishedId = publishedDocumentId(articleDocumentId)
  const published = await client.fetch<Record<string, unknown> | null>(
    `*[_id == $publishedId][0]`,
    {publishedId},
  )

  if (!published) {
    throw new Error('Save the article draft before publishing tags from suggestions.')
  }

  const {_rev, _id, ...fields} = published
  const docType = fields._type
  if (typeof docType !== 'string' || !docType.trim()) {
    throw new Error('Could not create article draft for tag linking.')
  }

  try {
    await client.create({...fields, _type: docType, _id: draftId})
  } catch {
    if (await documentExists(client, draftId)) return draftId
    throw new Error('Could not create article draft for tag linking.')
  }

  return draftId
}

/** Append published tag ref to article draft using the Studio user token. */
export async function linkTagToArticleWithClient(
  client: SanityClient,
  pending: TagLinkPending,
): Promise<'linked' | 'already-linked'> {
  const draftId = await ensureArticleDraftId(client, pending.articleDocumentId)
  const tagRef = publishedDocumentId(pending.tagId)

  const existingRefs = await client.fetch<string[]>(
    `coalesce(*[_id == $draftId][0].tags[]._ref, [])`,
    {draftId},
  )

  if (existingRefs?.includes(tagRef)) {
    return 'already-linked'
  }

  await client
    .patch(draftId)
    .setIfMissing({tags: []})
    .insert('after', 'tags[-1]', [{_type: 'reference', _ref: tagRef, _key: uuid()}])
    .commit()

  return 'linked'
}

async function fetchRawTagSuggestions(
  client: SanityClient,
  id: string,
): Promise<StoredTagSuggestions | null> {
  const stored = await client.fetch<StoredTagSuggestions | null>(
    `*[_id == $id][0].tagSuggestions`,
    {id},
  )
  return stored && typeof stored === 'object' ? stored : null
}

/** Remove a missing-tag label from persisted suggestions on the article draft. */
export async function removeNewTagSuggestionWithClient(
  client: SanityClient,
  articleDocumentId: string,
  tagTitle: string,
): Promise<void> {
  const key = tagTitleKey(tagTitle)
  if (!key) return

  const draftId = await ensureArticleDraftId(client, articleDocumentId)
  const publishedId = publishedDocumentId(articleDocumentId)

  let raw = await fetchRawTagSuggestions(client, draftId)
  if (!raw?.newTags?.length) {
    const fromPublished = await fetchRawTagSuggestions(client, publishedId)
    if (fromPublished?.newTags?.length) {
      raw = {...fromPublished, ...raw}
    }
  }

  if (!raw?.newTags?.length) return

  const newTags = raw.newTags.map((t) => String(t ?? '').trim()).filter(Boolean)
  const filtered = newTags.filter((t) => tagTitleKey(t) !== key)
  if (filtered.length === newTags.length) return

  await client
    .patch(draftId)
    .set({
      tagSuggestions: {
        ...raw,
        newTags: filtered,
      },
    })
    .commit()
}
