import {PortableText, type PortableTextComponents} from '@portabletext/react'
import type {TypedObject} from '@portabletext/types'
import {SanityImage} from '@/components/SanityImage'
import {YouTubeEmbed} from '@/components/YouTubeEmbed'
import {createPortableTextComponents} from '@/lib/portableTextComponents'
import {getYouTubeVideoId} from '@/lib/youtube'

type YouTubeEmbedValue = {
  url?: unknown
  title?: unknown
}

/** @deprecated Legacy body blocks; no longer in Studio schema. */
type LegacyImageTextRowValue = {
  image?: Parameters<typeof SanityImage>[0]['value']
  text?: TypedObject[] | null
}

const articlePortableTextComponents: PortableTextComponents = {
  ...createPortableTextComponents({includeHeadings: true}),
  types: {
    image: ({value: imageValue}) => {
      const layout =
        imageValue && typeof imageValue === 'object' && 'layout' in imageValue
          ? (imageValue as {layout?: string}).layout
          : undefined
      const floated = layout === 'floatLeft' || layout === 'floatRight'
      return (
        <SanityImage
          value={imageValue as Parameters<typeof SanityImage>[0]['value']}
          sizes={floated ? '(max-width: 767px) 100vw, 50vw' : '(max-width: 768px) 100vw, 42rem'}
        />
      )
    },
    youtubeEmbed: ({value: embedValue}) => {
      const embed = embedValue as YouTubeEmbedValue
      const videoId = getYouTubeVideoId(typeof embed.url === 'string' ? embed.url : undefined)
      if (!videoId) return null

      return (
        <div className="my-8">
          <YouTubeEmbed videoId={videoId} title={typeof embed.title === 'string' ? embed.title : null} />
        </div>
      )
    },
    imageTextRow: ({value: rowValue}) => {
      const row = rowValue as LegacyImageTextRowValue
      return (
        <div className="my-8 space-y-4">
          {row.image?.asset?._id ? (
            <SanityImage value={row.image} sizes="(max-width: 768px) 100vw, 42rem" />
          ) : null}
          {row.text?.length ? (
            <PortableText value={row.text} components={createPortableTextComponents({compact: true})} />
          ) : null}
        </div>
      )
    },
  },
}

export function ArticleBody({value}: {value: TypedObject[] | null | undefined}) {
  if (!value?.length) return null

  return (
    <div className="article-body-flow max-w-none">
      <PortableText value={value} components={articlePortableTextComponents} />
    </div>
  )
}
