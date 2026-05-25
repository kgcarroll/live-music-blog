'use client'

import {PhotoGalleryCarousel} from '@/components/PhotoGalleryCarousel'
import {PhotoGalleryMosaic} from '@/components/PhotoGalleryMosaic'
import type {PhotoGalleryImage} from '@/lib/photoGalleryTypes'
import {normalizeGalleryImages, type PhotoGalleryLayout} from '@/lib/portableTextGallery'

/** Inline body gallery — stays within the article column width. */
export function PhotoGalleryInline({
  layout,
  images,
}: {
  layout?: PhotoGalleryLayout | string | null
  images?: PhotoGalleryImage[] | null
}) {
  const items = normalizeGalleryImages(images)
  if (!items.length) return null

  const isCarousel = layout === 'carousel'

  return (
    <div className="not-prose my-8 w-full">
      {isCarousel ? <PhotoGalleryCarousel images={items} /> : <PhotoGalleryMosaic images={items} />}
    </div>
  )
}
