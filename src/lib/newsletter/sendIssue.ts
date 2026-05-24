import {createClient} from 'next-sanity'
import type {PortableTextBlock} from '@portabletext/types'

import {newsletterHref} from '@/lib/paths'
import {absoluteSiteUrl} from '@/lib/siteUrl'
import {portableTextToEmailHtml, wrapNewsletterEmailHtml} from '@/lib/newsletter/portableTextToEmailHtml'
import {ensureNewsletterAudienceId, getResendClient, getResendFromAddress} from '@/lib/newsletter/resendAudience'
import {apiVersion, client} from '@/sanity/lib/client'
import {NEWSLETTER_ISSUE_BY_ID} from '@/sanity/lib/queries'

export type NewsletterIssueDoc = {
  _id: string
  title: string
  slug: string
  emailSubject?: string | null
  previewText?: string | null
  body?: PortableTextBlock[] | null
  sentAt?: string | null
  resendBroadcastId?: string | null
}

export type SendNewsletterResult =
  | {ok: true; broadcastId: string; test: boolean}
  | {error: string; status?: number}

function getSanityWriteClient() {
  const token = process.env.SANITY_API_WRITE_TOKEN?.trim()
  if (!token) return null
  return createClient({
    projectId: client.config().projectId!,
    dataset: client.config().dataset!,
    apiVersion,
    token,
    useCdn: false,
  })
}

export async function fetchNewsletterIssue(documentId: string): Promise<NewsletterIssueDoc | null> {
  return client.fetch<NewsletterIssueDoc | null>(
    NEWSLETTER_ISSUE_BY_ID,
    {id: documentId},
    {perspective: 'published', useCdn: false},
  )
}

export function buildNewsletterEmail(issue: NewsletterIssueDoc) {
  const archiveUrl = absoluteSiteUrl(newsletterHref(issue.slug))
  const bodyHtml = portableTextToEmailHtml(issue.body)
  const subject = issue.emailSubject?.trim() || issue.title
  return wrapNewsletterEmailHtml({
    title: issue.title,
    previewText: issue.previewText,
    bodyHtml,
    archiveUrl,
  })
}

export async function sendNewsletterIssue(options: {
  documentId: string
  test?: boolean
}): Promise<SendNewsletterResult> {
  const resend = getResendClient()
  const from = getResendFromAddress()
  if (!resend || !from) {
    return {error: 'Resend is not configured (RESEND_API_KEY and RESEND_FROM)', status: 500}
  }

  const issue = await fetchNewsletterIssue(options.documentId)
  if (!issue) {
    return {error: 'Newsletter issue not found or not published', status: 404}
  }

  if (!options.test && issue.sentAt) {
    return {error: 'This issue was already sent', status: 409}
  }

  const audienceResult = await ensureNewsletterAudienceId(resend)
  if (typeof audienceResult !== 'string') {
    return {error: audienceResult.error, status: 502}
  }

  const {html, text} = buildNewsletterEmail(issue)
  const subject = issue.emailSubject?.trim() || issue.title
  const previewText = issue.previewText?.trim() || undefined

  if (options.test) {
    const to = process.env.CONTACT_TO_EMAIL?.trim()
    if (!to) {
      return {error: 'CONTACT_TO_EMAIL is not configured', status: 500}
    }

    const {error} = await resend.emails.send({
      from,
      to: [to],
      subject: `[Newsletter test] ${subject}`,
      html,
      text,
    })

    if (error) {
      return {error: error.message || 'Failed to send test email', status: 502}
    }

    return {ok: true, broadcastId: 'test', test: true}
  }

  const {data, error} = await resend.broadcasts.create({
    audienceId: audienceResult,
    from,
    subject,
    previewText,
    html,
    text,
    name: issue.title,
  })

  if (error || !data?.id) {
    return {error: error?.message || 'Failed to create broadcast', status: 502}
  }

  const writeClient = getSanityWriteClient()
  if (writeClient) {
    await writeClient
      .patch(options.documentId)
      .set({
        sentAt: new Date().toISOString(),
        resendBroadcastId: data.id,
      })
      .commit()
  } else {
    console.warn(
      '[newsletter] SANITY_API_WRITE_TOKEN is not set; broadcast was sent but sentAt was not saved on the document.',
    )
  }

  return {ok: true, broadcastId: data.id, test: false}
}
