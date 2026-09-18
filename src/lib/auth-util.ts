import { NextRequest } from 'next/server'

export interface ExtractedAuth {
  uid: string | null
  email: string | null
  name: string | null
  rawToken: string | null
}

export function extractAuthFromRequest(req: NextRequest): ExtractedAuth {
  let rawToken: string | null = null

  // 1. Authorization header (Bearer <token>)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    rawToken = authHeader.slice(7).trim()
  }

  // 2. Cookie fallback (firebase-token)
  if (!rawToken) {
    rawToken = req.cookies.get('firebase-token')?.value?.trim() || null
  }

  // 3. Query param fallback (?token=... or ?uid=...)
  if (!rawToken) {
    try {
      const url = new URL(req.url)
      rawToken = url.searchParams.get('token') || url.searchParams.get('uid')
    } catch {
      // ignore
    }
  }

  if (!rawToken) {
    return { uid: null, email: null, name: null, rawToken: null }
  }

  // Handle known admin token aliases
  if (
    rawToken === 'admin-token-haneef123' ||
    rawToken === 'admin-uid-haneef123' ||
    rawToken === 'admin-uid'
  ) {
    return {
      uid: 'admin-uid-haneef123',
      email: 'aluruhaneef1@gmail.com',
      name: 'Haneef Admin',
      rawToken,
    }
  }

  // If token is a Firebase JWT (header.payload.signature)
  if (rawToken.includes('.')) {
    try {
      const parts = rawToken.split('.')
      if (parts.length === 3) {
        // Base64Url decode payload
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        while (base64.length % 4) {
          base64 += '='
        }
        const decodedString = Buffer.from(base64, 'base64').toString('utf8')
        const payload = JSON.parse(decodedString)

        const uid = payload.user_id || payload.sub || payload.uid || null
        const email = payload.email || null
        const name = payload.name || payload.display_name || null

        return {
          uid: uid || rawToken,
          email,
          name,
          rawToken,
        }
      }
    } catch {
      // Fall through to plain token
    }
  }

  return {
    uid: rawToken,
    email: null,
    name: null,
    rawToken,
  }
}

