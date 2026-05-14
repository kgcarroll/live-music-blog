import Image from 'next/image'
import Link from 'next/link'
import {ArticleBody} from '@/components/ArticleBody'
import type {EditorialAuthor} from '@/components/EditorialCard'
import {authorHref} from '@/lib/paths'
import {urlForImage} from '@/sanity/lib/image'

export type EditorialDoc = {
  _id: string
  title: string | null
  slug: string | null
  publishedAt?: string | null
  excerpt?: string | null
  author?: EditorialAuthor | null
  subhead?: string | null
  galleryNote?: string | null
  verdict?: string | null
  coverImage?: {
    alt?: string
    hotspot?: unknown
    crop?: unknown
    asset?: {
      _id?: string
      url?: string | null
      metadata?: {
        lqip?: string | null
        dimensions?: {width?: number; height?: number}
      } | null
    } | null
  } | null
  venue?: {name?: string | null} | null
  artists?: {name?: string | null}[] | null
  seoTitle?: string | null
  seoDescription?: string | null
  body?: import('@portabletext/types').TypedObject[] | null
}

export function EditorialArticleContent({doc}: {doc: EditorialDoc}) {
  const date =
    doc.publishedAt != null
      ? new Date(doc.publishedAt).toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null

  const dims = doc.coverImage?.asset?.metadata?.dimensions
  const w = Math.min(dims?.width || 1600, 1600)
  const h = Math.min(dims?.height || 900, 900)
  const lqip = doc.coverImage?.asset?.metadata?.lqip
  const heroSrc =
    doc.coverImage && doc.coverImage.asset?._id
      ? urlForImage(doc.coverImage as never).width(1600).url()
      : null

  const chips: string[] = []
  if (doc.venue?.name) chips.push(doc.venue.name)
  doc.artists?.forEach((a) => {
    if (a?.name) chips.push(a.name)
  })

  return (
    <article className="pb-16">
      <div className="border-b border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">{doc.title}</h1>
          {doc.subhead ? <p className="mt-4 text-lg text-zinc-400">{doc.subhead}</p> : null}
          {doc.galleryNote ? <p className="mt-4 text-lg text-zinc-400">{doc.galleryNote}</p> : null}
          {doc.verdict ? <p className="mt-4 text-lg font-medium text-amber-200/90">{doc.verdict}</p> : null}
          <p className="mt-6 text-sm text-zinc-400">
            {doc.author?.name?.trim() && doc.author?.slug?.trim() ? (
              <Link
                href={authorHref(doc.author.slug.trim())}
                className="font-medium text-zinc-200 underline-offset-2 transition-colors hover:text-amber-200 hover:underline"
              >
                {doc.author.name.trim()}
              </Link>
            ) : (
              <span className="font-medium text-zinc-200">Editorial</span>
            )}
            {date ? <span> · {date}</span> : null}
          </p>
          {chips.length > 0 ? (
            <p className="mt-3 text-sm text-amber-200/85">{chips.join(' · ')}</p>
          ) : null}
        </div>
      </div>

      {heroSrc ? (
        <div className="mx-auto mt-0 max-w-5xl px-4 pt-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <Image
              src={heroSrc}
              alt={doc.coverImage?.alt || doc.title || 'Hero'}
              width={Math.round(w)}
              height={Math.round(h)}
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="h-full w-full object-cover"
              placeholder={lqip ? 'blur' : 'empty'}
              blurDataURL={lqip || undefined}
            />
          </div>
        </div>
      ) : null}

      {doc.excerpt ? (
        <p className="mx-auto mt-10 max-w-3xl px-4 text-lg leading-relaxed text-zinc-300">{doc.excerpt}</p>
      ) : null}

      <div className="mx-auto mt-10 max-w-3xl px-4">
        <ArticleBody value={doc.body || undefined} />
      </div>
    </article>
  )
}
