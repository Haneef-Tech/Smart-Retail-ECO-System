import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCV8Qam7NKLHKQOhpZTNDRlmMPLRdr3JNU',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'grj-dairy.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'grj-dairy',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'grj-dairy.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '608701607267',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:608701607267:web:ae3218c1b865c574897756',
}

function initFirebaseSafely(): { app: FirebaseApp; auth: Auth } {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    const auth = getAuth(app)
    return { app, auth }
  } catch (err) {
    // Prevent SSR / SSG build crashes if running without complete Firebase credentials
    return {
      app: {} as FirebaseApp,
      auth: {} as Auth,
    }
  }
}

const { app, auth } = initFirebaseSafely()

export { app, auth }
export default app
