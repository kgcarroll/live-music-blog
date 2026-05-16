import {defineArrayMember, defineField} from 'sanity'

export const bodyField = () =>
  defineField({
    name: 'body',
    title: 'Body',
    type: 'array',
    of: [
      {
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
          annotations: [{name: 'link', type: 'object', title: 'Link', fields: [{name: 'href', type: 'url', title: 'URL'}]}],
        },
      },
      {
        type: 'image',
        options: {hotspot: true},
        fields: [
          defineField({name: 'alt', type: 'string', title: 'Alt text', validation: (Rule) => Rule.required()}),
          defineField({name: 'caption', type: 'string', title: 'Caption'}),
        ],
      },
    ],
  })

export const coverField = () =>
  defineField({
    name: 'coverImage',
    title: 'Cover image',
    type: 'image',
    options: {hotspot: true},
    fields: [defineField({name: 'alt', type: 'string', title: 'Alt text'})],
  })

export const tagsField = () =>
  defineField({
    name: 'tags',
    title: 'Tags',
    description: 'Connect this article to tag hub pages and related articles.',
    type: 'array',
    of: [defineArrayMember({type: 'reference', to: [{type: 'tag'}]})],
  })

export const seoFields = () => [
  defineField({name: 'seoTitle', type: 'string', title: 'SEO title'}),
  defineField({name: 'seoDescription', type: 'text', title: 'SEO description', rows: 3}),
]
