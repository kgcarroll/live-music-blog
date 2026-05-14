import Link from 'next/link'
import type {Metadata} from 'next'
import {authorHref} from '@/lib/paths'
import {sanityFetch} from '@/sanity/lib/live'
import {ALL_AUTHORS} from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Authors',
}

type AuthorRow = {_id: string; name: string | null; slug: string | null}

export default async function AuthorsIndexPage() {
  const {data} = await sanityFetch({query: ALL_AUTHORS})
  const authors = (data ?? []) as AuthorRow[]

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-50">Authors</h1>
      <p className="mt-3 max-w-2xl text-zinc-400">
        Everyone who writes for the site. Open a name to see their interviews, galleries, and reviews.
      </p>
      {authors.length > 0 ? (
        <ul className="mt-10 max-w-xl space-y-2 border-t border-zinc-800 pt-8">
          {authors.map((a) =>
            a.slug && a.name ? (
              <li key={a._id} className="border-b border-zinc-800/80 py-2 last:border-0">
                <Link
                  href={authorHref(a.slug)}
                  className="text-lg font-medium text-zinc-100 transition-colors hover:text-amber-200"
                >
                  {a.name}
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">
          No authors yet. Add an Author document in Studio, then link posts to them.
        </p>
      )}
    </div>
  )
}
