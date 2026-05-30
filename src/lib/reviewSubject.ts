export const REVIEW_SUBJECT_OPTIONS = [
  {title: 'Live concert', value: 'liveConcert'},
  {title: 'Album / EP', value: 'album'},
  {title: 'Video / film', value: 'video'},
  {title: 'Other', value: 'other'},
] as const

export type ReviewSubject = (typeof REVIEW_SUBJECT_OPTIONS)[number]['value']

export function isReviewSubject(value: unknown): value is ReviewSubject {
  return REVIEW_SUBJECT_OPTIONS.some((option) => option.value === value)
}

/** Existing reviews without a subject: infer from legacy concert fields. */
export function resolveReviewSubject(
  subject: unknown,
  showDate?: string | null,
  venueName?: string | null,
): ReviewSubject {
  if (isReviewSubject(subject)) return subject
  if (showDate?.trim() || venueName?.trim()) return 'liveConcert'
  return 'other'
}

export function isLiveConcertReviewSubject(subject: ReviewSubject): boolean {
  return subject === 'liveConcert'
}
