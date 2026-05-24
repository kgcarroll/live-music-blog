import {EnvelopeIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {bodyField, coverField, seoFields} from './blocks'

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
    coverField('content'),
    bodyField('content'),
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
