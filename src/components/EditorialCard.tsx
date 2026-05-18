import Image from 'next/image'
import Link from 'next/link'
import type {TypedObject} from '@portabletext/types'
import {editorialHref, editorialTypeLabel} from '@/lib/paths'
import {urlForImage} from '@/sanity/lib/image'

export type EditorialAuthor = {
  name?: string | null
  bio?: TypedObject[] | null
  slug?: string | null
}

export type EditorialCardItem = {
  _id: string
  _type: string
  title: string | null
  slug: string | null
  publishedAt?: string | null
  author?: EditorialAuthor | null
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
}

export function EditorialCard({item}: {item: EditorialCardItem}) {
  if (!item.slug) return null
  const href = editorialHref(item._type, item.slug)
  const dims = item.coverImage?.asset?.metadata?.dimensions
  const w = Math.min(dims?.width || 1200, 1200)
  const h = Math.min(dims?.height || 800, 800)
  const lqip = item.coverImage?.asset?.metadata?.lqip
  const src =
    item.coverImage && item.coverImage.asset?._id
      ? urlForImage(item.coverImage as never).width(900).height(600).fit('max').url()
      : null

  const date =
    item.publishedAt != null
      ? new Date(item.publishedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null
  const typeLabel = editorialTypeLabel(item._type)
  const authorByline = item.author?.name?.trim() || null

  return (
    <article className="group flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-sm transition hover:border-amber-500/40">
      <Link href={href} className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-zinc-800">
        {src ? (
          <Image
            src={src}
            alt={item.coverImage?.alt || item.title || 'Cover'}
            width={w}
            height={h}
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, min(400px, 33vw)"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            placeholder={lqip ? 'blur' : 'empty'}
            blurDataURL={lqip || undefined}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">No image</div>
        )}
      </Link>
      <div className="flex min-h-0 flex-1 flex-col gap-1 p-3 sm:gap-1.5 sm:p-4">
        <Link
          href={href}
          className="flex min-h-0 flex-1 flex-col gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        >
          <p className="shrink-0 text-xs leading-snug">
            <span className="uppercase tracking-wide text-amber-300">{typeLabel}</span>
            {date ? (
              <>
                <span className="mx-1.5 text-zinc-600" aria-hidden="true">
                  |
                </span>
                <time className="tabular-nums text-zinc-400" dateTime={item.publishedAt ?? undefined}>
                  {date}
                </time>
              </>
            ) : null}
          </p>
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-50 group-hover:text-amber-200 sm:text-base">
            {item.title}
          </h2>
        </Link>
        {authorByline ? (
          <p className="mt-auto shrink-0 text-xs leading-snug text-zinc-500">By {authorByline}</p>
        ) : null}
      </div>
    </article>
  )
}
