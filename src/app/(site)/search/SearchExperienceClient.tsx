'use client'

import nextDynamic from 'next/dynamic'

const SearchExperience = nextDynamic(
  () => import('./SearchExperience').then((mod) => mod.SearchExperience),
  {
    ssr: false,
    loading: () => <SearchExperienceFallback />,
  },
)

function SearchExperienceFallback() {
  return (
    <div className="w-full space-y-10" aria-busy="true" aria-label="Loading search">
      <div className="h-11 w-full min-w-0 rounded-lg bg-zinc-800/80 animate-pulse lg:w-1/2" />
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-800/60 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export function SearchExperienceClient() {
  return <SearchExperience />
}
