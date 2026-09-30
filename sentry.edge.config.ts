// Sentry edge runtime (middleware). Inert without SENTRY_DSN.
import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      delete event.user?.email
      delete event.user?.username
      return event;
    },
  })
}
