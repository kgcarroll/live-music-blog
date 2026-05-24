import Image from 'next/image'
import Link from 'next/link'
import type {HomeFeaturedHero} from '@/lib/homeFeatured'
import {editorialHref, editorialTypeLabel} from '@/lib/paths'
import {urlForImage} from '@/sanity/lib/image'

export function HomeFeaturedHeroSlide({
  item,
  priority = false,
}: {
  item: HomeFeaturedHero
  priority?: boolean
}) {
  if (!item.slug) return null

  const href = editorialHref(item._type, item.slug)
  const typeLabel = editorialTypeLabel(item._type)
  const date =
    item.publishedAt != null
      ? new Date(item.publishedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null
  const heroImage = item.featureImage?.asset?._id ? item.featureImage : item.coverImage
  const lqip = heroImage?.asset?.metadata?.lqip
  const heroSrc =
    heroImage?.asset?._id ? urlForImage(heroImage as never).width(2400).fit('max').url() : null
  const deck = item.verdict?.trim() || item.excerpt?.trim() || null

  return (
    <article
      data-hero-href={href}
      className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm transition hover:border-amber-500/40"
    >
      <div className="relative w-full max-sm:h-[calc((100vw-2rem)*0.75+7rem)] sm:aspect-[8/3]">
        {heroSrc ? (
          <Image
            src={heroSrc}
            alt={heroImage?.alt || item.title || 'Featured story'}
            fill
            priority={priority}
            sizes="100vw"
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            className="pointer-events-none object-cover object-center transition duration-500 group-hover:scale-[1.01]"
            placeholder={lqip ? 'blur' : 'empty'}
            blurDataURL={lqip || undefined}
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-800" aria-hidden />
        )}
        <div className="absolute inset-0 hero-slide-gradient" aria-hidden />
        <div className="relative flex h-full flex-col justify-end p-5 pl-10 pr-10 max-sm:pb-12 sm:p-8 sm:pl-14 sm:pr-14 md:p-10 md:pl-16 md:pr-16">
          <p className="text-xs leading-snug">
            <span className="uppercase tracking-wide text-amber-300">{typeLabel}</span>
            {date ? (
              <>
                <span className="mx-1.5 text-zinc-600" aria-hidden="true">
                  |
                </span>
                <time className="tabular-nums text-zinc-300" dateTime={item.publishedAt ?? undefined}>
                  {date}
                </time>
              </>
            ) : null}
          </p>
          <h2 className="mt-3 max-w-3xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
            <Link
              href={href}
              className="text-zinc-50 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 rounded-sm group-hover:text-amber-200"
            >
              {item.title}
            </Link>
          </h2>
          {deck ? (
            <p className="mt-3 max-w-2xl line-clamp-2 text-sm leading-relaxed text-zinc-300 sm:line-clamp-3 sm:text-base">
              {deck}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
