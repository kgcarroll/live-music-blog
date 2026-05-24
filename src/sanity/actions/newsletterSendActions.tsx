'use client'

import {EnvelopeIcon} from '@sanity/icons'
import {useToast} from '@sanity/ui'
import {useCallback, useState} from 'react'
import type {DocumentActionComponent} from 'sanity'

import {studioApiOrigin} from '@/lib/studioHomeCarousel'

async function postNewsletterSend(documentId: string, test: boolean) {
  const response = await fetch(`${studioApiOrigin()}/api/studio/newsletter-send`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'same-origin',
    body: JSON.stringify({documentId, test}),
  })

  const data = (await response.json().catch(() => ({}))) as {error?: string; broadcastId?: string}
  if (!response.ok) {
    throw new Error(data.error || `Send failed (${response.status})`)
  }
  return data
}

export const SendNewsletterTestAction: DocumentActionComponent = (props) => {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const published = props.published

  const onHandle = useCallback(async () => {
    props.onComplete()
    setBusy(true)
    try {
      await postNewsletterSend(props.id, true)
      toast.push({
        status: 'success',
        title: 'Test email sent',
        description: 'Check the CONTACT_TO_EMAIL inbox.',
      })
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Test send failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setBusy(false)
    }
  }, [props, toast])

  return {
    label: busy ? 'Sending test…' : 'Send test email',
    icon: EnvelopeIcon,
    disabled: busy || !published,
    title: !published ? 'Publish the issue before sending a test' : undefined,
    onHandle,
  }
}

export const SendNewsletterBroadcastAction: DocumentActionComponent = (props) => {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const published = props.published
  const sentAt = published?.sentAt as string | undefined

  const onHandle = useCallback(async () => {
    if (
      !window.confirm(
        'Send this newsletter to your full Resend audience? This cannot be undone from Studio (a new issue is required for another broadcast).',
      )
    ) {
      props.onComplete()
      return
    }

    props.onComplete()
    setBusy(true)
    try {
      const data = await postNewsletterSend(props.id, false)
      toast.push({
        status: 'success',
        title: 'Newsletter sent',
        description: data.broadcastId ? `Broadcast ${data.broadcastId}` : undefined,
      })
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Send failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setBusy(false)
    }
  }, [props, toast])

  return {
    label: busy ? 'Sending…' : 'Send newsletter',
    icon: EnvelopeIcon,
    tone: 'primary',
    disabled: busy || !published || Boolean(sentAt),
    title: sentAt
      ? `Already sent ${new Date(sentAt).toLocaleString()}`
      : !published
        ? 'Publish the issue before sending'
        : undefined,
    onHandle,
  }
}
