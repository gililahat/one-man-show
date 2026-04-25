// src/integrations/accounting/index.js
// ─────────────────────────────────────────────────────────────
// Unified accounting API for the app.
// Screens call these — they never talk to providers directly.
// ─────────────────────────────────────────────────────────────
import { loadAccountingConfig } from './config'
import { AccountingError, PROVIDER } from './types'
import * as icount  from './providers/icount'
import * as ezcount from './providers/ezcount'

export * from './types'
export { loadAccountingConfig, saveAccountingConfig, SUPPORTED_PROVIDERS } from './config'

// Provider registry — add new providers here as they're built.
const ADAPTERS = {
  [PROVIDER.EZCOUNT]: ezcount,
  [PROVIDER.ICOUNT]:  icount,
}

export const PROVIDER_INFOS = {
  [PROVIDER.EZCOUNT]: ezcount.providerInfo,
  [PROVIDER.ICOUNT]:  icount.providerInfo,
}

// ─── Resolve the active adapter for this user ────────────────
async function getAdapter(uid) {
  const cfg = await loadAccountingConfig(uid)
  if (!cfg.enabled || !cfg.provider) {
    throw new AccountingError('החיבור לחשבונאות לא מופעל', { code: 'not_enabled' })
  }
  const adapter = ADAPTERS[cfg.provider]
  if (!adapter) {
    throw new AccountingError(`ספק החשבונאות ${cfg.provider} אינו נתמך`, { code: 'unsupported_provider' })
  }
  return { adapter, credentials: cfg.credentials, provider: cfg.provider }
}

// Is the user's accounting integration enabled and configured?
export async function isAccountingEnabled(uid) {
  try {
    const cfg = await loadAccountingConfig(uid)
    return !!(cfg.enabled && cfg.provider && Object.keys(cfg.credentials || {}).length > 0)
  } catch { return false }
}

// ─── Unified API ─────────────────────────────────────────────

export async function testConnection(uid, provider, credentials) {
  const adapter = ADAPTERS[provider]
  if (!adapter) throw new AccountingError('ספק לא נתמך', { code: 'unsupported_provider' })
  return adapter.testConnection(credentials)
}

export async function createCustomer(uid, clientData) {
  const { adapter, credentials, provider } = await getAdapter(uid)
  const result = await adapter.createCustomer(clientData, credentials)
  return { ...result, provider }
}

export async function createReceipt(uid, data) {
  const { adapter, credentials, provider } = await getAdapter(uid)
  const result = await adapter.createReceipt(data, credentials)
  return { ...result, provider }
}

export async function createInvoiceReceipt(uid, data) {
  const { adapter, credentials, provider } = await getAdapter(uid)
  const result = await adapter.createInvoiceReceipt(data, credentials)
  return { ...result, provider }
}

export async function sendDocument(uid, { documentId, documentType, method, to }) {
  const { adapter, credentials } = await getAdapter(uid)
  return adapter.sendDocument({ documentId, documentType, method, to }, credentials)
}
