import type {Metadata} from 'next'
import {EditorialCard, type EditorialCardItem} from '@/components/EditorialCard'
import {sanityFetch} from '@/sanity/lib/live'
import {SECTION_LIST} from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Interviews',
}

export default async function InterviewsHubPage() {
  const {data} = await sanityFetch({
    query: SECTION_LIST,
    params: {type: 'interview'},
  })
  const items = (data ?? []) as EditorialCardItem[]

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-50">Interviews</h1>
      <p className="mt-3 max-w-2xl text-zinc-400">
        Conversations with artists, promoters, and people behind the scenes.
      </p>
      <div className="mt-10 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <EditorialCard key={item._id} item={item} />
        ))}
      </div>
      {!items.length && (
        <p className="mt-8 text-sm text-zinc-500">No interviews published yet.</p>
      )}
    </div>
  )
}
