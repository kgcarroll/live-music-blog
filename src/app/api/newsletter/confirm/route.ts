import {NextResponse} from 'next/server'

import {verifyNewsletterConfirmToken} from '@/lib/newsletter/confirmToken'
import {
  ensureNewsletterAudienceId,
  getResendClient,
  subscribeEmailToAudience,
} from '@/lib/newsletter/resendAudience'
import {absoluteSiteUrl} from '@/lib/siteUrl'

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim()
  if (!token) {
    return NextResponse.redirect(absoluteSiteUrl('/newsletter/confirmed?status=invalid'))
  }

  const verified = verifyNewsletterConfirmToken(token)
  if (!verified) {
    return NextResponse.redirect(absoluteSiteUrl('/newsletter/confirmed?status=invalid'))
  }

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.redirect(absoluteSiteUrl('/newsletter/confirmed?status=error'))
  }

  const audienceId = await ensureNewsletterAudienceId(resend)
  if (typeof audienceId !== 'string') {
    return NextResponse.redirect(absoluteSiteUrl('/newsletter/confirmed?status=error'))
  }

  const subscribed = await subscribeEmailToAudience(resend, audienceId, verified.email)
  if ('error' in subscribed) {
    console.error('[newsletter/confirm]', subscribed.error)
    return NextResponse.redirect(absoluteSiteUrl('/newsletter/confirmed?status=error'))
  }

  return NextResponse.redirect(absoluteSiteUrl('/newsletter/confirmed?status=ok'))
}
