/** URL slug from a venue name (e.g. "The Fillmore" → "the-fillmore"). */
export function venueSlugFromName(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
  return base || 'venue'
}

export function assignUniqueVenueSlugs<T extends {name: string; slug?: string}>(
  venues: T[],
): (T & {slug: string})[] {
  const used = new Set<string>()
  return venues.map((venue) => {
    const base = venueSlugFromName(venue.name)
    let slug = base
    let n = 2
    while (used.has(slug)) {
      slug = `${base}-${n}`
      n += 1
    }
    used.add(slug)
    return {...venue, slug}
  })
}
