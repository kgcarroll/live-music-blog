import {defineField, defineType} from 'sanity'

/** OpenAI-curated Spotify embed plan for a Ticketmaster event (filled on feed sync). */
export const eventSpotifyCuration = defineType({
  name: 'eventSpotifyCuration',
  title: 'Event Spotify curation',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({
      name: 'eventId',
      type: 'string',
      title: 'Ticketmaster event ID',
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'eventName', type: 'string', title: 'Event name'}),
    defineField({
      name: 'curationVersion',
      type: 'number',
      title: 'Curation version',
    }),
    defineField({name: 'curatedAt', type: 'datetime', title: 'Curated at'}),
    defineField({
      name: 'artists',
      type: 'array',
      title: 'Lineup curation',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'ticketmasterAttractionId',
              type: 'string',
              title: 'Attraction ID',
            }),
            defineField({name: 'attractionName', type: 'string', title: 'Attraction name'}),
            defineField({name: 'displayOrder', type: 'number', title: 'Display order'}),
            defineField({name: 'includeEmbed', type: 'boolean', title: 'Include embed'}),
            defineField({
              name: 'spotifySearchQuery',
              type: 'string',
              title: 'Spotify search query',
            }),
            defineField({name: 'skipReason', type: 'string', title: 'Skip reason'}),
          ],
        },
      ],
    }),
  ],
})
