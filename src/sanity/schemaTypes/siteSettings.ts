import {defineField, defineType} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({name: 'siteTitle', type: 'string', initialValue: 'Live Music Blog'}),
    defineField({
      name: 'instagramUrl',
      type: 'url',
      title: 'Instagram URL',
      description: 'Profile link, e.g. https://www.instagram.com/yourhandle/',
    }),
    defineField({
      name: 'spotifyUrl',
      type: 'url',
      title: 'Spotify URL',
      description: 'Artist or profile link from open.spotify.com',
    }),
    defineField({name: 'aboutPortable', type: 'array', title: 'About page body', of: [{type: 'block'}]}),
    defineField({name: 'contactIntro', type: 'text', rows: 3}),
  ],
})
