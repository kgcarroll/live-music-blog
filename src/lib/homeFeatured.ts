import type {EditorialCardItem} from '@/components/EditorialCard'

/** Editorial types that support homepage featuring. */
export const EDITORIAL_TYPES = ['interview', 'news', 'photoPost', 'review'] as const

export type HomeFeaturedHero = EditorialCardItem & {
  excerpt?: string | null
  verdict?: string | null
  featured?: boolean | null
  featureImage?: EditorialCardItem['coverImage'] | null
}
