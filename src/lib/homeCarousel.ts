import type {HomeFeaturedHero} from '@/lib/homeFeatured'

/** Minimum carousel size when filling from recent posts (fewer than four featured). */
export const HOME_CAROUSEL_SIZE = 3

function carouselItemKey(item: HomeFeaturedHero): string {
  return item.slug?.trim() || item._id
}

function dedupeSlides(items: HomeFeaturedHero[]): HomeFeaturedHero[] {
  const picked: HomeFeaturedHero[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const key = carouselItemKey(item)
    if (seen.has(key)) continue
    picked.push(item)
    seen.add(key)
  }
  return picked
}

export function buildHomeCarouselSlides(
  featured: HomeFeaturedHero[],
  recent: HomeFeaturedHero[],
): HomeFeaturedHero[] {
  const featuredWithSlug = featured.filter((item) => item.slug)

  if (featuredWithSlug.length > HOME_CAROUSEL_SIZE) {
    return dedupeSlides(featuredWithSlug)
  }

  const picked = dedupeSlides(featuredWithSlug)

  if (picked.length < HOME_CAROUSEL_SIZE) {
    for (const item of recent) {
      if (!item.slug) continue
      if (picked.length >= HOME_CAROUSEL_SIZE) break
      const key = carouselItemKey(item)
      if (picked.some((row) => carouselItemKey(row) === key)) continue
      picked.push(item)
    }
  }

  return picked
}
