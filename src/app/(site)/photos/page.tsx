import type {Metadata} from 'next'
import {EditorialCard, type EditorialCardItem} from '@/components/EditorialCard'
import {sanityFetch} from '@/sanity/lib/live'
import {SECTION_LIST} from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Photos',
}

export default async function PhotosHubPage() {
  const {data} = await sanityFetch({
    query: SECTION_LIST,
    params: {type: 'photoPost'},
  })
  const items = (data ?? []) as EditorialCardItem[]

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-50">Photos</h1>
      <p className="mt-3 max-w-2xl text-zinc-400">Live shots from the floor, the pit, and the balcony.</p>
      <div className="mt-10 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <EditorialCard key={item._id} item={item} />
        ))}
      </div>
      {!items.length && (
        <p className="mt-8 text-sm text-zinc-500">No photo posts published yet.</p>
      )}
    </div>
  )
}
