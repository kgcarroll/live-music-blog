import type {HomeFeaturedHero} from '@/lib/homeFeatured'

/** Default carousel length when filling from recent posts (no or few featured). */
export const HOME_CAROUSEL_DEFAULT_SIZE = 3

/** @deprecated Use {@link HOME_CAROUSEL_DEFAULT_SIZE}. */
export const HOME_CAROUSEL_SIZE = HOME_CAROUSEL_DEFAULT_SIZE

function hasSlug(item: HomeFeaturedHero): boolean {
  return Boolean(item.slug?.trim())
}

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

/**
 * Homepage carousel slides (newest first within each group).
 *
 * - **0 featured:** up to {@link HOME_CAROUSEL_DEFAULT_SIZE} most recent posts with slugs.
 * - **1–3 featured:** those posts first, then recent posts until the carousel has
 *   {@link HOME_CAROUSEL_DEFAULT_SIZE} slides (skipping duplicates).
 * - **{@link HOME_CAROUSEL_DEFAULT_SIZE} or more featured:** every featured post with a slug
 *   (no cap, no backfill).
 */
export function buildHomeCarouselSlides(
  featured: HomeFeaturedHero[],
  recent: HomeFeaturedHero[],
): HomeFeaturedHero[] {
  const featuredWithSlug = featured.filter(hasSlug)
  const featuredDeduped = dedupeSlides(featuredWithSlug)

  if (featuredDeduped.length >= HOME_CAROUSEL_DEFAULT_SIZE) {
    return featuredDeduped
  }

  const picked = [...featuredDeduped]
  const seen = new Set(picked.map(carouselItemKey))

  for (const item of recent) {
    if (!hasSlug(item)) continue
    if (picked.length >= HOME_CAROUSEL_DEFAULT_SIZE) break
    const key = carouselItemKey(item)
    if (seen.has(key)) continue
    picked.push(item)
    seen.add(key)
  }

  return picked
}

export function homepageCarouselListTitle(
  slides: HomeFeaturedHero[],
  featured: HomeFeaturedHero[],
): string {
  const count = slides.length
  const featuredWithSlug = featured.filter(hasSlug).length

  if (featuredWithSlug >= HOME_CAROUSEL_DEFAULT_SIZE) {
    return count === 1
      ? 'Homepage Carousel (1 featured on site)'
      : `Homepage Carousel (${count} featured on site)`
  }

  return count === 1 ? 'Homepage Carousel (1 slide on site)' : `Homepage Carousel (${count} slides on site)`
}
