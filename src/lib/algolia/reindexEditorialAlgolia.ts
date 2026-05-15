import {algoliasearch} from 'algoliasearch'

import {getAlgoliaAdminApiKey, getAlgoliaApplicationId} from '@/lib/algoliaPublicEnv'

/** Sanity API version (keep aligned with `src/sanity/lib/client.ts`). */
const sanityApiVersion = '2024-01-01'

/** Shape stored in Algolia and returned as InstantSearch hits. */
export type EditorialAlgoliaRecord = {
  objectID: string
  editorialType: string
  title: string
  slug: string
  publishedAt: string | null
  excerpt: string | null
  bodyText: string
  /** Present after reindex with cover fields; may be absent on older index payloads. */
  coverImageUrl?: string | null
  coverImageAlt?: string | null
  coverImageLqip?: string | null
}

const MAX_BODY_CHARS = 12000

export const EDITORIAL_ALGOLIA_GROQ = `*[_type in ["interview","news","photoPost","review"] && defined(slug.current)]{
  "objectID": _id,
  "editorialType": _type,
  title,
  "slug": slug.current,
  publishedAt,
  excerpt,
  "bodyText": coalesce(pt::text(body), ""),
  "coverImageUrl": coverImage.asset->url,
  "coverImageLqip": coverImage.asset->metadata.lqip,
  "coverImageAlt": coalesce(coverImage.alt, title, "")
}`

function normalizeRecord(raw: {
  objectID?: string
  editorialType?: string
  title?: string | null
  slug?: string | null
  publishedAt?: string | null
  excerpt?: string | null
  bodyText?: string | null
  coverImageUrl?: string | null
  coverImageAlt?: string | null
  coverImageLqip?: string | null
}): EditorialAlgoliaRecord {
  const body =
    typeof raw.bodyText === 'string' && raw.bodyText.length > MAX_BODY_CHARS
      ? raw.bodyText.slice(0, MAX_BODY_CHARS)
      : raw.bodyText ?? ''
  const coverUrl =
    typeof raw.coverImageUrl === 'string' && raw.coverImageUrl.startsWith('http') ? raw.coverImageUrl : null
  return {
    objectID: String(raw.objectID ?? ''),
    editorialType: String(raw.editorialType ?? ''),
    title: raw.title ?? '',
    slug: raw.slug ?? '',
    publishedAt: raw.publishedAt ?? null,
    excerpt: raw.excerpt ?? null,
    bodyText: body,
    coverImageUrl: coverUrl,
    coverImageAlt: typeof raw.coverImageAlt === 'string' && raw.coverImageAlt.trim() ? raw.coverImageAlt.trim() : null,
    coverImageLqip: typeof raw.coverImageLqip === 'string' && raw.coverImageLqip.trim() ? raw.coverImageLqip.trim() : null,
  }
}

export async function fetchEditorialAlgoliaRecords(
  projectId: string,
  dataset: string,
): Promise<EditorialAlgoliaRecord[]> {
  const params = new URLSearchParams({query: EDITORIAL_ALGOLIA_GROQ})
  const url = `https://${projectId}.apicdn.sanity.io/v${sanityApiVersion}/data/query/${dataset}?${params}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sanity query failed (${res.status}): ${text.slice(0, 500)}`)
  }
  const json: {result?: unknown} = await res.json()
  const rows = Array.isArray(json.result) ? json.result : []
  return rows.map((r) => normalizeRecord(r as Parameters<typeof normalizeRecord>[0]))
}

export async function pushEditorialRecordsToAlgolia(options: {
  appId: string
  adminKey: string
  indexName: string
  objects: EditorialAlgoliaRecord[]
}): Promise<void> {
  const {appId, adminKey, indexName, objects} = options
  const client = algoliasearch(appId, adminKey)

  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: ['title', 'excerpt', 'bodyText'],
      attributesToHighlight: ['title'],
      attributesToSnippet: ['excerpt:40', 'bodyText:30'],
      customRanking: ['desc(publishedAt)'],
      attributesForFaceting: ['filterOnly(editorialType)'],
    },
  })

  await client.replaceAllObjects({
    indexName,
    objects: objects as Array<Record<string, unknown>>,
  })
}

/**
 * Full replace reindex from Sanity CDN → Algolia. Reads all env from `process.env`.
 */
export async function runFullEditorialAlgoliaReindex(): Promise<{count: number}> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim()
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || 'production'
  const appId = getAlgoliaApplicationId()
  const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME?.trim() ?? ''
  const adminKey = getAlgoliaAdminApiKey()

  if (!projectId) throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set')
  if (!appId) {
    throw new Error(
      'Algolia app id: set NEXT_PUBLIC_ALGOLIA_APPLICATION_ID (or NEXT_PUBLIC_ALGOLIA_APP_ID per Sanity search guide)',
    )
  }
  if (!indexName) throw new Error('NEXT_PUBLIC_ALGOLIA_INDEX_NAME is not set')
  if (!adminKey) {
    throw new Error(
      'Algolia admin key: set ALGOLIA_ADMIN_API_KEY (or ALGOLIA_WRITE_KEY per Sanity search guide)',
    )
  }

  const objects = await fetchEditorialAlgoliaRecords(projectId, dataset)
  await pushEditorialRecordsToAlgolia({appId, adminKey, indexName, objects})
  return {count: objects.length}
}
