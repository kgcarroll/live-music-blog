import {defineField, defineType} from 'sanity'

/** Cached Ticketmaster attraction → Spotify artist (filled on feed sync). */
export const spotifyArtistMatch = defineType({
  name: 'spotifyArtistMatch',
  title: 'Spotify artist match',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({
      name: 'ticketmasterAttractionId',
      type: 'string',
      title: 'Ticketmaster attraction ID',
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'attractionName', type: 'string', title: 'Attraction name'}),
    defineField({name: 'spotifyArtistId', type: 'string', title: 'Spotify artist ID'}),
    defineField({name: 'spotifyArtistUrl', type: 'url', title: 'Spotify artist URL'}),
    defineField({name: 'spotifySearchQuery', type: 'string', title: 'Spotify search query'}),
    defineField({
      name: 'matchStatus',
      type: 'string',
      title: 'Match status',
      options: {
        list: [
          {title: 'Matched', value: 'matched'},
          {title: 'Ambiguous', value: 'ambiguous'},
          {title: 'Not found', value: 'not_found'},
        ],
      },
    }),
    defineField({name: 'curationVersion', type: 'number', title: 'Curation version'}),
    defineField({name: 'resolvedAt', type: 'datetime', title: 'Resolved at'}),
  ],
})
