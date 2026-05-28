import Image from 'next/image'
import {urlForImage} from '@/sanity/lib/image'

export type BodyImageLayout = 'full' | 'floatLeft' | 'floatRight'

export type BodyImageValue = {
  _type?: string
  alt?: string
  caption?: string
  layout?: BodyImageLayout | string | null
  asset?: {
    _id?: string
    url?: string | null
    metadata?: {
      lqip?: string | null
      dimensions?: {width?: number; height?: number}
    } | null
  } | null
  hotspot?: unknown
  crop?: unknown
}

function resolveLayout(value: BodyImageValue): BodyImageLayout {
  if (value.layout === 'floatLeft' || value.layout === 'floatRight') return value.layout
  return 'full'
}

export function SanityImage({
  value,
  sizes,
  priority,
  embedded,
  variant = 'default',
}: {
  value: BodyImageValue
  sizes: string
  priority?: boolean
  /** Side-by-side layouts: no extra vertical margin on figure. */
  embedded?: boolean
  /** Square crop for cards and thumbnails. */
  variant?: 'default' | 'cover'
}) {
  if (!value?.asset?._id) return null
  const dims = value.asset.metadata?.dimensions
  const lqip = value.asset.metadata?.lqip

  if (variant === 'cover') {
    const coverSize = 400
    const src = urlForImage(value as never)
      .width(coverSize)
      .height(coverSize)
      .fit('crop')
      .auto('format')
      .url()

    return (
      <figure className="relative m-0 size-full overflow-hidden">
        <Image
          src={src}
          alt={value.alt || ''}
          fill
          sizes={sizes}
          className="object-cover"
          placeholder={lqip ? 'blur' : 'empty'}
          blurDataURL={lqip || undefined}
          priority={priority}
        />
      </figure>
    )
  }

  const w = Math.min(dims?.width || 1400, 1600)
  const h = Math.min(dims?.height || 900, 1200)
  const src = urlForImage(value as never).width(w).url()
  const layout = embedded ? 'full' : resolveLayout(value)

  const figureClass = embedded
    ? 'article-image w-full'
    : layout === 'floatLeft'
      ? 'article-image article-image--float-left'
      : layout === 'floatRight'
        ? 'article-image article-image--float-right'
        : 'article-image article-image--full'

  return (
    <figure className={figureClass}>
      <Image
        src={src}
        alt={value.alt || ''}
        width={Math.round(w)}
        height={Math.round(h)}
        sizes={sizes}
        className="h-auto max-w-full rounded-lg border border-zinc-800"
        style={{width: '100%', height: 'auto'}}
        placeholder={lqip ? 'blur' : 'empty'}
        blurDataURL={lqip || undefined}
        priority={priority}
      />
      {value.caption ? (
        <figcaption className="mt-2 text-center text-xs italic text-amber-300/90">
          {value.caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
