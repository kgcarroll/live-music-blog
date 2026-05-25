import type {PhotoGalleryImage} from '@/lib/photoGalleryTypes'

export type PhotoGalleryLayout = 'mosaic' | 'carousel'

export type PhotoGalleryBlockValue = {
  layout?: PhotoGalleryLayout | string | null
  images?: PhotoGalleryImage[] | null
}

export function normalizeGalleryImages(images: PhotoGalleryImage[] | null | undefined): PhotoGalleryImage[] {
  return (images ?? []).filter((img) => img.asset?._id)
}

/** All gallery images in document order from inline photoGallery blocks (for SEO). */
export function galleryImagesFromPortableBody(body: unknown): PhotoGalleryImage[] {
  if (!Array.isArray(body)) return []

  const out: PhotoGalleryImage[] = []
  for (const block of body) {
    if (block == null || typeof block !== 'object' || !('_type' in block)) continue
    if ((block as {_type?: string})._type !== 'photoGallery') continue
    out.push(...normalizeGalleryImages((block as PhotoGalleryBlockValue).images))
  }
  return out
}
