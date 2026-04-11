// src/firebase/config.js
// ─────────────────────────────────────────────────────────────
// Replace the values below with your ONE MAN SHOW Firebase project.
// DO NOT use Lahat Design Pro credentials here.
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getAuth }       from 'firebase/auth'
import { getFirestore }  from 'firebase/firestore'
import { getStorage }    from 'firebase/storage'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app     = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)
export const storage = getStorage(app)

export default app
