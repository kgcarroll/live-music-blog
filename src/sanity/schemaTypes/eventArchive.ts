import {CalendarIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

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
    defineField({name: 'ticketmasterUrl', type: 'url', title: 'Ticketmaster URL'}),
    defineField({name: 'imageUrl', type: 'url', title: 'Image URL'}),
    defineField({name: 'lastSeenAt', type: 'datetime', title: 'Last seen in feed'}),
  ],
})
