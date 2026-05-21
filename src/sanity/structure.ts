import {CogIcon, StarIcon} from '@sanity/icons'
import type {StructureResolver} from 'sanity/structure'

import {
  SITE_SETTINGS_DOCUMENT_ID,
  STRUCTURE_HIDDEN_DOCUMENT_TYPES,
} from './constants'
import {homepageCarouselList} from './structure/homepageCarousel'

const hiddenStructureTypes = new Set<string>(STRUCTURE_HIDDEN_DOCUMENT_TYPES)

export const structure: StructureResolver = (S, context) =>
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
        .child(() => homepageCarouselList(S, context)),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => !hiddenStructureTypes.has(item.getId() ?? '')),
    ])
