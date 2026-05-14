import Link from 'next/link'
import {EditorialCard, type EditorialCardItem} from '@/components/EditorialCard'
import {sanityFetch} from '@/sanity/lib/live'
import {HOME_EDITORIAL_LIST} from '@/sanity/lib/queries'

/** Fresher home page when you publish in Studio (layout still uses 60s elsewhere). */
export const revalidate = 30

export default async function HomePage() {
  const {data: editorial} = await sanityFetch({query: HOME_EDITORIAL_LIST})
  const items = (editorial ?? []) as EditorialCardItem[]

  return (
    <div>
      <section className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">Latest from the pit</h1>
        <p className="mt-3 text-balance text-zinc-400">
          Interviews, photo galleries, and reviews — updated as we publish. Click any cover to read the full
          story.
        </p>
      </section>
      <section className="grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <EditorialCard key={item._id} item={item} />
        ))}
      </section>
      {(!items.length) && (
        <p className="mt-8 rounded-lg border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
          No stories yet. Open{' '}
          <Link href="/studio" className="text-amber-300 underline">
            Sanity Studio
          </Link>{' '}
          to add interviews, photos, or reviews.
        </p>
      )}
    </div>
  )
}
