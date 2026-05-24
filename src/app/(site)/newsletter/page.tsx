import Link from 'next/link'
import type {Metadata} from 'next'

import {SanityImage} from '@/components/SanityImage'
import {newsletterHref} from '@/lib/paths'
import {sanityFetch} from '@/sanity/lib/live'
import {NEWSLETTER_ISSUE_LIST} from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Newsletter',
  description: 'Archive of Philadelphia Music Live newsletter issues.',
}

export default async function NewsletterIndexPage() {
  const {data: issues} = await sanityFetch({
    query: NEWSLETTER_ISSUE_LIST,
    perspective: 'published',
    stega: false,
  })

  const rows = issues ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <header className="mb-10 border-b border-zinc-800 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Newsletter</h1>
        <p className="mt-3 text-zinc-400">
          Past issues from Philadelphia Music Live. Subscribe from the site footer to get new ones by email.
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="text-zinc-500">No published issues yet.</p>
      ) : (
        <ul className="space-y-6">
          {rows.map(
            (issue: {
              _id: string
              title: string
              slug: string
              publishedAt: string
              previewText?: string | null
              coverImage?: Parameters<typeof SanityImage>[0]['value']
            }) => {
              const date = new Date(issue.publishedAt)
              const when = Number.isNaN(date.getTime())
                ? ''
                : date.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})
              return (
                <li key={issue._id}>
                  <Link
                    href={newsletterHref(issue.slug)}
                    className="group flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-amber-500/40"
                  >
                    {issue.coverImage ? (
                      <div className="size-20 shrink-0 overflow-hidden rounded-lg border border-zinc-800">
                        <SanityImage value={issue.coverImage} sizes="80px" variant="cover" />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <h2 className="font-semibold text-zinc-100 group-hover:text-amber-200">{issue.title}</h2>
                      {when ? <p className="mt-1 text-xs text-zinc-500">{when}</p> : null}
                      {issue.previewText ? (
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{issue.previewText}</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              )
            },
          )}
        </ul>
      )}
    </div>
  )
}
