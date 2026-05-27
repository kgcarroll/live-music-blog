'use client'

import {useToast} from '@sanity/ui'
import {useRef, useState} from 'react'
import type {DocumentActionComponent, DocumentActionProps} from 'sanity'
import {useClient, useDocumentStore} from 'sanity'
import {firstValueFrom, merge, race, timer} from 'rxjs'
import {filter, switchMap, take} from 'rxjs/operators'

import {TAG_POST_PUBLISH_EVENT} from '@/sanity/constants'
import {apiVersion} from '@/sanity/lib/client'
import {loadTagCreatePending} from '@/sanity/lib/tagCreateNavigation'
import type {TagLinkPending} from '@/sanity/lib/tagLinkClient'
import {publishedDocumentId} from '@/lib/tagSuggestionStorage'

function dispatchPostPublish(pending: TagLinkPending) {
  window.dispatchEvent(new CustomEvent(TAG_POST_PUBLISH_EVENT, {detail: pending}))
}

function resolvePendingLink(props: DocumentActionProps): TagLinkPending | null {
  type TagLinkFields = {
    linkToArticleId?: string
    linkToArticleType?: string
    title?: string
  }

  const draft = props.draft as TagLinkFields | null | undefined
  const published = props.published as TagLinkFields | null | undefined
  const source = draft?.linkToArticleId?.trim() ? draft : published

  const fromTag =
    source?.linkToArticleId?.trim() && source?.linkToArticleType?.trim()
      ? {
          articleDocumentId: source.linkToArticleId.trim(),
          articleType: source.linkToArticleType.trim(),
          tagTitle: String(source.title ?? '').trim(),
          tagId: publishedDocumentId(props.id),
        }
      : null

  if (fromTag?.articleDocumentId && fromTag.articleType && fromTag.tagTitle) {
    return fromTag
  }

  const session = loadTagCreatePending()
  if (!session) return null

  return {
    articleDocumentId: session.articleDocumentId,
    articleType: session.articleType,
    tagTitle: session.tagTitle,
    tagId: publishedDocumentId(props.id),
  }
}

type PublishWaitResult = {kind: 'success'} | {kind: 'error'} | {kind: 'timeout'}

async function waitForTagPublish(
  documentStore: ReturnType<typeof useDocumentStore>,
  client: ReturnType<typeof useClient>,
  publishedId: string,
  type: string,
): Promise<PublishWaitResult> {
  const draftId = `drafts.${publishedId}`

  const operationDone = firstValueFrom(
    merge(
      documentStore.pair.operationEvents(publishedId, type),
      documentStore.pair.operationEvents(draftId, type),
    ).pipe(
      filter(
        (e) => (e.type === 'success' || e.type === 'error') && e.op === 'publish',
      ),
      take(1),
    ),
  ).then((e) => (e.type === 'error' ? {kind: 'error' as const} : {kind: 'success' as const}))

  const publishedExists = firstValueFrom(
    timer(0, 300).pipe(
      switchMap(() =>
        client.fetch<boolean>(`defined(*[_id == $id][0]._id)`, {id: publishedId}),
      ),
      filter(Boolean),
      take(1),
      switchMap(() => [{kind: 'success' as const}]),
    ),
  )

  const timedOut = firstValueFrom(
    timer(30_000).pipe(switchMap(() => [{kind: 'timeout' as const}])),
  )

  return firstValueFrom(race(operationDone, publishedExists, timedOut))
}

export function wrapTagPublishAction(original: DocumentActionComponent): DocumentActionComponent {
  const Wrapped: DocumentActionComponent = (props) => {
    const toast = useToast()
    const documentStore = useDocumentStore()
    const client = useClient({apiVersion})
    const propsRef = useRef(props)
    propsRef.current = props
    const originalDesc = original(props)
    const [isPublishing, setIsPublishing] = useState(false)
    const pendingLinkRef = useRef<TagLinkPending | null>(null)

    const publishedId = publishedDocumentId(props.id)

    if (!originalDesc) return null

    return {
      ...originalDesc,
      disabled: originalDesc.disabled || isPublishing,
      label: isPublishing ? 'Publishing…' : originalDesc.label,
      onHandle: () => {
        pendingLinkRef.current = resolvePendingLink(props)
        setIsPublishing(true)

        void (async () => {
          try {
            originalDesc.onHandle?.()

            const event = await waitForTagPublish(
              documentStore,
              client,
              publishedId,
              props.type,
            )

            if (event.kind === 'error') {
              return
            }

            if (event.kind === 'timeout') {
              toast.push({
                status: 'warning',
                title: 'Publish is taking longer than expected',
                description: 'Try publishing the tag again.',
              })
              return
            }

            const linkPending =
              resolvePendingLink(propsRef.current) ?? pendingLinkRef.current

            if (!linkPending) {
              toast.push({
                status: 'info',
                title: 'Tag published',
                description:
                  'This tag was not created from an article suggestion, so it was not linked automatically.',
              })
              return
            }

            dispatchPostPublish(linkPending)
          } finally {
            setIsPublishing(false)
          }
        })()
      },
    }
  }

  Wrapped.action = original.action ?? 'publish'
  Wrapped.displayName = 'TagPublishAction'

  return Wrapped
}

export function resolveTagDocumentActions(actions: DocumentActionComponent[]): DocumentActionComponent[] {
  return actions.map((action) => (action.action === 'publish' ? wrapTagPublishAction(action) : action))
}
