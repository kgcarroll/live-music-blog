/** Session: popup was shown (or triggered) this visit. */
export const NEWSLETTER_POPUP_SESSION_SHOWN = 'pml_newsletter_popup_shown'

/** Session: when the 5s eligibility timer started (ms epoch). */
export const NEWSLETTER_POPUP_SESSION_TIMER_START = 'pml_newsletter_popup_timer_start'

/** Device: submitted signup form; hide until confirm or expiry. */
export const NEWSLETTER_POPUP_SOFT_HIDE = 'pml_newsletter_popup_pending'

/** Device: confirmed subscription via email link. */
export const NEWSLETTER_POPUP_HARD_HIDE = 'pml_newsletter_popup_subscribed'

const SOFT_HIDE_DAYS = 30
const HARD_HIDE_DAYS = 730

function readSession(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // ignore quota / private mode
  }
}

function readLocal(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

function readLocalExpiry(key: string): boolean {
  const raw = readLocal(key)
  if (!raw) return false
  const expiry = Number(raw)
  if (!Number.isFinite(expiry)) {
    writeLocal(key, '')
    return false
  }
  if (Date.now() > expiry) {
    writeLocal(key, '')
    return false
  }
  return true
}

function writeLocalExpiry(key: string, days: number) {
  writeLocal(key, String(Date.now() + days * 24 * 60 * 60 * 1000))
}

export function isNewsletterPopupPathExcluded(pathname: string): boolean {
  if (!pathname) return true
  if (pathname === '/') return true
  if (pathname === '/studio' || pathname.startsWith('/studio/')) return true
  if (pathname === '/newsletter/confirmed' || pathname.startsWith('/newsletter/confirmed')) {
    return true
  }
  return false
}

export function isNewsletterPopupBlocked(): boolean {
  if (readLocalExpiry(NEWSLETTER_POPUP_HARD_HIDE)) return true
  if (readLocalExpiry(NEWSLETTER_POPUP_SOFT_HIDE)) return true
  if (readSession(NEWSLETTER_POPUP_SESSION_SHOWN) === '1') return true
  return false
}

export function ensureNewsletterPopupTimerStart(): number {
  const existing = readSession(NEWSLETTER_POPUP_SESSION_TIMER_START)
  if (existing) {
    const n = Number(existing)
    if (Number.isFinite(n)) return n
  }
  const start = Date.now()
  writeSession(NEWSLETTER_POPUP_SESSION_TIMER_START, String(start))
  return start
}

export function isNewsletterPopupDelayElapsed(
  startMs: number,
  delayMs: number,
  now = Date.now(),
): boolean {
  return now - startMs >= delayMs
}

export function markNewsletterPopupSessionShown() {
  writeSession(NEWSLETTER_POPUP_SESSION_SHOWN, '1')
}

export function markNewsletterPopupSoftHide() {
  writeLocalExpiry(NEWSLETTER_POPUP_SOFT_HIDE, SOFT_HIDE_DAYS)
  markNewsletterPopupSessionShown()
}

export function markNewsletterPopupHardHide() {
  writeLocalExpiry(NEWSLETTER_POPUP_HARD_HIDE, HARD_HIDE_DAYS)
  writeLocal(NEWSLETTER_POPUP_SOFT_HIDE, '')
  markNewsletterPopupSessionShown()
}

export const NEWSLETTER_POPUP_DELAY_MS = 5000
export const NEWSLETTER_POPUP_SCROLL_THRESHOLD = 0.5
