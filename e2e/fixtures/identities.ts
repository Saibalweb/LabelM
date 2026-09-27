// Per-run identities for the auth E2E suite.
//
// Every non-owner identity uses a unique `@yopmail.com` address so:
//   * the invite Edge Function's real SMTP send never fails on an invalid
//     domain, and
//   * the Step 2 (real SMTP) suite can read the same mailbox if needed.
// Never reuse an address across runs — YOPmail inboxes persist forever.

import { OWNER_EMAIL, OWNER_PASSWORD } from '../helpers'

export { OWNER_EMAIL, OWNER_PASSWORD }

export const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const TEST_PASSWORD = 'E2eTest123!'

/** Prefix shared by every address created in this run (used for cleanup). */
export const EMAIL_PREFIX = `labelm-e2e-${RUN_ID}-`

/** Unique, SMTP-deliverable test address for this run. */
export function testEmail(tag: string): string {
  return `${EMAIL_PREFIX}${tag}@yopmail.com`
}
