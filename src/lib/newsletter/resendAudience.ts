import {Resend} from 'resend'

const DEFAULT_AUDIENCE_NAME = 'Philadelphia Music Live Newsletter'

let cachedAudienceId: string | null = null

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return null
  return new Resend(apiKey)
}

export function getResendFromAddress(): string | null {
  return process.env.RESEND_FROM?.trim() || null
}

/**
 * Resolves the marketing audience id (creates one on first use when not configured).
 * Set RESEND_AUDIENCE_ID after the first create to avoid duplicate audiences.
 */
export async function ensureNewsletterAudienceId(resend: Resend): Promise<string | {error: string}> {
  const configured = process.env.RESEND_AUDIENCE_ID?.trim()
  if (configured) return configured

  if (cachedAudienceId) return cachedAudienceId

  const name = process.env.RESEND_AUDIENCE_NAME?.trim() || DEFAULT_AUDIENCE_NAME
  const {data: listData, error: listError} = await resend.audiences.list()
  if (listError) {
    return {error: listError.message || 'Failed to list Resend audiences'}
  }

  const existing = listData?.data?.find((audience) => audience.name === name)
  if (existing?.id) {
    cachedAudienceId = existing.id
    return existing.id
  }

  const {data: created, error: createError} = await resend.audiences.create({name})
  if (createError || !created?.id) {
    return {error: createError?.message || 'Failed to create Resend audience'}
  }

  cachedAudienceId = created.id
  console.info(
    `[newsletter] Created Resend audience "${name}" (${created.id}). Set RESEND_AUDIENCE_ID=${created.id} in your environment.`,
  )
  return created.id
}

export async function subscribeEmailToAudience(
  resend: Resend,
  audienceId: string,
  email: string,
): Promise<{ok: true} | {error: string}> {
  const normalized = email.trim().toLowerCase()

  const {error} = await resend.contacts.create({
    audienceId,
    email: normalized,
    unsubscribed: false,
  })

  if (!error) return {ok: true}

  if (error.name === 'validation_error' || error.message?.toLowerCase().includes('already')) {
    const {error: updateError} = await resend.contacts.update({
      audienceId,
      email: normalized,
      unsubscribed: false,
    })
    if (!updateError) return {ok: true}
    return {error: updateError.message || 'Failed to update contact'}
  }

  return {error: error.message || 'Failed to add contact'}
}
