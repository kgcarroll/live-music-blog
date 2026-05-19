import {PortableText, type PortableTextComponents} from '@portabletext/react'
import type {TypedObject} from '@portabletext/types'
import {ImageTextRow} from '@/components/ImageTextRow'
import {SanityImage} from '@/components/SanityImage'
import {YouTubeEmbed} from '@/components/YouTubeEmbed'
import {buildImageTextRowLayoutMap} from '@/lib/imageTextRowLayout'
import {createPortableTextComponents} from '@/lib/portableTextComponents'
import {getYouTubeVideoId} from '@/lib/youtube'

type YouTubeEmbedValue = {
  url?: unknown
  title?: unknown
}

type ImageTextRowBlockValue = {
  _key?: string
  image?: Parameters<typeof SanityImage>[0]['value']
  text?: TypedObject[] | null
}

function buildArticlePortableTextComponents(value: TypedObject[] | null | undefined): PortableTextComponents {
  const imageTextLayoutByKey = buildImageTextRowLayoutMap(value)

  return {
    ...createPortableTextComponents({includeHeadings: true}),
    types: {
      image: ({value: imageValue}) => <SanityImage value={imageValue} sizes="(max-width:768px) 100vw, 42rem" />,
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
        const row = rowValue as ImageTextRowBlockValue
        const key = row._key ?? ''
        const layout = imageTextLayoutByKey.get(key) ?? 'left'
        return <ImageTextRow value={row} layout={layout} />
      },
    },
  }
}

export function ArticleBody({value}: {value: TypedObject[] | null | undefined}) {
  if (!value?.length) return null

  const components = buildArticlePortableTextComponents(value)

  return (
    <div className="prose prose-invert max-w-none prose-headings:text-zinc-50">
      <PortableText value={value} components={components} />
    </div>
  )
}
