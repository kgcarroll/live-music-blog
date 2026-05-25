import {createClient} from 'next-sanity'

import {apiVersion, client} from '@/sanity/lib/client'

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

export async function fetchStoredFacebookCaption(documentId: string): Promise<string | null> {
  const stored = await client.fetch<string | null>(
    `*[_id == $id][0].facebookCaption`,
    {id: documentId},
    {useCdn: false},
  )
  const text = stored?.trim()
  return text || null
}

export async function saveStoredFacebookCaption(documentId: string, caption: string): Promise<void> {
  const write = getWriteClient()
  if (!write) {
    throw new Error('SANITY_API_WRITE_TOKEN is not configured on the server.')
  }
  await write.patch(documentId).set({facebookCaption: caption.trim()}).commit()
}
