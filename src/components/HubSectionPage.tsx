import type {TypedObject} from '@portabletext/types'
import {ArticleBody} from '@/components/ArticleBody'
import {ListingEditorialFeed} from '@/components/ListingEditorialFeed'
import type {EditorialCardItem} from '@/components/EditorialCard'

export function HubSectionPage({
  title,
  intro,
  fallbackIntro,
  sectionType,
  initialItems,
  initialHasMore,
  emptyMessage,
}: {
  title: string
  intro?: TypedObject[] | null
  fallbackIntro: string
  sectionType: string
  initialItems: EditorialCardItem[]
  initialHasMore: boolean
  emptyMessage: string
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-50">{title}</h1>
      {intro?.length ? (
        <div className="mt-6 max-w-2xl">
          <ArticleBody value={intro} />
        </div>
      ) : (
        <p className="mt-3 max-w-2xl text-zinc-400">{fallbackIntro}</p>
      )}
      <ListingEditorialFeed
        mode="section"
        sectionType={sectionType}
        initialItems={initialItems}
        initialHasMore={initialHasMore}
        emptyMessage={emptyMessage}
      />
    </div>
  )
}
