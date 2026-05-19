import type {TypedObject} from '@portabletext/types'

export type ImageTextRowLayout = 'left' | 'right'

/** Odd/even order of imageTextRow blocks in body → alternating image side. */
export function buildImageTextRowLayoutMap(blocks: TypedObject[] | null | undefined) {
  const map = new Map<string, ImageTextRowLayout>()
  let imageTextIndex = 0

  for (const block of blocks ?? []) {
    if (!block || typeof block !== 'object' || !('_type' in block) || block._type !== 'imageTextRow') continue

    const key =
      '_key' in block && typeof block._key === 'string' ? block._key : `image-text-row-${imageTextIndex}`
    map.set(key, imageTextIndex % 2 === 0 ? 'left' : 'right')
    imageTextIndex += 1
  }

  return map
}
