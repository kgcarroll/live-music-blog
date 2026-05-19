import {defineField} from 'sanity'

/** Shared inline/block config for nested rich text (e.g. image+text columns). */
export const portableTextColumnBlocks = () => [
  {
    type: 'block',
    styles: [{title: 'Normal', value: 'normal'}],
    lists: [
      {title: 'Bullet', value: 'bullet'},
      {title: 'Number', value: 'number'},
    ],
    marks: {
      decorators: [
        {title: 'Strong', value: 'strong'},
        {title: 'Emphasis', value: 'em'},
      ],
      annotations: [{name: 'link', type: 'object', title: 'Link', fields: [{name: 'href', type: 'url', title: 'URL'}]}],
    },
  },
]

export const imageTextRowBlock = () => ({
  name: 'imageTextRow',
  title: 'Image & Text',
  type: 'object',
  fields: [
      defineField({
        name: 'image',
        title: 'Image',
        type: 'image',
        options: {hotspot: true},
        validation: (Rule) => Rule.required(),
        fields: [
          defineField({
            name: 'alt',
            type: 'string',
            title: 'Alt text',
            validation: (Rule) => Rule.required(),
          }),
        ],
      }),
      defineField({
        name: 'text',
        title: 'Text',
        type: 'array',
        of: portableTextColumnBlocks(),
      }),
    ],
    preview: {
      select: {
        media: 'image',
        text: 'text',
      },
      prepare(selection: {media?: unknown; text?: unknown}) {
        const {media, text} = selection
        const snippet =
          Array.isArray(text) &&
          text
            .flatMap((block: {children?: {text?: string}[]}) =>
              block?.children?.map((child) => child.text ?? '') ?? [],
            )
            .join(' ')
            .trim()
        return {
          title: 'Image & Text',
          subtitle: snippet ? snippet.slice(0, 80) : 'Image with rich text',
          media,
        }
      },
    },
})
