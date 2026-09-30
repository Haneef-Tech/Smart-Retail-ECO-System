'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * App Router root error boundary. Reports to Sentry (no-op when SENTRY_DSN
 * is unset) and offers a retry without losing the session.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <p style={{ fontSize: 40, fontWeight: 900, color: '#E5E7EB' }}>Oops</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginTop: 8 }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
              Our team has been notified. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 16,
                padding: '10px 20px',
                borderRadius: 12,
                background: '#16A34A',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
