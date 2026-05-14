import {PortableText, type PortableTextComponents} from '@portabletext/react'
import type {TypedObject} from '@portabletext/types'
import {SanityImage} from '@/components/SanityImage'

const components: PortableTextComponents = {
  block: {
    h2: ({children}) => (
      <h2 className="mt-12 scroll-mt-24 text-2xl font-semibold tracking-tight text-zinc-50">{children}</h2>
    ),
    h3: ({children}) => (
      <h3 className="mt-8 scroll-mt-24 text-xl font-semibold text-zinc-100">{children}</h3>
    ),
    blockquote: ({children}) => (
      <blockquote className="my-6 border-l-4 border-amber-500/60 pl-4 text-lg italic text-zinc-300">
        {children}
      </blockquote>
    ),
    normal: ({children}) => <p className="my-4 leading-relaxed text-zinc-300">{children}</p>,
  },
  list: {
    bullet: ({children}) => <ul className="my-4 list-disc space-y-2 pl-6 text-zinc-300">{children}</ul>,
    number: ({children}) => <ol className="my-4 list-decimal space-y-2 pl-6 text-zinc-300">{children}</ol>,
  },
  marks: {
    strong: ({children}) => <strong className="font-semibold text-zinc-100">{children}</strong>,
    em: ({children}) => <em className="italic">{children}</em>,
    link: ({value, children}) => {
      const href = value?.href
      if (!href) return <>{children}</>
      return (
        <a href={href} className="text-amber-300 underline-offset-2 hover:underline" rel="noopener noreferrer">
          {children}
        </a>
      )
    },
  },
  types: {
    image: ({value}) => <SanityImage value={value} sizes="(max-width:768px) 100vw, 42rem" />,
  },
}

export function ArticleBody({value}: {value: TypedObject[] | null | undefined}) {
  if (!value?.length) return null
  return (
    <div className="prose prose-invert max-w-none prose-headings:text-zinc-50">
      <PortableText value={value} components={components} />
    </div>
  )
}
