import {NextResponse} from 'next/server'

import {
  digestItemsToPortableText,
  generateNewsletterDigestWithOpenAI,
} from '@/lib/newsletterBodyGeneration'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {days?: number; maxItems?: number}
    const days = Math.max(1, Math.min(90, Number(body.days ?? 30)))
    const maxItems = Math.max(1, Math.min(250, Number(body.maxItems ?? 200)))

    const {intro, items, model, rawRssItemCount, filteredItemCount, selectedItemCount} =
      await generateNewsletterDigestWithOpenAI({days, maxItems})
    const blocks = digestItemsToPortableText({intro, items})

    return NextResponse.json({
      blocks,
      model,
      rawRssItemCount,
      filteredItemCount,
      selectedItemCount,
      generatedItemCount: items.length,
    })
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Could not generate newsletter body.'},
      {status: 500},
    )
  }
}

