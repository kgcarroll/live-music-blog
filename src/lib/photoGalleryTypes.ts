export type PhotoGalleryImage = {
  _key?: string
  alt?: string | null
  caption?: string | null
  asset?: {
    _id?: string
    metadata?: {
      lqip?: string | null
      dimensions?: {width?: number; height?: number}
    } | null
  } | null
}
