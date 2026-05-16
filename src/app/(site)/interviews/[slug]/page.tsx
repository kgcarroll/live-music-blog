import {notFound} from 'next/navigation'
import type {Metadata} from 'next'
import {EditorialArticleContent} from '@/components/EditorialArticleContent'
import {buildEditorialMetadata} from '@/lib/editorialMetadata'
import {sanityFetch} from '@/sanity/lib/live'
import {EDITORIAL_BY_SLUG, EDITORIAL_SLUGS} from '@/sanity/lib/queries'

const TYPE = 'interview' as const

type Props = {params: Promise<{slug: string}>}

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: EDITORIAL_SLUGS,
    params: {type: TYPE},
    perspective: 'published',
    stega: false,
  })
  return (data || []).map((row: {slug: string}) => ({slug: row.slug}))
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const {data} = await sanityFetch({
    query: EDITORIAL_BY_SLUG,
    params: {type: TYPE, slug},
    stega: false,
  })
  if (!data) return {title: 'Not found'}
  return buildEditorialMetadata(data, 'Interview')
}

export default async function InterviewArticlePage({params}: Props) {
  const {slug} = await params
  const {data} = await sanityFetch({
    query: EDITORIAL_BY_SLUG,
    params: {type: TYPE, slug},
  })
  if (!data) notFound()
  return <EditorialArticleContent doc={data} />
}
