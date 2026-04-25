// src/firebase/auth.js
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, setDoc, getDocFromServer, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'

// ─── Login ───────────────────────────────────────────────────
export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

// ─── Register ────────────────────────────────────────────────
export const registerWithEmail = async (email, password, displayName) => {
  let cred
  try {
    cred = await createUserWithEmailAndPassword(auth, email, password)
  } catch (err) {
    console.error('[registerWithEmail] createUserWithEmailAndPassword failed:', {
      code: err.code,
      message: err.message,
      email,
    })
    throw err
  }
  await updateProfile(cred.user, { displayName })
  // Create user document in Firestore
  await setDoc(doc(db, 'users', cred.user.uid), {
    profile: {
      name: displayName,
      email,
      createdAt: serverTimestamp(),
      trade: 'shower', // default trade
    },
    subscription: {
      plan: 'trial',
      status: 'active',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    },
    settings: {
      currency: 'ILS',
      language: 'he',
      defaultVAT: 17,
    },
  })
  return cred
}

// ─── Logout ──────────────────────────────────────────────────
export const logout = () => signOut(auth)

// ─── Password Reset ──────────────────────────────────────────
export const resetPassword = (email) => sendPasswordResetEmail(auth, email)

// ─── Fetch user profile ──────────────────────────────────────
export const fetchUserProfile = async (uid) => {
  const snap = await getDocFromServer(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

// ─── Auth observer ───────────────────────────────────────────
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback)
