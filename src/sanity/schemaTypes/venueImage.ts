import {defineField, defineType} from 'sanity'

/** Cached Ticketmaster venue → Google Places photo (filled on feed sync). */
export const venueImage = defineType({
  name: 'venueImage',
  title: 'Venue image',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({
      name: 'ticketmasterVenueId',
      type: 'string',
      title: 'Ticketmaster venue ID',
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'venueSlug', type: 'string', title: 'Venue slug'}),
    defineField({name: 'venueName', type: 'string', title: 'Venue name'}),
    defineField({name: 'imageUrl', type: 'url', title: 'Image URL'}),
    defineField({
      name: 'imageSource',
      type: 'string',
      title: 'Image source',
      options: {
        list: [
          {title: 'Google Places', value: 'google_places'},
          {title: 'Ticketmaster', value: 'ticketmaster'},
        ],
      },
    }),
    defineField({name: 'googlePlaceId', type: 'string', title: 'Google place ID'}),
    defineField({name: 'photoAttribution', type: 'string', title: 'Photo attribution'}),
    defineField({name: 'matchScore', type: 'number', title: 'Match score'}),
    defineField({
      name: 'matchStatus',
      type: 'string',
      title: 'Match status',
      options: {
        list: [
          {title: 'Matched', value: 'matched'},
          {title: 'Not found', value: 'not_found'},
        ],
      },
    }),
    defineField({name: 'imageVersion', type: 'number', title: 'Image version'}),
    defineField({name: 'resolvedAt', type: 'datetime', title: 'Resolved at'}),
  ],
})
