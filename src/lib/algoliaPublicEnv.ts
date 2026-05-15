/** First non-empty trimmed string (used for Sanity guide env aliases). */
function pickEnv(...candidates: (string | undefined)[]): string {
  for (const c of candidates) {
    const t = c?.trim()
    if (t) return t
  }
  return ''
}

/**
 * Browser-safe Algolia config (search-only key + public app id).
 *
 * Supports names from the Sanity Algolia guide as fallbacks:
 * https://www.sanity.io/docs/developer-guides/how-to-implement-front-end-search-with-sanity
 */
export function getAlgoliaPublicEnv() {
  return {
    appId: pickEnv(
      process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID,
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
    ),
    searchKey: pickEnv(
      process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY,
      process.env.NEXT_PUBLIC_ALGOLIA_API_KEY,
    ),
    indexName: pickEnv(process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME),
  }
}

/** Admin / write key for server reindex (guide: `ALGOLIA_WRITE_KEY`). */
export function getAlgoliaAdminApiKey(): string {
  return pickEnv(process.env.ALGOLIA_ADMIN_API_KEY, process.env.ALGOLIA_WRITE_KEY)
}

/** App id for server reindex (same fallbacks as browser). */
export function getAlgoliaApplicationId(): string {
  return pickEnv(
    process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID,
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  )
}

export function isAlgoliaSearchConfigured() {
  const {appId, searchKey, indexName} = getAlgoliaPublicEnv()
  return Boolean(appId && searchKey && indexName)
}
