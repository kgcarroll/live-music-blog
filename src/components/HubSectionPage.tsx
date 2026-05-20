import type {TypedObject} from '@portabletext/types'
import {ArticleBody} from '@/components/ArticleBody'
import {EditorialCard, type EditorialCardItem} from '@/components/EditorialCard'

export function HubSectionPage({
  title,
  intro,
  fallbackIntro,
  items,
  emptyMessage,
}: {
  title: string
  intro?: TypedObject[] | null
  fallbackIntro: string
  items: EditorialCardItem[]
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
      <div className="mt-10 grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <EditorialCard key={item._id} item={item} />
        ))}
      </div>
      {!items.length ? <p className="mt-8 text-sm text-zinc-500">{emptyMessage}</p> : null}
    </div>
  )
}
