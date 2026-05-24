import type {StructureBuilder} from 'sanity/structure'

import {TicketmasterFeedDesk} from '@/sanity/components/TicketmasterFeedDesk'

export function ticketmasterFeedList(S: StructureBuilder) {
  return S.component()
    .id('ticketmaster-feed-desk')
    .title('Ticketmaster Feed')
    .component(TicketmasterFeedDesk)
}
