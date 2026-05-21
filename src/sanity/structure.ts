import {CogIcon, StarIcon} from '@sanity/icons'
import type {StructureResolver} from 'sanity/structure'

import {EDITORIAL_DOCUMENT_TYPES, SITE_SETTINGS_DOCUMENT_ID} from './constants'

const EDITORIAL_CAROUSEL_FILTER = `_type in [${EDITORIAL_DOCUMENT_TYPES.map((type) => `"${type}"`).join(',')}] && defined(slug.current)`

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site Settings')
        .id(SITE_SETTINGS_DOCUMENT_ID)
        .icon(CogIcon)
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId(SITE_SETTINGS_DOCUMENT_ID)
            .title('Site Settings'),
        ),
      S.listItem()
        .title('Homepage Carousel')
        .id('homepage-carousel')
        .icon(StarIcon)
        .child(
          S.documentList()
            .id('homepage-carousel-list')
            .title('Homepage Carousel')
            .filter(EDITORIAL_CAROUSEL_FILTER)
            .defaultOrdering([
              {field: 'featured', direction: 'desc'},
              {field: 'publishedAt', direction: 'desc'},
            ]),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => item.getId() !== 'siteSettings'),
    ])
