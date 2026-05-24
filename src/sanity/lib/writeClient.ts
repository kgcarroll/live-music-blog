import {createClient, type SanityClient} from 'next-sanity'

import {apiVersion, client} from '@/sanity/lib/client'

export function getSanityWriteClient(): SanityClient | null {
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
