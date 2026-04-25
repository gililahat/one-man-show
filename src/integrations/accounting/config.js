// src/integrations/accounting/config.js
// ─────────────────────────────────────────────────────────────
// Reads the user's accounting credentials from their profile.
// Credentials live at: users/{uid} → settings.accounting
// ─────────────────────────────────────────────────────────────
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { PROVIDER } from './types'

const EMPTY_CONFIG = { provider: null, credentials: {}, enabled: false }

// Load accounting config for this user. Returns { provider, credentials, enabled }.
export async function loadAccountingConfig(uid) {
  if (!uid) return EMPTY_CONFIG
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return EMPTY_CONFIG
  const data = snap.data()
  const acc  = data?.settings?.accounting || {}
  return {
    provider:    acc.provider    || null,
    credentials: acc.credentials || {},
    enabled:     !!acc.enabled,
  }
}

// Save/update accounting config.
export async function saveAccountingConfig(uid, { provider, credentials, enabled }) {
  await updateDoc(doc(db, 'users', uid), {
    'settings.accounting': { provider, credentials, enabled: !!enabled },
  })
}

// List of supported providers (in order of preference — first is default).
export const SUPPORTED_PROVIDERS = [PROVIDER.EZCOUNT, PROVIDER.ICOUNT]
