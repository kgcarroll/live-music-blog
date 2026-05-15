'use client'

import {Suspense} from 'react'

import {SearchExperienceClient} from './SearchExperienceClient'

function SearchPageFallback() {
  return (
    <div className="mt-8 w-full" aria-busy="true" aria-label="Loading search">
      <div className="h-11 w-full min-w-0 rounded-lg bg-zinc-800/80 animate-pulse lg:w-1/2" />
    </div>
  )
}

export function SearchPageView() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-50">Search</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-500">
        The most recent articles are shown below. Search for any keyword to refine your search.
      </p>
      <Suspense fallback={<SearchPageFallback />}>
        <div className="mt-8">
          <SearchExperienceClient />
        </div>
      </Suspense>
    </div>
  )
}
