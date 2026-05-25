'use client'

import Image from 'next/image'

import {usePhotoGalleryLightbox} from '@/components/PhotoGalleryLightbox'
import type {PhotoGalleryImage} from '@/lib/photoGalleryTypes'
import {urlForImage} from '@/sanity/lib/image'

export type {PhotoGalleryImage} from '@/lib/photoGalleryTypes'

function thumbSrc(img: PhotoGalleryImage) {
  return urlForImage(img as never).width(900).fit('max').url()
}

/** Column mosaic thumbnails; click opens lightbox (80vh, centered) with caption + prev/next. */
export function PhotoGalleryMosaic({images}: {images: PhotoGalleryImage[]}) {
  const items = images.filter((img) => img.asset?._id)
  const {setOpenIndex, lightboxPortal} = usePhotoGalleryLightbox(items)

  if (!items.length) return null

  return (
    <>
      <div className="columns-2 gap-x-3 sm:gap-x-4 md:columns-3 md:gap-x-5">
        {items.map((img, i) => {
          const dims = img.asset?.metadata?.dimensions
          const w = Math.min(dims?.width || 1200, 1200)
          const h = Math.min(dims?.height || 900, 900)
          const lqip = img.asset?.metadata?.lqip
          const src = thumbSrc(img)
          return (
            <div key={img._key ?? `gallery-${i}`} className="mb-3 break-inside-avoid sm:mb-4">
              <button
                type="button"
                className="group block w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 text-left shadow-sm outline-none ring-amber-400/40 transition hover:border-amber-500/40 focus-visible:ring-2"
                aria-label={img.alt ? `Open image: ${img.alt}` : `Open image ${i + 1} of ${items.length}`}
                onClick={() => setOpenIndex(i)}
              >
                <Image
                  src={src}
                  alt=""
                  width={w}
                  height={h}
                  sizes="(max-width: 767px) 45vw, 30vw"
                  className="h-auto w-full transition duration-300 group-hover:scale-[1.02]"
                  placeholder={lqip ? 'blur' : 'empty'}
                  blurDataURL={lqip || undefined}
                />
              </button>
            </div>
          )
        })}
      </div>
      {lightboxPortal}
    </>
  )
}
