'use client'

import Image from 'next/image'
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
      <div className="w-1/2 min-w-0">
        <SearchBox
          placeholder="Search interviews, news, photos, reviews…"
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
      </div>
      <div className="mt-10 w-full">
        <Hits<EditorialSearchRecord> hitComponent={SearchHit} classNames={{root: 'w-full space-y-4', list: 'w-full space-y-4', item: ''}} />
      </div>
    </InstantSearchNext>
  )
}
