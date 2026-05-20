import {defineField, defineType} from 'sanity'
import {pageIntroField} from './blocks'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({name: 'siteTitle', type: 'string', title: 'Site Title', initialValue: 'Live Music Blog'}),
    defineField({
      name: 'logo',
      title: 'Site Logo',
      type: 'image',
      description:
        'Displayed in the site header (replaces the site title text). Use a wide logo with a transparent background; about 240–400px wide works well.',
      options: {hotspot: false},
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
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
    defineField({name: 'aboutPortable', type: 'array', title: 'About Page Body', of: [{type: 'block'}]}),
    defineField({
      name: 'contactPortable',
      type: 'array',
      title: 'Contact Page Intro',
      description: 'Shown above the contact form. Supports rich text like the About page.',
      of: [{type: 'block'}],
    }),
    pageIntroField(
      'interviewsHubPortable',
      'Interviews Page Intro',
      'Intro text above the article grid on /interviews.',
    ),
    pageIntroField('newsHubPortable', 'News Page Intro', 'Intro text above the article grid on /news.'),
    pageIntroField(
      'photosHubPortable',
      'Photos Page Intro',
      'Intro text above the article grid on /photos.',
    ),
    pageIntroField(
      'reviewsHubPortable',
      'Reviews Page Intro',
      'Intro text above the article grid on /reviews.',
    ),
  ],
})
