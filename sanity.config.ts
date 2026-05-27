import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {media, mediaAssetSource} from 'sanity-plugin-media'
import {schemaTypes} from './src/sanity/schemaTypes'
import {resolve} from './src/sanity/presentation/resolve'
import {GenerateFacebookCaptionAction} from './src/sanity/actions/facebookCaptionAction'
import {SendNewsletterBroadcastAction, SendNewsletterTestAction} from './src/sanity/actions/newsletterSendActions'
import {structure} from './src/sanity/structure'
import {resolveTagDocumentActions} from './src/sanity/actions/tagPublishAction'
import {TagCreateFlowListener} from './src/sanity/components/TagCreateFlowListener'
import {TAG_FROM_TITLE_TEMPLATE_ID} from './src/sanity/constants'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'placeholder'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export default defineConfig({
  name: 'default',
  title: 'PML Studio',

  projectId,
  dataset,

  basePath: '/studio',

  studio: {
    components: {
      layout: TagCreateFlowListener,
    },
  },

  form: {
    image: {
      assetSources: () => [mediaAssetSource],
    },
  },

  plugins: [
    structureTool({structure}),
    media(),
    presentationTool({
      resolve,
      previewUrl: {
        origin: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    templates: (prev) => [
      ...prev,
      {
        id: TAG_FROM_TITLE_TEMPLATE_ID,
        title: 'Tag',
        schemaType: 'tag',
        parameters: [
          {name: 'title', type: 'string'},
          {name: 'linkToArticleId', type: 'string'},
          {name: 'linkToArticleType', type: 'string'},
        ],
        value: (params: {
          title?: string
          linkToArticleId?: string
          linkToArticleType?: string
        }) => {
          const title = String(params.title ?? '').trim()
          const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
          const linkToArticleId = String(params.linkToArticleId ?? '').trim()
          const linkToArticleType = String(params.linkToArticleType ?? '').trim()
          return {
            title,
            ...(slug ? {slug: {current: slug}} : {}),
            ...(linkToArticleId ? {linkToArticleId} : {}),
            ...(linkToArticleType ? {linkToArticleType} : {}),
          }
        },
      },
    ],
  },

  document: {
    newDocumentOptions: (prev, {creationContext}) => {
      if (creationContext.type === 'global' || creationContext.type === 'structure') {
        return prev.filter((option) => option.templateId !== 'siteSettings')
      }
      return prev
    },
    actions: (prev, {schemaType}) => {
      if (schemaType === 'siteSettings') {
        return prev.filter(({action}) => action !== 'delete' && action !== 'duplicate')
      }
      if (schemaType === 'newsletterIssue') {
        return [...prev, SendNewsletterTestAction, SendNewsletterBroadcastAction]
      }
      if (schemaType === 'tag') {
        return resolveTagDocumentActions(prev)
      }
      if (schemaType === 'interview' || schemaType === 'news' || schemaType === 'review') {
        return [...prev, GenerateFacebookCaptionAction]
      }
      return prev
    },
  },
})
