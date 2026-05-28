import {EnvelopeIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {NewsletterIssueBodyInput} from '@/sanity/components/NewsletterIssueBodyInput'
import {coverField, seoFields} from './blocks'

export const newsletterIssue = defineType({
  name: 'newsletterIssue',
  title: 'Newsletter Issue',
  type: 'document',
  icon: EnvelopeIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'send', title: 'Send'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Title',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      title: 'Slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      title: 'Published At',
      group: 'content',
      description: 'Used for the web archive and ordering. Publish the document before sending.',
      validation: (Rule) => Rule.required(),
    }),
    coverField('content'),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'content',
      components: {input: NewsletterIssueBodyInput},
      options: {
        insertMenu: {
          groups: [
            {name: 'text', title: 'Text', of: ['block']},
            {name: 'media', title: 'Media', of: ['image']},
            {name: 'embeds', title: 'Embeds', of: ['youtubeEmbed', 'spotifyEmbed', 'instagramEmbed']},
          ],
        },
      },
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Number', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
            ],
            annotations: [
              {name: 'link', type: 'object', title: 'Link', fields: [{name: 'href', type: 'url', title: 'URL'}]},
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({name: 'alt', type: 'string', title: 'Alt Text'}),
            defineField({name: 'caption', type: 'string', title: 'Caption'}),
          ],
        }),
        defineArrayMember({
          name: 'youtubeEmbed',
          title: 'YouTube Video',
          type: 'object',
          fields: [
            defineField({name: 'url', title: 'YouTube URL', type: 'url', validation: (Rule) => Rule.required()}),
            defineField({name: 'title', title: 'Accessible Title', type: 'string', initialValue: 'YouTube Video'}),
          ],
        }),
        defineArrayMember({
          name: 'spotifyEmbed',
          title: 'Spotify',
          type: 'object',
          fields: [
            defineField({name: 'url', title: 'Spotify URL', type: 'url', validation: (Rule) => Rule.required()}),
            defineField({name: 'title', title: 'Accessible Title', type: 'string', initialValue: 'Spotify player'}),
          ],
        }),
        defineArrayMember({type: 'instagramEmbed'}),
      ],
    }),
    defineField({
      name: 'emailSubject',
      type: 'string',
      title: 'Email Subject',
      group: 'content',
      description: 'Subject line for the broadcast. Falls back to title when empty.',
    }),
    defineField({
      name: 'previewText',
      type: 'string',
      title: 'Preview Text',
      group: 'content',
      description: 'Inbox preview snippet (preheader).',
    }),
    defineField({
      name: 'sentAt',
      type: 'datetime',
      title: 'Sent At',
      group: 'send',
      readOnly: true,
      description: 'Set automatically after a successful broadcast send.',
    }),
    defineField({
      name: 'resendBroadcastId',
      type: 'string',
      title: 'Resend Broadcast ID',
      group: 'send',
      readOnly: true,
    }),
    ...seoFields(),
  ],
  preview: {
    select: {title: 'title', subtitle: 'publishedAt', media: 'coverImage', sentAt: 'sentAt'},
    prepare({title, subtitle, media, sentAt}) {
      const date = subtitle ? new Date(subtitle).toLocaleDateString() : ''
      return {
        title,
        media,
        subtitle: [sentAt ? 'Sent' : 'Draft send', date].filter(Boolean).join(' · '),
      }
    },
  },
})
