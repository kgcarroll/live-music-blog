import {defineField, defineType} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({name: 'siteTitle', type: 'string', initialValue: 'Live Music Blog'}),
    defineField({
      name: 'logo',
      title: 'Site logo',
      type: 'image',
      description:
        'Displayed in the site header (replaces the site title text). Use a wide logo with a transparent background; about 240–400px wide works well.',
      options: {hotspot: false},
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alt text',
          description: 'For screen readers. Defaults to the site title if empty.',
        }),
      ],
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      description:
        'Browser tab and social app icon. Upload a square PNG, ideally 512x512, with a simple mark.',
      options: {hotspot: false},
    }),
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
    defineField({
      name: 'contactPortable',
      type: 'array',
      title: 'Contact page intro',
      description: 'Shown above the contact form. Supports rich text like the About page.',
      of: [{type: 'block'}],
    }),
  ],
})
