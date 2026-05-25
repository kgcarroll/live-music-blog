'use client'

import Image from 'next/image'
import {useCallback, useState} from 'react'

import type {PhotoGalleryImage} from '@/lib/photoGalleryTypes'
import {urlForImage} from '@/sanity/lib/image'

function slideSrc(img: PhotoGalleryImage) {
  return urlForImage(img as never).width(1600).fit('max').url()
}

/** Matches HomeFeaturedSlideshow navigation controls (positioned beside the frame). */
const navButtonClass =
  'shrink-0 text-3xl leading-none text-zinc-500 transition hover:text-amber-300 focus-visible:outline-none focus-visible:text-amber-300 sm:text-4xl'

/** Inline slide carousel with prev/next; captions and counter shown below the image. */
export function PhotoGalleryCarousel({images}: {images: PhotoGalleryImage[]}) {
  const items = images.filter((img) => img.asset?._id)
  const [index, setIndex] = useState(0)

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
  }, [items.length])

  const goNext = useCallback(() => {
    setIndex((i) => (i >= items.length - 1 ? 0 : i + 1))
  }, [items.length])

  if (!items.length) return null

  const safeIndex = Math.min(index, items.length - 1)
  const img = items[safeIndex]!
  const lqip = img.asset?.metadata?.lqip
  const hasMultiple = items.length > 1
  const caption = img.caption?.trim()

  const slideFrame = (
    <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="relative h-[300px] w-full md:h-[500px]">
        <Image
          key={img._key ?? img.asset?._id ?? safeIndex}
          src={slideSrc(img)}
          alt={img.alt?.trim() || 'Gallery image'}
          fill
          sizes="(max-width: 768px) calc(100vw - 4rem), 44rem"
          className="object-cover object-center"
          placeholder={lqip ? 'blur' : 'empty'}
          blurDataURL={lqip || undefined}
        />
      </div>
    </div>
  )

  return (
    <section className="w-full" aria-roledescription="carousel" aria-label="Photo gallery">
      {hasMultiple ? (
        <div className="flex items-center gap-1 sm:gap-3">
          <button type="button" className={navButtonClass} aria-label="Previous image" onClick={goPrev}>
            ‹
          </button>
          {slideFrame}
          <button type="button" className={navButtonClass} aria-label="Next image" onClick={goNext}>
            ›
          </button>
        </div>
      ) : (
        slideFrame
      )}

      {(caption || hasMultiple) && (
        <div className="mt-3 flex flex-col items-center gap-1 text-center">
          {caption ? <p className="text-sm leading-relaxed text-amber-300">{caption}</p> : null}
          {hasMultiple ? (
            <p className="text-xs tabular-nums text-amber-300" aria-live="polite">
              {safeIndex + 1} / {items.length}
            </p>
          ) : null}
        </div>
      )}
    </section>
  )
}
