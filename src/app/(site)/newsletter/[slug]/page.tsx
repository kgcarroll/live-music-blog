import {notFound} from 'next/navigation'
import type {Metadata} from 'next'

import {NewsletterIssueContent} from '@/components/NewsletterIssueContent'
import {absoluteSiteUrl} from '@/lib/siteUrl'
import {sanityFetch} from '@/sanity/lib/live'
import {NEWSLETTER_ISSUE_BY_SLUG, NEWSLETTER_ISSUE_SLUGS} from '@/sanity/lib/queries'

type Props = {params: Promise<{slug: string}>}

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: NEWSLETTER_ISSUE_SLUGS,
    perspective: 'published',
    stega: false,
  })
  return (data || []).map((row: {slug: string}) => ({slug: row.slug}))
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params
  const {data} = await sanityFetch({
    query: NEWSLETTER_ISSUE_BY_SLUG,
    params: {slug},
    stega: false,
  })
  if (!data) return {title: 'Not found'}

  const title = data.seoTitle?.trim() || data.title
  const description = data.seoDescription?.trim() || data.previewText?.trim() || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: absoluteSiteUrl(`/newsletter/${slug}`),
      type: 'article',
    },
  }
}

export default async function NewsletterIssuePage({params}: Props) {
  const {slug} = await params
  const {data} = await sanityFetch({
    query: NEWSLETTER_ISSUE_BY_SLUG,
    params: {slug},
  })
  if (!data) notFound()

  return (
    <NewsletterIssueContent
      title={data.title}
      publishedAt={data.publishedAt}
      coverImage={data.coverImage}
      body={data.body}
    />
  )
}
