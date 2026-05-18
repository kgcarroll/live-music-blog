import Image from 'next/image'
import Link from 'next/link'
import type {TypedObject} from '@portabletext/types'
import {ArticleBody} from '@/components/ArticleBody'
import {EditorialCard, type EditorialAuthor, type EditorialCardItem} from '@/components/EditorialCard'
import {PhotoGalleryMosaic, type PhotoGalleryImage} from '@/components/PhotoGalleryMosaic'
import {authorHref, editorialTypeLabel, tagHref} from '@/lib/paths'
import {urlForImage} from '@/sanity/lib/image'

export type EditorialDoc = {
  _id: string
  _type: string
  title: string | null
  slug: string | null
  publishedAt?: string | null
  excerpt?: string | null
  author?: EditorialAuthor | null
  tags?: EditorialTag[] | null
  subhead?: string | null
  galleryNote?: string | null
  gallery?: PhotoGalleryImage[] | null
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
  seoTitle?: string | null
  seoDescription?: string | null
  body?: TypedObject[] | null
  relatedArticles?: EditorialCardItem[] | null
}

type EditorialTag = {
  _id?: string
  title?: string | null
  slug?: string | null
}

const AUTHOR_BIO_EXCERPT_CHARS = 240

function plainTextFromPortableText(value: TypedObject[] | null | undefined): string {
  if (!value?.length) return ''

  return value
    .map((block) => {
      if (!('children' in block) || !Array.isArray(block.children)) return ''
      return block.children
        .map((child: unknown) => {
          if (child == null || typeof child !== 'object' || !('text' in child)) return ''
          const text = (child as {text?: unknown}).text
          return typeof text === 'string' ? text : ''
        })
        .join('')
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function excerptText(text: string): {text: string; truncated: boolean} {
  if (text.length <= AUTHOR_BIO_EXCERPT_CHARS) return {text, truncated: false}
  const sliced = text.slice(0, AUTHOR_BIO_EXCERPT_CHARS)
  const lastSpace = sliced.lastIndexOf(' ')
  return {
    text: sliced.slice(0, lastSpace > 120 ? lastSpace : sliced.length).trim(),
    truncated: true,
  }
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

  const tags = (doc.tags ?? []).filter((tag) => tag?.title?.trim() && tag?.slug?.trim())
  const relatedArticles = doc.relatedArticles ?? []
  const authorBio = excerptText(plainTextFromPortableText(doc.author?.bio))
  const authorName = doc.author?.name?.trim()
  const authorSlug = doc.author?.slug?.trim()

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

      <div className="mx-auto mt-10 max-w-3xl px-4">
        <ArticleBody value={doc.body || undefined} />
      </div>

      {authorBio.text && authorName && authorSlug ? (
        <aside className="mx-auto mt-8 max-w-3xl px-4" aria-label={`About ${authorName}`}>
          <p className="text-xs italic leading-relaxed text-zinc-500">
            <span>
              {authorBio.text}
              {authorBio.truncated ? '...' : null}
            </span>
            {authorBio.truncated ? (
              <Link
                href={authorHref(authorSlug)}
                className="ml-1 font-medium text-zinc-400 transition-colors hover:text-amber-200"
                aria-label={`Read more by ${authorName}`}
              >
                read more
              </Link>
            ) : null}
          </p>
        </aside>
      ) : null}

      {tags.length ? (
        <section className="mx-auto mt-10 max-w-3xl px-4" aria-label="Article tags">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tags</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag._id ?? tag.slug}
                href={tagHref(tag.slug?.trim() ?? '')}
                className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 transition hover:border-amber-500/50 hover:text-amber-200"
              >
                {tag.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {relatedArticles.length ? (
        <section className="mx-auto mt-14 max-w-5xl px-4" aria-labelledby="related-articles-heading">
          <h2 id="related-articles-heading" className="text-2xl font-semibold tracking-tight text-zinc-50">
            Related articles
          </h2>
          <div className="mt-6 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-3 md:gap-6">
            {relatedArticles.map((item) => (
              <EditorialCard key={item._id} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  )
}
