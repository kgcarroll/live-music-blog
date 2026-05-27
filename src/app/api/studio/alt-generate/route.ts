import {NextResponse} from 'next/server'

import {generateAltTextWithOpenAI} from '@/lib/altTextGeneration'
import {siteOrigin} from '@/lib/siteUrl'

type Body = {
  assetRef?: string
  documentType?: string
  documentTitle?: string
  captionHint?: string
}

function isSameOriginRequest(request: Request): boolean {
  const allowed = siteOrigin()
  const origin = request.headers.get('origin')?.trim()
  if (origin && (origin === allowed || origin.startsWith(`${allowed}/`))) return true

  const referer = request.headers.get('referer')?.trim()
  if (referer && (referer === allowed || referer.startsWith(`${allowed}/`))) return true

  if (process.env.NODE_ENV === 'development') return true

  return false
}

function sanityImageUrlFromAssetRef(assetRef: string): string {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim()
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || 'production'
  if (!projectId) throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not configured on the server.')

  // asset ref: image-<hash>-<width>x<height>-<format>
  const match = assetRef.match(/^image-([a-zA-Z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/)
  if (!match) throw new Error('Unsupported Sanity image asset reference.')
  const [, hash, dims, format] = match

  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}-${dims}.${format}`
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403})
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({error: 'Invalid JSON'}, {status: 400})
  }

  const assetRef = String(body.assetRef ?? '').trim()
  if (!assetRef) return NextResponse.json({error: 'assetRef is required'}, {status: 400})

  try {
    const imageUrl = sanityImageUrlFromAssetRef(assetRef)
    const {alt, model} = await generateAltTextWithOpenAI({
      imageUrl,
      documentType: body.documentType,
      documentTitle: body.documentTitle,
      captionHint: body.captionHint,
    })
    return NextResponse.json({ok: true, alt, model})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Alt generation failed'
    return NextResponse.json({error: message}, {status: 500})
  }
}

