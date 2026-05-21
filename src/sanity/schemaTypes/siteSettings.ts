import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {pageIntroField} from './blocks'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'site', title: 'Site', default: true},
    {name: 'social', title: 'Social'},
    {name: 'pages', title: 'About & Contact'},
    {name: 'hubs', title: 'Section Hubs'},
  ],
  fields: [
    defineField({
      name: 'siteTitle',
      type: 'string',
      title: 'Site Title',
      group: 'site',
      initialValue: 'Live Music Blog',
    }),
    defineField({
      name: 'logo',
      title: 'Site Logo',
      type: 'image',
      group: 'site',
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
      group: 'site',
      description:
        'Browser tab and social app icon. Upload a square PNG, ideally 512x512, with a simple mark.',
      options: {hotspot: false},
    }),
    defineField({
      name: 'instagramUrl',
      type: 'url',
      title: 'Instagram URL',
      group: 'social',
      description: 'Profile link, e.g. https://www.instagram.com/yourhandle/',
    }),
    defineField({
      name: 'spotifyUrl',
      type: 'url',
      title: 'Spotify URL',
      group: 'social',
      description: 'Artist or profile link from open.spotify.com',
    }),
    defineField({
      name: 'aboutPortable',
      type: 'array',
      title: 'About Page Body',
      group: 'pages',
      of: [{type: 'block'}],
    }),
    defineField({
      name: 'contactPortable',
      type: 'array',
      title: 'Contact Page Intro',
      group: 'pages',
      description: 'Shown above the contact form. Supports rich text like the About page.',
      of: [{type: 'block'}],
    }),
    pageIntroField(
      'interviewsHubPortable',
      'Interviews Page Intro',
      'Intro above the grid on /interviews. Also used for SEO description when set.',
      {group: 'hubs'},
    ),
    pageIntroField(
      'newsHubPortable',
      'News Page Intro',
      'Intro above the grid on /news. Also used for SEO description when set.',
      {group: 'hubs'},
    ),
    pageIntroField(
      'photosHubPortable',
      'Photos Page Intro',
      'Intro above the grid on /photos. Also used for SEO description when set.',
      {group: 'hubs'},
    ),
    pageIntroField(
      'reviewsHubPortable',
      'Reviews Page Intro',
      'Intro above the grid on /reviews. Also used for SEO description when set.',
      {group: 'hubs'},
    ),
  ],
})
