import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {PinnedCarouselEventInput} from '@/sanity/components/PinnedCarouselEventInput'
import {pageIntroField} from './blocks'

const ticketmasterFeedStatusFields = [
  defineField({
    name: 'lastAttemptAt',
    type: 'datetime',
    title: 'Last attempt',
    readOnly: true,
  }),
  defineField({
    name: 'lastSuccessAt',
    type: 'datetime',
    title: 'Last success',
    readOnly: true,
  }),
  defineField({
    name: 'lastError',
    type: 'string',
    title: 'Last error',
    readOnly: true,
    options: {
      list: [
        {title: 'Rate limited (429)', value: 'rate_limit'},
        {title: 'API error', value: 'api_error'},
        {title: 'Not configured', value: 'not_configured'},
      ],
    },
  }),
  defineField({
    name: 'lastHttpStatus',
    type: 'number',
    title: 'Last HTTP status',
    readOnly: true,
  }),
  defineField({
    name: 'eventCount',
    type: 'number',
    title: 'Events in feed',
    readOnly: true,
  }),
  defineField({
    name: 'venueCount',
    type: 'number',
    title: 'Venues in feed',
    readOnly: true,
  }),
  defineField({
    name: 'pagesFetched',
    type: 'number',
    title: 'API pages fetched',
    readOnly: true,
  }),
  defineField({
    name: 'apiKeyFingerprint',
    type: 'string',
    title: 'API key fingerprint',
    readOnly: true,
  }),
  defineField({
    name: 'dmaId',
    type: 'string',
    title: 'DMA id',
    readOnly: true,
  }),
]

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'site', title: 'Site', default: true},
    {name: 'newsletter', title: 'Newsletter'},
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
      name: 'homepageOgImage',
      title: 'Homepage Social Share Image',
      type: 'image',
      group: 'site',
      description:
        'Open Graph / Twitter preview for the homepage (Facebook, iMessage, Slack, etc.). Use 1200×630 or larger with a 1.91:1 crop. Set the hotspot to frame the subject. If empty, the site logo is used.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
          description: 'Describes the image for accessibility and social previews.',
        }),
      ],
    }),
    defineField({
      name: 'venuesMapEnabled',
      type: 'boolean',
      title: 'Venues map enabled',
      group: 'site',
      description:
        'When off, /venues shows the venue list only and does not load Mapbox (saves map tile loads).',
      initialValue: true,
    }),
    defineField({
      name: 'homepageCarouselSlideOrder',
      type: 'array',
      title: 'Homepage Carousel Slide Order',
      group: 'site',
      hidden: true,
      of: [{type: 'string'}],
      description: 'Managed from the Homepage Carousel desk. Publish Site Settings to apply.',
    }),
    defineField({
      name: 'homepageCarouselEventSlug',
      type: 'string',
      title: 'Pinned Homepage Concert Slide',
      group: 'site',
      components: {
        input: PinnedCarouselEventInput,
      },
      description:
        'Choose an upcoming concert with a Ticketmaster image, or leave unset for a random show each day. Publish Site Settings to apply.',
    }),
    defineField({
      name: 'ticketmasterFeedStatus',
      type: 'object',
      title: 'Ticketmaster feed status',
      hidden: true,
      fields: ticketmasterFeedStatusFields,
    }),
    defineField({
      name: 'ticketmasterFeedSnapshot',
      type: 'array',
      title: 'Ticketmaster feed snapshot',
      hidden: true,
      description: 'Last successful feed scan; used to detect concerts that left the schedule.',
      of: [
        {
          type: 'object',
          fields: [
            {name: 'slug', type: 'string'},
            {name: 'eventId', type: 'string'},
            {name: 'name', type: 'string'},
            {name: 'url', type: 'string'},
            {name: 'imageUrl', type: 'url'},
            {name: 'startDateTime', type: 'datetime'},
            {name: 'localDate', type: 'string'},
            {name: 'localTime', type: 'string'},
            {name: 'venueId', type: 'string'},
            {name: 'venueName', type: 'string'},
            {name: 'venueSlug', type: 'string'},
            {name: 'venueCity', type: 'string'},
            {name: 'venueState', type: 'string'},
            {name: 'timezone', type: 'string'},
            {name: 'imageWidth', type: 'number'},
            {name: 'imageHeight', type: 'number'},
            {
              name: 'attractions',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    {name: 'id', type: 'string'},
                    {name: 'name', type: 'string'},
                    {name: 'url', type: 'url'},
                  ],
                },
              ],
            },
            {name: 'info', type: 'text'},
            {name: 'pleaseNote', type: 'text'},
            {name: 'description', type: 'text'},
            {name: 'genreLabels', type: 'array', of: [{type: 'string'}]},
            {name: 'eventTypeLabel', type: 'string'},
            {name: 'priceSummary', type: 'string'},
            {name: 'statusLabel', type: 'string'},
            {name: 'promoterNames', type: 'array', of: [{type: 'string'}]},
            {name: 'accessibilityInfo', type: 'text'},
            {name: 'ticketLimitInfo', type: 'text'},
            {name: 'venueAddress', type: 'string'},
            {name: 'venueUrl', type: 'url'},
            {name: 'salesPublicStart', type: 'datetime'},
            {name: 'salesPublicEnd', type: 'datetime'},
            {
              name: 'presales',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    {name: 'name', type: 'string'},
                    {name: 'startDateTime', type: 'datetime'},
                    {name: 'endDateTime', type: 'datetime'},
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'newsletterPopupEnabled',
      type: 'boolean',
      title: 'Newsletter signup popup',
      group: 'newsletter',
      description:
        'Shows a subscribe modal on public pages after 5 seconds (scroll or exit intent on desktop). Once per session.',
      initialValue: false,
    }),
    defineField({
      name: 'newsletterPopupHeadline',
      type: 'string',
      title: 'Popup headline',
      group: 'newsletter',
      description: 'Shown in the modal. Defaults to a generic line if empty.',
    }),
    defineField({
      name: 'newsletterPopupImage',
      type: 'image',
      title: 'Popup image',
      group: 'newsletter',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
        }),
      ],
    }),
    defineField({
      name: 'newsletterPopupCta',
      type: 'string',
      title: 'Subscribe button label',
      group: 'newsletter',
      description: 'Defaults to “Subscribe” when empty.',
    }),
    defineField({
      name: 'instagramUrl',
      type: 'url',
      title: 'Instagram URL',
      group: 'social',
      description: 'Profile link, e.g. https://www.instagram.com/yourhandle/',
    }),
    defineField({
      name: 'facebookUrl',
      type: 'url',
      title: 'Facebook URL',
      group: 'social',
      description: 'Page or profile link, e.g. https://www.facebook.com/yourpage/',
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
      'reviewsHubPortable',
      'Reviews Page Intro',
      'Intro above the grid on /reviews. Also used for SEO description when set.',
      {group: 'hubs'},
    ),
    pageIntroField(
      'authorsHubPortable',
      'Authors Page Intro',
      'Intro above the list on /authors. Also used for SEO description when set.',
      {group: 'hubs'},
    ),
    pageIntroField(
      'tagsHubPortable',
      'Tags Page Intro',
      'Intro above the list on /tags. Also used for SEO description when set.',
      {group: 'hubs'},
    ),
    pageIntroField(
      'scheduleHubPortable',
      'Events Page Intro',
      'Intro above the concert grid on /events. Also used for SEO description when set.',
      {group: 'hubs'},
    ),
    pageIntroField(
      'venuesHubPortable',
      'Venues Page Intro',
      'Intro above the map on /venues. Also used for SEO description when set.',
      {group: 'hubs'},
    ),
  ],
})
