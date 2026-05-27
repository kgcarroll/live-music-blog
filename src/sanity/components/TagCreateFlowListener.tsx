'use client'

import {useToast} from '@sanity/ui'
import {useEffect} from 'react'
import type {LayoutProps} from 'sanity'
import {useClient} from 'sanity'
import {useRouter} from 'sanity/router'

import {
  TAG_LINKED_TO_ARTICLE_EVENT,
  TAG_POST_PUBLISH_EVENT,
  type TagLinkedToArticleDetail,
} from '@/sanity/constants'
import {apiVersion} from '@/sanity/lib/client'
import {
  applyTagsFocusToReturnPanes,
  clearTagCreateSession,
  peekReturnPanes,
  scrollElementIntoDocumentPanel,
} from '@/sanity/lib/tagCreateNavigation'
import {
  linkTagToArticleWithClient,
  removeNewTagSuggestionWithClient,
  type TagLinkPending,
} from '@/sanity/lib/tagLinkClient'

function scrollToTagsPanel() {
  const panel = document.querySelector<HTMLElement>('[data-testid="tag-suggestions-panel"]')
  scrollElementIntoDocumentPanel(panel, 500)
}

function returnToArticle(
  router: ReturnType<typeof useRouter>,
  detail: TagLinkedToArticleDetail,
): void {
  const returnState = peekReturnPanes()

  if (returnState?.panes) {
    try {
      const focused = applyTagsFocusToReturnPanes(returnState)
      router.navigate({...router.state, panes: focused.panes})
      clearTagCreateSession()
      return
    } catch {
      // Fall through to intent navigation.
    }
  }

  router.navigateIntent(
    'edit',
    {
      id: detail.articleDocumentId,
      type: detail.articleType,
      path: 'tags',
    },
    {replace: true},
  )
  clearTagCreateSession()
}

/**
 * Handles suggested-tag publish: link on draft, clean suggestions, navigate back.
 * Uses the Studio client (editor session) so linking works without server tokens.
 */
export function TagCreateFlowListener(props: LayoutProps) {
  const router = useRouter()
  const client = useClient({apiVersion})
  const toast = useToast()

  useEffect(() => {
    const onPostPublish = async (event: Event) => {
      const pending = (event as CustomEvent<TagLinkPending>).detail
      if (!pending?.articleDocumentId || !pending.articleType || !pending.tagId) return

      const detail: TagLinkedToArticleDetail = {
        articleDocumentId: pending.articleDocumentId,
        articleType: pending.articleType,
        tagTitle: pending.tagTitle,
        tagId: pending.tagId,
      }

      try {
        await linkTagToArticleWithClient(client, pending)
        await removeNewTagSuggestionWithClient(
          client,
          pending.articleDocumentId,
          pending.tagTitle,
        )

        returnToArticle(router, detail)

        window.dispatchEvent(new CustomEvent(TAG_LINKED_TO_ARTICLE_EVENT, {detail}))

        toast.push({
          status: 'success',
          title: 'Tag added to article draft',
          description: 'Returned to the article editor.',
        })

        window.requestAnimationFrame(() => scrollToTagsPanel())
      } catch (error) {
        toast.push({
          status: 'warning',
          title: 'Tag published',
          description:
            error instanceof Error
              ? `${error.message} Add the tag to the article manually from Tags.`
              : 'Could not add this tag to the article automatically.',
        })
      }
    }

    window.addEventListener(TAG_POST_PUBLISH_EVENT, onPostPublish)
    return () => window.removeEventListener(TAG_POST_PUBLISH_EVENT, onPostPublish)
  }, [client, router, toast])

  return props.renderDefault(props)
}
