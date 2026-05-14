'use client'

import Image from 'next/image'
import {urlForImage} from '@/sanity/lib/image'

type BodyImageValue = {
  _type?: string
  alt?: string
  caption?: string
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

export function SanityImage({
  value,
  sizes,
  priority,
}: {
  value: BodyImageValue
  sizes: string
  priority?: boolean
}) {
  if (!value?.asset?._id) return null
  const dims = value.asset.metadata?.dimensions
  const w = Math.min(dims?.width || 1400, 1600)
  const h = Math.min(dims?.height || 900, 1200)
  const src = urlForImage(value as never).width(w).url()
  const lqip = value.asset.metadata?.lqip

  return (
    <figure className="my-8">
      <Image
        src={src}
        alt={value.alt || ''}
        width={Math.round(w)}
        height={Math.round(h)}
        sizes={sizes}
        className="h-auto w-full rounded-lg border border-zinc-800"
        placeholder={lqip ? 'blur' : 'empty'}
        blurDataURL={lqip || undefined}
        priority={priority}
      />
      {value.caption ? (
        <figcaption className="mt-2 text-center text-sm text-zinc-500">{value.caption}</figcaption>
      ) : null}
    </figure>
  )
}
