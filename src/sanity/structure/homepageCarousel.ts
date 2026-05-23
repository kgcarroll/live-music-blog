import type {StructureBuilder} from 'sanity/structure'

import {HomepageCarouselDesk} from '@/sanity/components/HomepageCarouselDesk'

export function homepageCarouselList(S: StructureBuilder) {
  return S.component()
    .id('homepage-carousel-desk')
    .title('Homepage Carousel')
    .component(HomepageCarouselDesk)
}
