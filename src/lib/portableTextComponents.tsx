import type {PortableTextComponents} from '@portabletext/react'

/** Portable Text renderers for article body and nested column text. */
export function createPortableTextComponents(options?: {
  compact?: boolean
  includeHeadings?: boolean
}): PortableTextComponents {
  const paragraphClass = options?.compact ? 'my-2 leading-relaxed text-zinc-300' : 'my-4 leading-relaxed text-zinc-300'
  const listClass = options?.compact ? 'my-2 list-disc space-y-1 pl-5 text-zinc-300' : 'my-4 list-disc space-y-2 pl-6 text-zinc-300'
  const orderedListClass = options?.compact
    ? 'my-2 list-decimal space-y-1 pl-5 text-zinc-300'
    : 'my-4 list-decimal space-y-2 pl-6 text-zinc-300'

  const block: PortableTextComponents['block'] = {
    normal: ({children}) => <p className={paragraphClass}>{children}</p>,
  }

  if (options?.includeHeadings) {
    block.h2 = ({children}) => (
      <h2 className="mt-12 scroll-mt-24 text-2xl font-semibold tracking-tight text-zinc-50">{children}</h2>
    )
    block.h3 = ({children}) => (
      <h3 className="mt-8 scroll-mt-24 text-xl font-semibold text-zinc-100">{children}</h3>
    )
    block.blockquote = ({children}) => (
      <blockquote className="my-6 border-l-4 border-amber-500/60 pl-4 text-lg italic text-zinc-300">
        {children}
      </blockquote>
    )
  }

  return {
    block,
    list: {
      bullet: ({children}) => <ul className={listClass}>{children}</ul>,
      number: ({children}) => <ol className={orderedListClass}>{children}</ol>,
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
  }
}
