import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {media, mediaAssetSource} from 'sanity-plugin-media'
import {schemaTypes} from './src/sanity/schemaTypes'
import {resolve} from './src/sanity/presentation/resolve'
import {SendNewsletterBroadcastAction, SendNewsletterTestAction} from './src/sanity/actions/newsletterSendActions'
import {structure} from './src/sanity/structure'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'placeholder'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export default defineConfig({
  name: 'default',
  title: 'PML Studio',

  projectId,
  dataset,

  basePath: '/studio',

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
      return prev
    },
  },
})
