// RBAC capability matrix (authPlan.md §3) asserted at the UI level.
//
// Runs against staging with VITE_TRIAL_MODE=false (so /team renders the real
// Team page). Uses the fixed owner/admin/staff accounts from the gitignored
// .env (ADMIN_EMAIL/ADMIN_PASSWORD, STAFF_EMAIL/STAFF_PASSWORD); the suite
// skips when those are not set.
//
// Covered: admin-only routes (/invoice/new, /team), settings edit gating,
// invoice generation, customer archive/restore management, and the owner-only
// "invite/promote admins" rule. Payment-delete gating (owner/admin) needs a
// seeded invoice+payment and is left for a follow-up.

import { expect, test, type Page } from '@playwright/test'
import { envValue } from './fixtures/env'
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  login,
  OWNER_EMAIL,
  OWNER_PASSWORD,
  STAFF_EMAIL,
  STAFF_PASSWORD,
} from './helpers'

type RoleName = 'owner' | 'admin' | 'staff'

const CREDS: Record<RoleName, { email: string; password: string }> = {
  owner: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
  admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  staff: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
}

const configured = (['owner', 'admin', 'staff'] as RoleName[]).every(
  (role) => CREDS[role].email && CREDS[role].password
)
const MISSING = 'Set ADMIN_EMAIL/ADMIN_PASSWORD + STAFF_EMAIL/STAFF_PASSWORD in .env to run the RBAC matrix'
const trialMode = envValue('VITE_TRIAL_MODE') === 'true'
const NEEDS_FULL_AUTH = 'needs VITE_TRIAL_MODE=false for the real Team page'

test.describe.configure({ mode: 'serial' })

test.describe('RBAC capability matrix', () => {
  test.skip(!configured, MISSING)

  async function signIn(page: Page, role: RoleName) {
    await login(page, CREDS[role])
  }

  // -- Admin-only routes: /invoice/new (generate) + /team ---------------------
  for (const role of ['owner', 'admin'] as const) {
    test(`${role} can open admin-only routes`, async ({ page }) => {
      await signIn(page, role)

      await page.goto('/invoice/new')
      await expect(page).not.toHaveURL(/\/unauthorized/)
      await expect(
        page.getByRole('main').getByRole('heading', { name: 'Generate Invoice', exact: true })
      ).toBeVisible()

      await page.goto('/team')
      await expect(page).not.toHaveURL(/\/unauthorized/)
      await expect(
        page.getByRole('main').getByRole('heading', { name: 'Team', exact: true })
      ).toBeVisible()
    })
  }

  test('staff is blocked from admin-only routes', async ({ page }) => {
    await signIn(page, 'staff')
    for (const path of ['/invoice/new', '/team']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/unauthorized/)
      await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible()
    }
  })

  // -- Settings: view-only (staff) vs editable (owner/admin) ------------------
  test('staff sees settings as view-only (no team link)', async ({ page }) => {
    await signIn(page, 'staff')
    await page.goto('/settings')
    await expect(page.getByText(/view-only access/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /Team & roles/i })).toHaveCount(0)
  })

  for (const role of ['owner', 'admin'] as const) {
    test(`${role} can edit settings`, async ({ page }) => {
      await signIn(page, role)
      await page.goto('/settings')
      await expect(page.getByText(/view-only access/i)).toHaveCount(0)
      await expect(page.getByRole('link', { name: /Team & roles/i })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit', exact: true }).first()).toBeVisible()
    })
  }

  // -- Invoices: generate gating ----------------------------------------------
  for (const role of ['owner', 'admin'] as const) {
    test(`${role} can generate invoices`, async ({ page }) => {
      await signIn(page, role)
      await page.goto('/invoice')
      await expect(
        page.getByRole('button', { name: /Generate (Invoice|for All)/ }).first()
      ).toBeVisible()
    })
  }

  test('staff cannot generate invoices', async ({ page }) => {
    await signIn(page, 'staff')
    await page.goto('/invoice')
    await expect(page.getByRole('button', { name: /Generate (Invoice|for All)/ })).toHaveCount(0)
  })

  // -- Customers: archive/restore management ----------------------------------
  for (const role of ['owner', 'admin'] as const) {
    test(`${role} can manage archived customers`, async ({ page }) => {
      await signIn(page, role)
      await page.goto('/customers')
      await expect(
        page.getByRole('main').getByRole('heading', { name: 'Deleted customers' })
      ).toBeVisible()
    })
  }

  test('staff cannot manage archived customers', async ({ page }) => {
    await signIn(page, 'staff')
    await page.goto('/customers')
    await expect(page.getByRole('main').getByRole('heading', { name: 'Deleted customers' })).toHaveCount(0)
  })

  // -- Team UI: only the owner may invite/promote admins ----------------------
  test('admin can invite staff but not admins', async ({ page }) => {
    test.skip(trialMode, NEEDS_FULL_AUTH)
    await signIn(page, 'admin')
    await page.goto('/team')
    await page.getByRole('button', { name: 'Invite member' }).click()

    const role = page.getByLabel('Workspace role')
    await expect(role).toBeVisible()
    await expect(role.locator('option[value="staff"]')).toHaveCount(1)
    await expect(role.locator('option[value="admin"]')).toHaveCount(0)
    await expect(page.getByText('Only the workspace owner can grant the Admin role.')).toBeVisible()
  })

  test('owner can invite admins', async ({ page }) => {
    test.skip(trialMode, NEEDS_FULL_AUTH)
    await signIn(page, 'owner')
    await page.goto('/team')
    await page.getByRole('button', { name: 'Invite member' }).click()

    const role = page.getByLabel('Workspace role')
    await expect(role.locator('option[value="staff"]')).toHaveCount(1)
    await expect(role.locator('option[value="admin"]')).toHaveCount(1)
    await expect(page.getByText('Only the workspace owner can grant the Admin role.')).toHaveCount(0)
  })
})
