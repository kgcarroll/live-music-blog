import {defineQuery} from 'next-sanity'

import {SITE_SETTINGS_DOCUMENT_ID} from '@/sanity/constants'

const sanityImageProjection = (field: string) => `${field}{
  ...,
  asset->{
    _id,
    url,
    metadata {
      lqip,
      dimensions { width, height, aspectRatio }
    }
  }
}`

const imageProjection = sanityImageProjection('coverImage')
const featureImageProjection = sanityImageProjection('featureImage')

const authorEmbed = `author->{
  name,
  bio,
  "slug": slug.current
}`

const tagsProjection = `tags[]->{
  _id,
  title,
  "slug": slug.current
}`

const editorialCardListFields = `
  _type,
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  ${authorEmbed},
  ${imageProjection}
`

const editorialProjection = `{
  _id,
  _type,
  title,
  "slug": slug.current,
  publishedAt,
  excerpt,
  ${authorEmbed},
  ${tagsProjection},
  featured,
  verdict,
  showDate,
  venueName,
  ${imageProjection},
  seoTitle,
  seoDescription,
  body[]{
    ...,
    _type == "image" => {
      ...,
      layout,
      alt,
      caption,
      asset->{
        _id,
        url,
        metadata {
          lqip,
          dimensions { width, height, aspectRatio }
        }
      }
    },
    _type == "imageTextRow" => {
      ...,
      image {
        ...,
        asset->{
          _id,
          url,
          metadata {
            lqip,
            dimensions { width, height, aspectRatio }
          }
        }
      },
      text[]{ ... }
    },
    _type == "photoGallery" => {
      layout,
      images[]{
        _key,
        alt,
        caption,
        hotspot,
        crop,
        asset->{
          _id,
          url,
          metadata {
            lqip,
            dimensions { width, height, aspectRatio }
          }
        }
      }
    }
  },
  "relatedArticles": *[
    _type in ["interview","news","review"] &&
    _id != ^._id &&
    defined(slug.current) &&
    count(^.tags[]._ref) > 0 &&
    references(^.tags[]._ref)
  ] | order(publishedAt desc)[0...3] {
    ${editorialCardListFields}
  }
}`

const editorialTypesFilter = `_type in ["interview","news","review"] && defined(slug.current)`

const homeHeroFields = `
  ${editorialCardListFields},
  excerpt,
  verdict,
  featured,
  ${featureImageProjection}
`

/** Featured editorial for homepage carousel (newest first). */
export const HOME_FEATURED_SLIDES = defineQuery(`
  *[${editorialTypesFilter} && featured == true] | order(publishedAt desc) {
    ${homeHeroFields}
  }
`)

/** Recent editorial used to backfill the carousel when there are fewer than three featured slides. */
export const HOME_CAROUSEL_BACKFILL = defineQuery(`
  *[${editorialTypesFilter}] | order(publishedAt desc)[0...12] {
    ${homeHeroFields}
  }
`)

/** Home grid: excludes carousel slides and all featured posts (hero-only). */
export const HOME_EDITORIAL_PAGE = defineQuery(`
  *[
    ${editorialTypesFilter} &&
    (featured != true) &&
    !(_id in $excludeIds)
  ] | order(publishedAt desc)[$start...$end] {
    ${editorialCardListFields}
  }
`)

/** @deprecated Prefer SECTION_EDITORIAL_PAGE for paginated hub grids. */
export const SECTION_LIST = defineQuery(`
  *[_type == $type && defined(slug.current)] | order(publishedAt desc) {
    ${editorialCardListFields}
  }
`)

export const SECTION_EDITORIAL_PAGE = defineQuery(`
  *[_type == $type && defined(slug.current)] | order(publishedAt desc)[$start...$end] {
    ${editorialCardListFields}
  }
`)

export const EDITORIAL_BY_SLUG = defineQuery(`
  *[_type == $type && slug.current == $slug][0] ${editorialProjection}
`)

export const EDITORIAL_SLUGS = defineQuery(`
  *[_type == $type && defined(slug.current)]{
    "slug": slug.current
  }
`)

export const AUTHOR_BY_SLUG = defineQuery(`
  *[_type == "author" && slug.current == $slug][0]{
    _id,
    name,
    bio,
    "slug": slug.current
  }
`)

export const AUTHOR_SLUGS = defineQuery(`
  *[_type == "author" && defined(slug.current)]{
    "slug": slug.current
  }
`)

export const ALL_AUTHORS = defineQuery(`
  *[_type == "author" && defined(slug.current)] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    "count": count(*[
      _type in ["interview","news","review"] &&
      defined(slug.current) &&
      author._ref == ^._id
    ])
  }
`)

export const POSTS_BY_AUTHOR_SLUG = defineQuery(`
  *[_type in ["interview","news","review"] && author->slug.current == $slug && defined(slug.current)]
  | order(publishedAt desc) [$start...$end] {
    ${editorialCardListFields}
  }
`)

export const ALL_TAGS = defineQuery(`
  *[_type == "tag" && defined(slug.current)] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    "count": count(*[
      _type in ["interview","news","review"] &&
      defined(slug.current) &&
      ^._id in tags[]._ref
    ])
  }
`)

export const TAG_BY_SLUG = defineQuery(`
  *[_type == "tag" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    description
  }
`)

export const TAG_SLUGS = defineQuery(`
  *[_type == "tag" && defined(slug.current)]{
    "slug": slug.current
  }
`)

export const POSTS_BY_TAG_ID = defineQuery(`
  *[
    _type in ["interview","news","review"] &&
    defined(slug.current) &&
    $tagId in tags[]._ref
  ] | order(publishedAt desc) {
    ${editorialCardListFields}
  }
`)

export const POSTS_BY_TAG_ID_PAGE = defineQuery(`
  *[
    _type in ["interview","news","review"] &&
    defined(slug.current) &&
    $tagId in tags[]._ref
  ] | order(publishedAt desc) [$start...$end] {
    ${editorialCardListFields}
  }
`)

const settingsImageProjection = `{
  alt,
  hotspot,
  crop,
  asset->{
    _id,
    url,
    metadata {
      lqip,
      dimensions { width, height, aspectRatio }
    }
  }
}`

const newsletterBodyProjection = `body[]{
  ...,
  _type == "image" => {
    ...,
    alt,
    caption,
    layout,
    asset->{
      _id,
      url,
      metadata { dimensions { width, height, aspectRatio } }
    }
  }
}`

const newsletterIssueProjection = `{
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  emailSubject,
  previewText,
  sentAt,
  resendBroadcastId,
  seoTitle,
  seoDescription,
  ${sanityImageProjection('coverImage')},
  ${newsletterBodyProjection}
}`

export const NEWSLETTER_ISSUE_SLUGS = defineQuery(`
  *[_type == "newsletterIssue" && defined(slug.current)] | order(publishedAt desc) {
    "slug": slug.current
  }
`)

export const NEWSLETTER_ISSUE_LIST = defineQuery(`
  *[_type == "newsletterIssue" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    previewText,
    excerpt,
    sentAt,
    ${sanityImageProjection('coverImage')}
  }
`)

export const NEWSLETTER_ISSUE_BY_SLUG = defineQuery(`
  *[_type == "newsletterIssue" && slug.current == $slug][0] ${newsletterIssueProjection}
`)

export const NEWSLETTER_ISSUE_BY_ID = defineQuery(`
  *[_type == "newsletterIssue" && _id == $id][0] ${newsletterIssueProjection}
`)

/** All public URLs for sitemap.xml (published perspective only). */
export const SITEMAP_ENTRIES = defineQuery(`{
  "editorial": *[_type in ["interview","news","review"] && defined(slug.current)]{
    _type,
    "slug": slug.current,
    "lastModified": coalesce(_updatedAt, publishedAt)
  },
  "authors": *[_type == "author" && defined(slug.current)]{
    "slug": slug.current,
    "lastModified": _updatedAt
  },
  "tags": *[_type == "tag" && defined(slug.current)]{
    "slug": slug.current,
    "lastModified": _updatedAt
  },
  "newsletters": *[_type == "newsletterIssue" && defined(slug.current)]{
    "slug": slug.current,
    "lastModified": coalesce(sentAt, publishedAt, _updatedAt)
  }
}`)

export const SITE_SETTINGS = defineQuery(`
  coalesce(
    *[_type == "siteSettings" && _id == "${SITE_SETTINGS_DOCUMENT_ID}"][0],
    *[_type == "siteSettings"] | order(_updatedAt desc)[0]
  ){
    siteTitle,
    logo ${settingsImageProjection},
    favicon ${settingsImageProjection},
    homepageOgImage ${settingsImageProjection},
    venuesMapEnabled,
    homepageCarouselEventSlug,
    homepageCarouselSlideOrder,
    instagramUrl,
    facebookUrl,
    spotifyUrl,
    aboutPortable,
    contactPortable,
    interviewsHubPortable,
    newsHubPortable,
    reviewsHubPortable,
    authorsHubPortable,
    tagsHubPortable,
    scheduleHubPortable,
    venuesHubPortable
  }
`)
