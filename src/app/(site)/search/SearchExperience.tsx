'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useSearchParams} from 'next/navigation'
import {useCallback, useEffect, useMemo, useRef, type MouseEvent} from 'react'
import {liteClient as algoliasearch} from 'algoliasearch/lite'
import type {Hit, UiState} from 'instantsearch.js'
import type {SendEventForHits} from 'instantsearch.js/es/lib/utils'
import {
  Configure,
  Highlight,
  Hits,
  SearchBox,
  Snippet,
  useInstantSearch,
} from 'react-instantsearch'
import {usePagination} from 'react-instantsearch-core'
import {
  InstantSearchNext,
  type InstantSearchNextRouting,
} from 'react-instantsearch-nextjs'
import type {EditorialAlgoliaRecord} from '@/lib/algolia/reindexEditorialAlgolia'
import {getAlgoliaPublicEnv, isAlgoliaSearchConfigured} from '@/lib/algoliaPublicEnv'
import {formatEditorialDate} from '@/lib/formatDate'
import {editorialHref, editorialTypeLabel} from '@/lib/paths'

export type EditorialSearchRecord = EditorialAlgoliaRecord

/** Algolia hits per search page (see `<Configure hitsPerPage />`). */
export const SEARCH_HITS_PER_PAGE = 10

type SearchRouteState = {q?: string; page?: number}

function parseRoutePage(value: string | number | undefined): number | undefined {
  if (value == null || value === '') return undefined
  const page = typeof value === 'number' ? value : parseInt(String(value), 10)
  return Number.isFinite(page) && page > 1 ? page : undefined
}

function SearchHit({hit, sendEvent: _sendEvent}: {hit: Hit<EditorialSearchRecord>; sendEvent: SendEventForHits}) {
  const href = editorialHref(hit.editorialType, hit.slug)
  const typeLabel = editorialTypeLabel(hit.editorialType)
  const date = hit.publishedAt != null ? formatEditorialDate(hit.publishedAt) : null

  return (
    <article className="group flex w-full gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 transition hover:border-amber-500/40 sm:gap-5 sm:p-4">
      {hit.coverImageUrl ? (
        <Link
          href={href}
          className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 sm:w-32"
        >
          <Image
            src={hit.coverImageUrl}
            alt={hit.coverImageAlt || hit.title || 'Cover'}
            fill
            sizes="(max-width: 640px) 96px, 128px"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            placeholder={hit.coverImageLqip ? 'blur' : 'empty'}
            blurDataURL={hit.coverImageLqip || undefined}
          />
        </Link>
      ) : (
        <div
          className="relative flex aspect-[4/3] w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800 px-1 sm:w-32"
          aria-hidden="true"
        >
          <span className="text-center text-[10px] leading-tight text-zinc-500 sm:text-xs">No image</span>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
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
        <h2 className="mt-1.5 text-base font-semibold leading-snug text-zinc-50 sm:mt-2">
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
      </div>
    </article>
  )
}

/** Props for `SearchBox` `submitIconComponent` (InstantSearch only passes `classNames`). */
type SearchSubmitSlotProps = {
  classNames: {submitIcon?: string}
}

/** Run one browse search on mount (recent articles via index custom ranking). Runs once per InstantSearch tree. */
function SearchInitialBrowse() {
  const {refresh} = useInstantSearch()
  const didBrowse = useRef(false)

  useEffect(() => {
    if (didBrowse.current) return
    didBrowse.current = true
    refresh()
  }, [refresh])

  return null
}

function SearchHitsLoading({label}: {label: string}) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={label}>
      <p className="sr-only">{label}</p>
      {[0, 1, 2, 3, 4].map((i) => (
        <SearchResultSkeleton key={i} />
      ))}
    </div>
  )
}

function SearchResultSkeleton() {
  return (
    <article
      className="flex w-full animate-pulse gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:gap-5 sm:p-4"
      aria-hidden="true"
    >
      <div className="aspect-[4/3] w-24 shrink-0 rounded-lg bg-zinc-800/80 sm:w-32" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 rounded bg-amber-300/20" />
          <div className="h-3 w-20 rounded bg-zinc-700/80" />
        </div>
        <div className="mt-3 h-4 w-10/12 rounded bg-zinc-700/80" />
        <div className="mt-2 h-4 w-7/12 rounded bg-zinc-700/60" />
        <div className="mt-4 hidden h-3 w-full rounded bg-zinc-800 sm:block" />
        <div className="mt-2 hidden h-3 w-5/6 rounded bg-zinc-800 sm:block" />
      </div>
    </article>
  )
}

function SearchHitsEmpty() {
  const {indexUiState} = useInstantSearch()
  const query = typeof indexUiState?.query === 'string' ? indexUiState.query.trim() : ''
  return (
    <p className="text-sm text-zinc-500">
      {query
        ? 'No articles match your search. Try different words.'
        : 'No articles in the search index yet. Run npm run algolia:index or POST /api/algolia/reindex after publishing content.'}
    </p>
  )
}

const paginationControlClass =
  'inline-flex h-8 w-8 items-center justify-center text-zinc-400 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50'
const paginationControlDisabledClass =
  'inline-flex h-8 w-8 cursor-not-allowed items-center justify-center text-zinc-600'
const paginationPageClass =
  'inline-flex h-8 min-w-8 items-center justify-center px-1 text-sm text-zinc-400 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50'
const paginationPageSelectedClass =
  'inline-flex h-8 min-w-8 items-center justify-center px-1 text-sm font-medium text-amber-300'

function navigateToPage(
  event: MouseEvent,
  refine: (page: number) => void,
  page: number,
) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  refine(page)
}

function SearchPagination() {
  const {pages, currentRefinement, refine, isFirstPage, isLastPage, nbPages, createURL} =
    usePagination({padding: 2})

  if (nbPages <= 1) return null

  const previousControl = isFirstPage ? (
    <span className={paginationControlDisabledClass} aria-disabled="true">
      <span aria-hidden="true">←</span>
    </span>
  ) : (
    <a
      href={createURL(currentRefinement - 1)}
      className={paginationControlClass}
      aria-label="Previous page"
      onClick={(event) => navigateToPage(event, refine, currentRefinement - 1)}
    >
      <span aria-hidden="true">←</span>
    </a>
  )

  const nextControl = isLastPage ? (
    <span className={paginationControlDisabledClass} aria-disabled="true">
      <span aria-hidden="true">→</span>
    </span>
  ) : (
    <a
      href={createURL(currentRefinement + 1)}
      className={paginationControlClass}
      aria-label="Next page"
      onClick={(event) => navigateToPage(event, refine, currentRefinement + 1)}
    >
      <span aria-hidden="true">→</span>
    </a>
  )

  return (
    <nav
      className="mt-8 grid w-full grid-cols-[1fr_auto_1fr] items-center"
      aria-label="Search results pages"
    >
      <div className="flex justify-end">{previousControl}</div>
      <ul className="flex list-none items-center justify-center gap-0.5 p-0">
        {pages.map((page) => {
          const isSelected = page === currentRefinement
          return (
            <li key={page}>
              <a
                href={createURL(page)}
                className={isSelected ? paginationPageSelectedClass : paginationPageClass}
                aria-label={`Page ${page + 1}`}
                aria-current={isSelected ? 'page' : undefined}
                onClick={(event) => navigateToPage(event, refine, page)}
              >
                {page + 1}
              </a>
            </li>
          )
        })}
      </ul>
      <div className="flex justify-start">{nextControl}</div>
    </nav>
  )
}

function SearchHitsSection() {
  const {results, status, indexUiState} = useInstantSearch()
  const hits = results?.hits ?? []
  const isSearching = status === 'loading' || status === 'stalled'
  const awaitingFirstResponse = results == null
  const query = typeof indexUiState?.query === 'string' ? indexUiState.query.trim() : ''
  const browseLabel = query ? 'Loading search results' : 'Loading recent articles'

  if (awaitingFirstResponse || (hits.length === 0 && isSearching)) {
    return <SearchHitsLoading label={browseLabel} />
  }

  if (hits.length === 0) {
    return <SearchHitsEmpty />
  }

  return (
    <section aria-label={query ? 'Search results' : 'Articles'}>
      <div className={isSearching ? 'opacity-70 transition-opacity' : undefined} aria-busy={isSearching}>
        <Hits<EditorialSearchRecord>
          hitComponent={SearchHit}
          classNames={{root: 'w-full space-y-4', list: 'w-full space-y-4', item: ''}}
        />
        {isSearching ? (
          <div className="mt-4 space-y-4">
            {[0, 1, 2].map((i) => (
              <SearchResultSkeleton key={`updating-${i}`} />
            ))}
          </div>
        ) : null}
        {isSearching ? (
          <p className="sr-only" aria-live="polite">
            Updating results…
          </p>
        ) : null}
      </div>
      <SearchPagination />
    </section>
  )
}

function DebouncedSearchBox() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const queryHook = useCallback((query: string, search: (value: string) => void) => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) {
      search(query)
      return
    }
    debounceRef.current = setTimeout(() => search(query), 300)
  }, [])

  return (
    <SearchBox
      placeholder="Search interviews, news, photos, reviews…"
      searchAsYouType
      queryHook={queryHook}
      submitIconComponent={SearchSubmitButtonContent}
      classNames={{
        root: 'w-full',
        form: 'flex flex-row items-stretch gap-3',
        input:
          'min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-400/20',
        submit:
          'inline-flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-600/60 bg-amber-500/10 text-amber-100 transition hover:bg-amber-500/20',
        reset: 'hidden',
        loadingIndicator: 'sr-only',
        submitIcon: '',
        resetIcon: 'hidden',
        loadingIcon: 'h-4 w-4 animate-spin',
        aiModeButton: 'hidden',
        aiModeIcon: 'hidden',
      }}
      translations={{
        submitButtonTitle: 'Submit search',
        resetButtonTitle: 'Clear',
      }}
    />
  )
}

function SearchSubmitButtonContent({classNames}: SearchSubmitSlotProps) {
  return (
    <>
      <svg
        className={`h-5 w-5 shrink-0 ${classNames.submitIcon ?? ''}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <span className="sr-only">Search</span>
    </>
  )
}

export function SearchExperience() {
  const {appId, searchKey, indexName} = getAlgoliaPublicEnv()
  const searchParams = useSearchParams()
  const initialQueryRef = useRef<string | null>(null)
  const initialPageRef = useRef<number | undefined>(undefined)
  if (initialQueryRef.current === null) {
    initialQueryRef.current = searchParams.get('q')?.trim() ?? ''
    initialPageRef.current = parseRoutePage(searchParams.get('page') ?? undefined)
  }

  const searchClient = useMemo(
    () => (isAlgoliaSearchConfigured() ? algoliasearch(appId, searchKey) : null),
    [appId, searchKey],
  )

  const routing = useMemo((): InstantSearchNextRouting<UiState, SearchRouteState> => {
    return {
      stateMapping: {
        stateToRoute(uiState) {
          const indexState = uiState[indexName]
          const route: SearchRouteState = {}
          const q = indexState?.query
          if (typeof q === 'string' && q.trim()) route.q = q.trim()
          const page = indexState?.page
          if (typeof page === 'number' && page > 1) route.page = page
          return route
        },
        routeToState(routeState) {
          const raw = routeState.q
          const q = typeof raw === 'string' ? raw : ''
          const page = parseRoutePage(routeState.page)
          return {
            [indexName]: {
              query: q,
              ...(page ? {page} : {}),
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

  const initialUiState = useMemo((): UiState => {
    const q = initialQueryRef.current ?? ''
    const page = initialPageRef.current
    return {
      [indexName]: {
        query: q,
        ...(page ? {page} : {}),
      },
    }
  }, [indexName])

  if (!searchClient || !indexName) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-zinc-200">
        <p className="font-medium text-amber-200">Algolia is not configured yet</p>
        <p className="mt-2 text-zinc-400">
          Add Algolia env vars (see{' '}
          <code className="text-zinc-300">.env.example</code>
          ). Public app id + search-only key + index name are required; names from the{' '}
          <a
            href="https://www.sanity.io/docs/developer-guides/how-to-implement-front-end-search-with-sanity"
            className="text-amber-200/90 underline underline-offset-2 hover:text-amber-200"
          >
            Sanity search guide
          </a>{' '}
          (<code className="text-zinc-300">NEXT_PUBLIC_ALGOLIA_APP_ID</code>,{' '}
          <code className="text-zinc-300">NEXT_PUBLIC_ALGOLIA_API_KEY</code>) are accepted as aliases. Then run{' '}
          <code className="text-zinc-300">npm run algolia:index</code> or hit <code className="text-zinc-300">POST /api/algolia/reindex</code>{' '}
          to push records.
        </p>
      </div>
    )
  }

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
      <SearchInitialBrowse />
      <Configure
        hitsPerPage={SEARCH_HITS_PER_PAGE}
        attributesToHighlight={['title']}
        attributesToSnippet={['excerpt:20', 'bodyText:24']}
      />
      <div className="w-full min-w-0 lg:w-1/2">
        <DebouncedSearchBox />
      </div>
      <div className="mt-10 w-full">
        <SearchHitsSection />
      </div>
    </InstantSearchNext>
  )
}
