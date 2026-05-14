import Image from 'next/image'
import Link from 'next/link'
import {ArticleBody} from '@/components/ArticleBody'
import type {EditorialAuthor} from '@/components/EditorialCard'
import {PhotoGalleryMosaic, type PhotoGalleryImage} from '@/components/PhotoGalleryMosaic'
import {YouTubeEmbed} from '@/components/YouTubeEmbed'
import {authorHref, editorialTypeLabel} from '@/lib/paths'
import {getYouTubeVideoId} from '@/lib/youtube'
import {urlForImage} from '@/sanity/lib/image'

export type EditorialDoc = {
  _id: string
  _type: string
  title: string | null
  slug: string | null
  publishedAt?: string | null
  excerpt?: string | null
  author?: EditorialAuthor | null
  subhead?: string | null
  galleryNote?: string | null
  gallery?: PhotoGalleryImage[] | null
  verdict?: string | null
  youtubeUrl?: string | null
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
  const metaDate =
    doc.publishedAt != null
      ? new Date(doc.publishedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null
  const typeLabel = editorialTypeLabel(doc._type)

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

  const youtubeId = doc._type === 'review' ? getYouTubeVideoId(doc.youtubeUrl) : null

  return (
    <article className="pb-16">
      <div className="bg-zinc-950/80">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <p className="text-xs leading-snug text-zinc-400">
            <span className="uppercase tracking-wide text-amber-300">{typeLabel}</span>
            {metaDate ? (
              <>
                <span className="mx-1.5 text-zinc-600" aria-hidden="true">
                  |
                </span>
                <time className="tabular-nums text-zinc-400" dateTime={doc.publishedAt ?? undefined}>
                  {metaDate}
                </time>
              </>
            ) : null}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">{doc.title}</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Written by{' '}
            {doc.author?.name?.trim() && doc.author?.slug?.trim() ? (
              <Link
                href={authorHref(doc.author.slug.trim())}
                className="text-zinc-400 transition-colors hover:text-amber-200"
              >
                {doc.author.name.trim()}
              </Link>
            ) : (
              <span className="text-zinc-400">Editorial</span>
            )}
          </p>
          {doc.subhead ? <p className="mt-4 text-lg text-zinc-400">{doc.subhead}</p> : null}
          {doc.galleryNote ? <p className="mt-4 text-lg text-zinc-400">{doc.galleryNote}</p> : null}
          {doc.verdict ? <p className="mt-4 text-lg font-medium text-amber-200/90">{doc.verdict}</p> : null}
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

      {doc._type === 'photoPost' && doc.gallery?.length ? (
        <PhotoGalleryMosaic images={doc.gallery} />
      ) : null}

      {doc.excerpt ? (
        <p className="mx-auto mt-10 max-w-3xl px-4 text-lg leading-relaxed text-zinc-300">{doc.excerpt}</p>
      ) : null}

      {youtubeId ? (
        <div className="mx-auto mt-10 max-w-4xl px-4">
          <YouTubeEmbed videoId={youtubeId} title={doc.title} />
        </div>
      ) : null}

      <div className="mx-auto mt-10 max-w-3xl px-4">
        <ArticleBody value={doc.body || undefined} />
      </div>
    </article>
  )
}
