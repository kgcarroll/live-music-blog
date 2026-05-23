import {ImageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {getInstagramEmbedInfo, instagramEmbedKindLabel} from '@/lib/instagram'

export const instagramEmbed = defineType({
  name: 'instagramEmbed',
  title: 'Instagram',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'Instagram URL',
      type: 'url',
      description: 'Paste a link to a public post, reel, or IGTV video on instagram.com.',
      validation: (Rule) =>
        Rule.required().custom((url) => {
          if (!url || typeof url !== 'string') return true
          return getInstagramEmbedInfo(url)
            ? true
            : 'Use a public instagram.com post, reel, or IGTV link'
        }),
    }),
    defineField({
      name: 'title',
      title: 'Accessible Title',
      type: 'string',
      initialValue: 'Instagram post',
    }),
  ],
  preview: {
    select: {title: 'title', url: 'url'},
    prepare({title, url}) {
      const embed = getInstagramEmbedInfo(typeof url === 'string' ? url : undefined)
      return {
        title: title || 'Instagram',
        subtitle: embed
          ? `${instagramEmbedKindLabel(embed.kind)} · ${embed.permalink}`
          : typeof url === 'string'
            ? url
            : 'Add an Instagram URL',
      }
    },
  },
})
