// Sentry browser SDK. Inert when no DSN is configured (self-hosted/dev default).
import * as Sentry from '@sentry/nextjs'

// NEXT_PUBLIC_SENTRY_DSN exposes the DSN to the browser bundle; SENTRY_DSN is
// the canonical server var (inlined at build time when set). Either enables SDK.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Never send email addresses: tag the user's ROLE only for scoping.
    beforeSend(event) {
      delete event.user?.email
      delete event.user?.username
      return event;
    },
  })

  // Attach role (never email) so admin-vs-customer errors can be told apart.
  fetch('/api/auth/me', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { role?: string } | null) => {
      if (d?.role) Sentry.getCurrentScope().setTag('user_role', d.role)
    })
    .catch(() => {
      // Auth endpoint unreachable — error reporting still works, just untagged.
    })
}
