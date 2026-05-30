import {CalendarIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

const archivedAttractionFields = [
  defineField({name: 'id', type: 'string', title: 'Attraction ID'}),
  defineField({name: 'name', type: 'string', title: 'Name'}),
  defineField({name: 'url', type: 'url', title: 'URL'}),
]

const archivedPresaleFields = [
  defineField({name: 'name', type: 'string', title: 'Name'}),
  defineField({name: 'startDateTime', type: 'datetime', title: 'Start'}),
  defineField({name: 'endDateTime', type: 'datetime', title: 'End'}),
]

/** System-maintained snapshot of Ticketmaster events while they appear in the feed. */
export const eventArchive = defineType({
  name: 'eventArchive',
  title: 'Event archive',
  type: 'document',
  icon: CalendarIcon,
  readOnly: true,
  fields: [
    defineField({
      name: 'slug',
      type: 'string',
      title: 'URL slug',
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'eventId', type: 'string', title: 'Ticketmaster event ID'}),
    defineField({name: 'name', type: 'string', title: 'Event name'}),
    defineField({name: 'venueId', type: 'string', title: 'Venue ID'}),
    defineField({name: 'venueName', type: 'string', title: 'Venue name'}),
    defineField({name: 'venueSlug', type: 'string', title: 'Venue URL slug'}),
    defineField({name: 'venueCity', type: 'string', title: 'Venue city'}),
    defineField({name: 'venueState', type: 'string', title: 'Venue state'}),
    defineField({name: 'startDateTime', type: 'datetime', title: 'Start (UTC)'}),
    defineField({name: 'localDate', type: 'string', title: 'Local date'}),
    defineField({name: 'localTime', type: 'string', title: 'Local time'}),
    defineField({name: 'timezone', type: 'string', title: 'Timezone'}),
    defineField({name: 'ticketmasterUrl', type: 'url', title: 'Ticketmaster URL'}),
    defineField({name: 'imageUrl', type: 'url', title: 'Image URL'}),
    defineField({name: 'imageWidth', type: 'number', title: 'Image width'}),
    defineField({name: 'imageHeight', type: 'number', title: 'Image height'}),
    defineField({name: 'lastSeenAt', type: 'datetime', title: 'Last seen in feed'}),
    defineField({
      name: 'attractions',
      type: 'array',
      title: 'Lineup',
      of: [{type: 'object', fields: archivedAttractionFields}],
    }),
    defineField({name: 'info', type: 'text', title: 'About'}),
    defineField({name: 'pleaseNote', type: 'text', title: 'Please note'}),
    defineField({name: 'description', type: 'text', title: 'Description'}),
    defineField({
      name: 'genreLabels',
      type: 'array',
      title: 'Genres',
      of: [{type: 'string'}],
    }),
    defineField({name: 'eventTypeLabel', type: 'string', title: 'Event type'}),
    defineField({name: 'priceSummary', type: 'string', title: 'Price summary'}),
    defineField({name: 'statusLabel', type: 'string', title: 'Status'}),
    defineField({
      name: 'promoterNames',
      type: 'array',
      title: 'Promoters',
      of: [{type: 'string'}],
    }),
    defineField({name: 'accessibilityInfo', type: 'text', title: 'Accessibility'}),
    defineField({name: 'ticketLimitInfo', type: 'text', title: 'Ticket limit'}),
    defineField({name: 'venueAddress', type: 'string', title: 'Venue address'}),
    defineField({name: 'venueUrl', type: 'url', title: 'Venue URL'}),
    defineField({name: 'salesPublicStart', type: 'datetime', title: 'Public sale start'}),
    defineField({name: 'salesPublicEnd', type: 'datetime', title: 'Public sale end'}),
    defineField({
      name: 'presales',
      type: 'array',
      title: 'Presales',
      of: [{type: 'object', fields: archivedPresaleFields}],
    }),
  ],
})
