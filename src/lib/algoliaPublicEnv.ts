/** Browser-safe Algolia config (search-only key + public app id). */
export function getAlgoliaPublicEnv() {
  return {
    appId: process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID ?? '',
    searchKey: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY ?? '',
    indexName: process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? '',
  }
}

export function isAlgoliaSearchConfigured() {
  const {appId, searchKey, indexName} = getAlgoliaPublicEnv()
  return Boolean(appId && searchKey && indexName)
}
