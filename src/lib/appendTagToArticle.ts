import {uuid} from '@sanity/uuid'
import {createClient} from 'next-sanity'

import {EDITORIAL_DOCUMENT_TYPES} from '@/sanity/constants'
import {apiVersion, client} from '@/sanity/lib/client'
import {
  ensureDraftDocument,
  publishedDocumentId,
  removeNewTagFromArticleSuggestions,
} from '@/lib/tagSuggestionStorage'

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

const editorialTypes = new Set<string>(EDITORIAL_DOCUMENT_TYPES)

/** Append a tag ref on the article draft only (never the published document). */
async function appendTagRefToDraft(
  write: ReturnType<typeof getWriteClient>,
  draftArticleId: string,
  publishedTagId: string,
): Promise<'linked' | 'already-linked' | 'skipped'> {
  if (!write) return 'skipped'

  const existingRefs = await client.fetch<string[]>(
    `coalesce(*[_id == $draftId][0].tags[]._ref, [])`,
    {draftId: draftArticleId},
    {useCdn: false},
  )
  if (existingRefs?.includes(publishedTagId)) {
    return 'already-linked'
  }

  await write
    .patch(draftArticleId)
    .setIfMissing({tags: []})
    .insert('after', 'tags[-1]', [{_type: 'reference', _ref: publishedTagId, _key: uuid()}])
    .commit()

  return 'linked'
}

export async function appendTagToArticleTags(
  articleDocumentId: string,
  articleType: string,
  tagId: string,
  tagTitle?: string,
): Promise<'linked' | 'already-linked'> {
  const write = getWriteClient()
  if (!write) {
    throw new Error('SANITY_API_WRITE_TOKEN is not configured on the server.')
  }

  const type = articleType.trim()
  if (!editorialTypes.has(type)) {
    throw new Error(`Unsupported article type: ${type}`)
  }

  const draftArticleId = await ensureDraftDocument(write, articleDocumentId)
  const publishedTagId = publishedDocumentId(tagId)

  const result = await appendTagRefToDraft(write, draftArticleId, publishedTagId)

  const title = tagTitle?.trim()
  if (title && result !== 'skipped') {
    await removeNewTagFromArticleSuggestions(articleDocumentId, title)
  }

  if (result === 'already-linked') return 'already-linked'
  return 'linked'
}
