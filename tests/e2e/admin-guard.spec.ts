import { expect, test } from '@playwright/test'

/**
 * Non-admin users must be blocked from /admin.
 * - Anonymous visitors are redirected to /auth/login by middleware.
 * - Visitors with a non-privileged session cookie are bounced to the
 *   storefront (/) by the admin layout's client-side role gate.
 */
test('anonymous visitor is redirected away from /admin', async ({ page }) => {
  await page.goto('/admin')
  await page.waitForURL('**/auth/login**')
  expect(page.url()).toContain('/auth/login')
})

test('non-admin session is blocked from /admin', async ({ page, context }) => {
  // A session cookie that maps to no ADMIN/STAFF role server-side.
  await context.addCookies([
    {
      name: 'sr-session',
      value: 'e2e-non-admin-session',
      domain: 'localhost',
      path: '/',
    },
  ])
  await page.goto('/admin')
  // Either the middleware login redirect or the layout's "/" bounce —
  // both prove a non-admin never sees the admin dashboard.
  await page.waitForFunction(() => !window.location.pathname.startsWith('/admin'))
  expect(page.url()).not.toContain('/admin')
})
