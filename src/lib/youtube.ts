/** Extract YouTube video id from common watch / embed / shorts / youtu.be URLs. */
export function getYouTubeVideoId(input: string | null | undefined): string | null {
  const raw = input?.trim()
  if (!raw) return null

  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return isLikelyYouTubeId(id) ? id : null
    }

    if (host.includes('youtube.com')) {
      if (u.pathname === '/watch' || u.pathname.startsWith('/watch')) {
        const v = u.searchParams.get('v')
        return v && isLikelyYouTubeId(v) ? v : null
      }
      const embed = u.pathname.match(/^\/embed\/([\w-]+)/)
      if (embed?.[1]) return isLikelyYouTubeId(embed[1]) ? embed[1] : null
      const shorts = u.pathname.match(/^\/shorts\/([\w-]+)/)
      if (shorts?.[1]) return isLikelyYouTubeId(shorts[1]) ? shorts[1] : null
    }
  } catch {
    return null
  }

  return null
}

function isLikelyYouTubeId(id: string): boolean {
  return /^[\w-]{6,32}$/.test(id)
}
