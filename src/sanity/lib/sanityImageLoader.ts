/**
 * Next.js custom image loader for Sanity CDN URLs.
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/images#loaderfile
 */
export default function sanityImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  if (!src.includes('cdn.sanity.io')) {
    return src
  }
  try {
    const url = new URL(src)
    url.searchParams.set('w', String(width))
    url.searchParams.set('q', String(quality ?? 75))
    url.searchParams.set('auto', 'format')
    return url.toString()
  } catch {
    return src
  }
}
