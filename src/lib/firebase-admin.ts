import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const hasAdminKeys =
  Boolean(process.env.FIREBASE_ADMIN_PROJECT_ID) &&
  Boolean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL) &&
  Boolean(process.env.FIREBASE_ADMIN_PRIVATE_KEY)

if (!getApps().length && hasAdminKeys) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  } catch (error) {
    console.warn('[Firebase Admin Warning] Initialization skipped:', error)
  }
}

export const adminAuth = getApps().length > 0 ? getAuth() : (null as unknown as ReturnType<typeof getAuth>)
