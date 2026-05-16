import {defineQuery} from 'next-sanity'

const imageProjection = `coverImage{
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

const galleryImagesProjection = `gallery[]{
  _key,
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

const authorEmbed = `author->{
  name,
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
  subhead,
  galleryNote,
  verdict,
  youtubeUrl,
  ${galleryImagesProjection},
  ${imageProjection},
  seoTitle,
  seoDescription,
  body[]{
    ...,
    _type == "image" => {
      ...,
      asset->{
        _id,
        url,
        metadata {
          lqip,
          dimensions { width, height, aspectRatio }
        }
      }
    }
  },
  "relatedArticles": *[
    _type in ["interview","news","photoPost","review"] &&
    _id != ^._id &&
    defined(slug.current) &&
    count(^.tags[]._ref) > 0 &&
    references(^.tags[]._ref)
  ] | order(publishedAt desc)[0...3] {
    ${editorialCardListFields}
  }
}`

export const HOME_EDITORIAL_PAGE = defineQuery(`
  *[_type in ["interview","news","photoPost","review"] && defined(slug.current)] | order(publishedAt desc)[$start...$end] {
    ${editorialCardListFields}
  }
`)

export const SECTION_LIST = defineQuery(`
  *[_type == $type && defined(slug.current)] | order(publishedAt desc) {
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
    "slug": slug.current
  }
`)

export const POSTS_BY_AUTHOR_SLUG = defineQuery(`
  *[_type in ["interview","news","photoPost","review"] && author->slug.current == $slug && defined(slug.current)]
  | order(publishedAt desc) {
    ${editorialCardListFields}
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
    _type in ["interview","news","photoPost","review"] &&
    defined(slug.current) &&
    $tagId in tags[]._ref
  ] | order(publishedAt desc) {
    ${editorialCardListFields}
  }
`)

const settingsImageProjection = `{
  alt,
  asset->{
    _id,
    url,
    metadata {
      lqip,
      dimensions { width, height, aspectRatio }
    }
  }
}`

export const SITE_SETTINGS = defineQuery(`
  *[_type == "siteSettings"] | order(_updatedAt desc)[0]{
    siteTitle,
    logo ${settingsImageProjection},
    instagramUrl,
    spotifyUrl,
    aboutPortable,
    contactPortable
  }
`)
