import type {PortableTextBlock} from '@portabletext/types'

import {ArticleBody} from '@/components/ArticleBody'
import {SanityImage} from '@/components/SanityImage'

type CoverImage = Parameters<typeof SanityImage>[0]['value']

export function NewsletterIssueContent({
  title,
  publishedAt,
  coverImage,
  body,
}: {
  title: string
  publishedAt: string
  coverImage?: CoverImage | null
  body?: PortableTextBlock[] | null
}) {
  const date = new Date(publishedAt)
  const when = Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'})

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <header className="mb-8 border-b border-zinc-800 pb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-400/90">Newsletter</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">{title}</h1>
        {when ? <p className="mt-3 text-sm text-zinc-400">{when}</p> : null}
      </header>
      {coverImage ? (
        <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-800">
          <SanityImage value={coverImage} sizes="(max-width: 768px) 100vw, 48rem" priority />
        </div>
      ) : null}
      {body?.length ? <ArticleBody value={body} /> : null}
    </article>
  )
}
