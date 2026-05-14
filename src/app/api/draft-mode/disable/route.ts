import {draftMode} from 'next/headers'
import {headers} from 'next/headers'
import {NextResponse} from 'next/server'

export async function GET() {
  ;(await draftMode()).disable()
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return NextResponse.redirect(new URL('/', `${proto}://${host}`))
}
