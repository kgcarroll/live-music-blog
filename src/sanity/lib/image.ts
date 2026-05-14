import createImageUrlBuilder from '@sanity/image-url'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'missing-project-id'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

const builder = createImageUrlBuilder({projectId, dataset})

export function urlForImage(source: Parameters<typeof builder.image>[0]) {
  return builder.image(source).auto('format')
}
