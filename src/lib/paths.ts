export type EditorialType = 'interview' | 'news' | 'photoPost' | 'review'

/** Display label for editorial document `_type` (cards, meta lines). Always uppercase. */
export function editorialTypeLabel(type: string): string {
  switch (type) {
    case 'interview':
      return 'INTERVIEW'
    case 'news':
      return 'NEWS'
    case 'photoPost':
      return 'PHOTOS'
    case 'review':
      return 'REVIEW'
    default:
      return type.toUpperCase()
  }
}

export function editorialHref(type: EditorialType | string, slug: string) {
  switch (type) {
    case 'interview':
      return `/interviews/${slug}`
    case 'news':
      return `/news/${slug}`
    case 'photoPost':
      return `/photos/${slug}`
    case 'review':
      return `/reviews/${slug}`
    default:
      return '/'
  }
}

export function authorHref(slug: string) {
  return `/authors/${slug}`
}

export function tagHref(slug: string) {
  return `/tags/${slug}`
}

const ARTICLE_PATH = /^\/(interviews|news|photos|reviews)\/[^/]+$/

/** True for individual editorial article URLs (not section hubs). */
export function isArticlePath(pathname: string) {
  return ARTICLE_PATH.test(pathname)
}

export function venueHref(venueSlug: string) {
  return `/venues/${encodeURIComponent(venueSlug)}`
}
