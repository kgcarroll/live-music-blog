import {createClient, type SanityClient} from 'next-sanity'

import {apiVersion, client} from '@/sanity/lib/client'

/** Server-side reads that must see system-written docs (e.g. eventArchive). */
export function getSanityServerClient(): SanityClient {
  const token =
    process.env.SANITY_API_READ_TOKEN?.trim() || process.env.SANITY_API_WRITE_TOKEN?.trim()

  if (!token) {
    return client.withConfig({useCdn: false})
  }

  return createClient({
    projectId: client.config().projectId!,
    dataset: client.config().dataset!,
    apiVersion,
    token,
    useCdn: false,
  })
}
