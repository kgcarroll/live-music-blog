import {TAG_FOCUS_FIELD_PATH} from '@/sanity/constants'

/** Session keys for tag-create flow (article → split tag pane → return on publish). */

export const TAG_CREATE_RETURN_PANES_KEY = 'pml-tag-create-return-panes'

export const TAG_CREATE_PENDING_KEY = 'pml-tag-create-pending'

export type TagCreatePending = {
  articleDocumentId: string
  articleType: string
  tagTitle: string
  /** Draft document id used when opening the create pane (ChildLink childId). */
  tagDocumentId: string
}

/** Router pane groups captured before opening the tag create pane. */
export type ReturnPanesState = {
  panes: unknown
}

export function saveTagCreateSession(returnPanes: ReturnPanesState, pending: TagCreatePending): void {
  sessionStorage.setItem(TAG_CREATE_RETURN_PANES_KEY, JSON.stringify(returnPanes))
  sessionStorage.setItem(TAG_CREATE_PENDING_KEY, JSON.stringify(pending))
}

export function loadTagCreatePending(): TagCreatePending | null {
  const raw = sessionStorage.getItem(TAG_CREATE_PENDING_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TagCreatePending
  } catch {
    return null
  }
}

type PaneSibling = {id: string; params?: Record<string, string | undefined>; payload?: unknown}

/** Set the article pane path so Studio focuses the tags field on return. */
export function applyTagsFocusToReturnPanes(state: ReturnPanesState): ReturnPanesState {
  const groups = state.panes as PaneSibling[][] | undefined
  if (!Array.isArray(groups) || groups.length === 0) return state

  const lastGroupIndex = groups.length - 1
  const lastGroup = groups[lastGroupIndex]
  if (!lastGroup?.length) return state

  const articlePaneIndex = lastGroup.length - 1
  const articlePane = lastGroup[articlePaneIndex]
  const nextArticlePane: PaneSibling = {
    ...articlePane,
    params: {
      ...articlePane.params,
      path: TAG_FOCUS_FIELD_PATH,
    },
  }

  const nextLastGroup = [...lastGroup]
  nextLastGroup[articlePaneIndex] = nextArticlePane

  const nextGroups = [...groups]
  nextGroups[lastGroupIndex] = nextLastGroup

  return {panes: nextGroups}
}

export function peekReturnPanes(): ReturnPanesState | null {
  const raw = sessionStorage.getItem(TAG_CREATE_RETURN_PANES_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as ReturnPanesState
  } catch {
    return null
  }
}

export function clearTagCreateSession(): void {
  sessionStorage.removeItem(TAG_CREATE_RETURN_PANES_KEY)
  sessionStorage.removeItem(TAG_CREATE_PENDING_KEY)
}

export function consumeReturnPanes(): ReturnPanesState | null {
  const state = peekReturnPanes()
  clearTagCreateSession()
  return state
}

/** Close the tag pane and return to the article captured when the tag was opened. */
export function navigateBackAfterTagLink(
  navigate: (state: Record<string, unknown>) => void,
  currentRouterState: Record<string, unknown>,
): boolean {
  const returnState = consumeReturnPanes()
  if (!returnState?.panes) return false

  const focused = applyTagsFocusToReturnPanes(returnState)
  navigate({...currentRouterState, panes: focused.panes})
  return true
}

const DOCUMENT_PANEL_SCROLLER_SELECTOR = '[data-testid="document-panel-scroller"]'

/** Scroll the tags UI into view inside Sanity's document panel (not the window). */
export function scrollElementIntoDocumentPanel(
  element: HTMLElement | null,
  delayMs = 600,
): void {
  if (!element) return

  window.setTimeout(() => {
    const scroller = element.closest(DOCUMENT_PANEL_SCROLLER_SELECTOR)
    if (scroller instanceof HTMLElement) {
      const elementTop = element.getBoundingClientRect().top
      const scrollerTop = scroller.getBoundingClientRect().top
      scroller.scrollTo({
        top: scroller.scrollTop + (elementTop - scrollerTop) - 24,
        behavior: 'smooth',
      })
      return
    }

    element.scrollIntoView({behavior: 'smooth', block: 'start'})
  }, delayMs)
}
