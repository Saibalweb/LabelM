// Global setup: guard auth E2E runs so they only ever touch staging.
// Auth specs mutate real users/invites, so we refuse to run when the project
// ref does not match E2E_STAGING_REF (when that guard is configured).

import { assertStaging, hasServiceRole, PROJECT_REF } from './admin'

export default function globalSetup(): void {
  if (!hasServiceRole) {
    console.warn(
      '[auth-e2e] SUPABASE_SERVICE_ROLE_KEY not set — auth specs will be skipped (business specs still run).'
    )
    return
  }
  assertStaging()
  console.log(`[auth-e2e] staging project ref: ${PROJECT_REF || '(unknown)'}`)
}
