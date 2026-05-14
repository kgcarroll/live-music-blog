export type EditorialType = 'interview' | 'photoPost' | 'review'

/** Display label for editorial document `_type` (cards, meta lines). Always uppercase. */
export function editorialTypeLabel(type: string): string {
  switch (type) {
    case 'interview':
      return 'INTERVIEW'
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
