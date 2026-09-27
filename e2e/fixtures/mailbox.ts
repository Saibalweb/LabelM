// YOPmail reader for the real-SMTP (Tier 2) auth suite.
//
// YOPmail inboxes are public and persist forever, so every run uses a fresh
// unique address (see identities.ts) and never reuses one. The `easy-yopmail`
// client mirrors the web UI's cookie/token handshake.

import easyYopmail from 'easy-yopmail'

export type MailKind = 'invite' | 'magiclink' | 'recovery'

export interface DeliveredMail {
  id: string
  from: string
  subject: string
  html: string
}

/** YOPmail login is the local part of the address. */
export function yopmailLogin(email: string): string {
  return email.split('@')[0]
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Poll a YOPmail inbox until a matching message arrives.
 * Throws on timeout with the last transport error (if any) for debugging.
 */
export async function waitForEmail(
  email: string,
  opts: { subjectIncludes?: string; fromIncludes?: string; timeoutMs?: number; pollMs?: number } = {}
): Promise<DeliveredMail> {
  const login = yopmailLogin(email)
  const timeoutMs = opts.timeoutMs ?? 75_000
  const pollMs = opts.pollMs ?? 6_000
  const deadline = Date.now() + timeoutMs
  let lastError: unknown = null

  while (Date.now() < deadline) {
    try {
      const inbox = await easyYopmail.getInbox(login)
      // YOPmail returns a negative total for an empty inbox AND when its
      // anti-bot throttles the handshake; either way, keep polling.
      const messages = inbox && inbox.totalEmails >= 0 ? (inbox.inbox ?? []) : []
      const match = messages.find((m) => {
        const subjectOk =
          !opts.subjectIncludes ||
          (m.subject ?? '').toLowerCase().includes(opts.subjectIncludes.toLowerCase())
        const fromOk =
          !opts.fromIncludes ||
          (m.from ?? '').toLowerCase().includes(opts.fromIncludes.toLowerCase())
        return subjectOk && fromOk
      })
      if (match) {
        const message = await easyYopmail.readMessage(login, match.id, { format: 'html' })
        return {
          id: match.id,
          from: message.from ?? match.from ?? '',
          subject: message.submit ?? match.subject ?? '',
          html: message.content ?? '',
        }
      }
      if (inbox && inbox.totalEmails < 0) {
        lastError = new Error('YOPmail returned a negative inbox total (empty or throttled)')
      }
    } catch (err) {
      lastError = err
    }
    await delay(pollMs)
  }

  const filter = opts.subjectIncludes ? ` (subject ~ "${opts.subjectIncludes}")` : ''
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for email to ${email}${filter}` +
      (lastError ? ` — last error: ${String(lastError)}` : '')
  )
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) => decodeHtml(m[1]))
}

const MATCHERS: Record<MailKind, (url: string) => boolean> = {
  invite: (url) => url.includes('token_hash=') && url.includes('type=invite'),
  magiclink: (url) => /\/auth\/v1\/verify/.test(url) && url.includes('type=magiclink'),
  recovery: (url) => /\/auth\/v1\/verify/.test(url) && url.includes('type=recovery'),
}

/** Extract the actionable link from a delivered email body. */
export function extractLink(html: string, kind: MailKind): string {
  const found = hrefs(html).find(MATCHERS[kind])
  if (!found) throw new Error(`No ${kind} link found in the email body`)
  return found
}
