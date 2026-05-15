'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import {liteClient as algoliasearch} from 'algoliasearch/lite'
import type {Hit, UiState} from 'instantsearch.js'
import type {SendEventForHits} from 'instantsearch.js/es/lib/utils'
import {
  Configure,
  Highlight,
  Hits,
  SearchBox,
  Snippet,
} from 'react-instantsearch'
import {
  InstantSearchNext,
  type InstantSearchNextRouting,
} from 'react-instantsearch-nextjs'
import type {EditorialAlgoliaRecord} from '@/lib/algolia/reindexEditorialAlgolia'
import {getAlgoliaPublicEnv, isAlgoliaSearchConfigured} from '@/lib/algoliaPublicEnv'
import {editorialHref, editorialTypeLabel} from '@/lib/paths'

export type EditorialSearchRecord = EditorialAlgoliaRecord

type SearchRouteState = {q?: string}

function SearchHit({hit, sendEvent: _sendEvent}: {hit: Hit<EditorialSearchRecord>; sendEvent: SendEventForHits}) {
  const href = editorialHref(hit.editorialType, hit.slug)
  const typeLabel = editorialTypeLabel(hit.editorialType)
  const date =
    hit.publishedAt != null
      ? new Date(hit.publishedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-amber-500/40">
      <p className="text-xs uppercase tracking-wide text-amber-300">
        {typeLabel}
        {date ? (
          <>
            <span className="mx-1.5 text-zinc-600" aria-hidden="true">
              |
            </span>
            <time className="font-normal normal-case tabular-nums text-zinc-400" dateTime={hit.publishedAt ?? undefined}>
              {date}
            </time>
          </>
        ) : null}
      </p>
      <h2 className="mt-2 text-base font-semibold leading-snug text-zinc-50">
        <Link href={href} className="outline-none hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-400/50">
          <Highlight hit={hit} attribute="title" />
        </Link>
      </h2>
      {hit.excerpt ? (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
          <Snippet hit={hit} attribute="excerpt" />
        </p>
      ) : hit.bodyText ? (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
          <Snippet hit={hit} attribute="bodyText" />
        </p>
      ) : null}
    </article>
  )
}

export function SearchExperience({initialQuery}: {initialQuery: string}) {
  const {appId, searchKey, indexName} = getAlgoliaPublicEnv()

  const searchClient = useMemo(
    () => (isAlgoliaSearchConfigured() ? algoliasearch(appId, searchKey) : null),
    [appId, searchKey],
  )

  const routing = useMemo((): InstantSearchNextRouting<UiState, SearchRouteState> => {
    return {
      stateMapping: {
        stateToRoute(uiState) {
          const q = uiState[indexName]?.query
          return typeof q === 'string' && q.trim() ? {q} : {}
        },
        routeToState(routeState) {
          const raw = routeState.q
          const q = typeof raw === 'string' ? raw : ''
          return {
            [indexName]: {
              query: q,
            },
          } as UiState
        },
      },
      router: {
        writeDelay: 700,
        cleanUrlOnDispose: false,
      },
    }
  }, [indexName])

  if (!searchClient || !indexName) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-zinc-200">
        <p className="font-medium text-amber-200">Algolia is not configured yet</p>
        <p className="mt-2 text-zinc-400">
          Add <code className="text-zinc-300">NEXT_PUBLIC_ALGOLIA_APPLICATION_ID</code>,{' '}
          <code className="text-zinc-300">NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY</code>, and{' '}
          <code className="text-zinc-300">NEXT_PUBLIC_ALGOLIA_INDEX_NAME</code> to your environment (see{' '}
          <code className="text-zinc-300">.env.example</code>
          ), create an index in the Algolia dashboard, then run <code className="text-zinc-300">npm run algolia:index</code>{' '}
          to push records.
        </p>
      </div>
    )
  }

  const initialUiState: UiState | undefined =
    initialQuery.trim().length > 0
      ? {[indexName]: {query: initialQuery}}
      : undefined

  return (
    <InstantSearchNext
      searchClient={searchClient}
      indexName={indexName}
      routing={routing}
      initialUiState={initialUiState}
      future={{
        preserveSharedStateOnUnmount: true,
      }}
    >
      <Configure
        hitsPerPage={15}
        attributesToHighlight={['title']}
        attributesToSnippet={['excerpt:20', 'bodyText:24']}
      />
      <div className="max-w-2xl">
        <SearchBox
          placeholder="Search interviews, news, photos, reviews…"
          classNames={{
            root: 'w-full',
            form: 'flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3',
            input:
              'min-h-11 w-full flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-400/20',
            submit:
              'inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-amber-600/60 bg-amber-500/10 px-5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20',
            reset:
              'inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-zinc-600 px-4 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100',
            loadingIndicator: 'text-xs text-zinc-500',
            submitIcon: 'hidden',
            resetIcon: 'hidden',
            loadingIcon: 'h-4 w-4 animate-spin',
            aiModeButton: 'hidden',
            aiModeIcon: 'hidden',
          }}
          translations={{
            submitButtonTitle: 'Search',
            resetButtonTitle: 'Clear',
          }}
        />
      </div>
      <div className="mt-10">
        <Hits<EditorialSearchRecord> hitComponent={SearchHit} classNames={{root: 'space-y-4', list: 'space-y-4', item: ''}} />
      </div>
    </InstantSearchNext>
  )
}
