import {PortableText} from '@portabletext/react'
import type {TypedObject} from '@portabletext/types'
import {SanityImage} from '@/components/SanityImage'
import {createPortableTextComponents} from '@/lib/portableTextComponents'
import type {ImageTextRowLayout} from '@/lib/imageTextRowLayout'

type ImageTextRowValue = {
  _key?: string
  image?: Parameters<typeof SanityImage>[0]['value']
  text?: TypedObject[] | null
}

const columnPortableTextComponents = createPortableTextComponents({compact: true})

export function ImageTextRow({value, layout}: {value: ImageTextRowValue; layout: ImageTextRowLayout}) {
  const imageOnRight = layout === 'right'
  const text = value.text

  return (
    <section
      className="my-4 grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-6"
      aria-label="Image and text"
    >
      <div
        className={`flex min-w-0 items-center ${imageOnRight ? 'md:order-2' : 'md:order-1'}`}
      >
        {value.image?.asset?._id ? (
          <SanityImage
            value={value.image}
            sizes="(max-width: 768px) 100vw, 50vw"
            embedded
          />
        ) : null}
      </div>
      <div
        className={`min-w-0 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 ${
          imageOnRight ? 'md:order-1' : 'md:order-2'
        }`}
      >
        {text?.length ? <PortableText value={text} components={columnPortableTextComponents} /> : null}
      </div>
    </section>
  )
}
