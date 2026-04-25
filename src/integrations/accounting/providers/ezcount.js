// src/integrations/accounting/providers/ezcount.js
// ─────────────────────────────────────────────────────────────
// EZcount (Easy Count) adapter — api.ezcount.co.il
//
// Auth: api_key + api_email
// Endpoints: createDoc, createClient, sendDocumentEmail
//
// Only the 4 MVP operations:
//   createCustomer, createReceipt, createInvoiceReceipt, sendDocument
// ─────────────────────────────────────────────────────────────

import { AccountingError, PAYMENT_METHOD, DOC_TYPE, PROVIDER } from '../types'

const BASE = 'https://api.ezcount.co.il/api'

// EZcount document type codes
const DOC_CODE = {
  [DOC_TYPE.RECEIPT]:         400,  // קבלה
  [DOC_TYPE.INVOICE_RECEIPT]: 320,  // חשבונית מס-קבלה
}

// EZcount payment method codes
const PAYMENT_CODE = {
  [PAYMENT_METHOD.CASH]:          1,
  [PAYMENT_METHOD.CHECK]:         2,
  [PAYMENT_METHOD.CREDIT_CARD]:   3,
  [PAYMENT_METHOD.BANK_TRANSFER]: 4,
  [PAYMENT_METHOD.BIT]:           11,
  [PAYMENT_METHOD.PAYPAL]:        10,
  [PAYMENT_METHOD.OTHER]:         5,
}

// ─── Auth payload ────────────────────────────────────────────
function authPayload(credentials) {
  return {
    api_key:   credentials.apiKey,
    api_email: credentials.apiEmail,
    ...(credentials.developerEmail ? { developer_email: credentials.developerEmail } : {}),
  }
}

// ─── HTTP call ───────────────────────────────────────────────
async function call(endpoint, payload, credentials) {
  const body = { ...authPayload(credentials), ...payload }
  let res
  try {
    res = await fetch(`${BASE}/${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch (err) {
    throw new AccountingError('בעיית רשת בחיבור ל-EZcount', {
      code: 'network_error', provider: PROVIDER.EZCOUNT, originalError: err,
    })
  }
  let data
  try {
    data = await res.json()
  } catch (err) {
    throw new AccountingError('תגובה לא תקינה מ-EZcount', {
      code: 'bad_response', provider: PROVIDER.EZCOUNT, originalError: err,
    })
  }
  if (!res.ok || data?.success === false || data?.success === 'false') {
    throw new AccountingError(
      data?.errorMessage || data?.error || `שגיאת EZcount (${res.status})`,
      { code: data?.errorCode || 'api_error', provider: PROVIDER.EZCOUNT, originalError: data },
    )
  }
  return data
}

// ─── Connection test ─────────────────────────────────────────
// EZcount has no dedicated "ping" — we call createClient with a dry-run payload.
// Safer approach: try getting client list or account info. Using a minimal-fail call.
export async function testConnection(credentials) {
  // Try a lightweight query — listing one client
  await call('getClients', { count: 1 }, credentials)
  return true
}

// ─── Create customer ─────────────────────────────────────────
export async function createCustomer({ name, phone, email, address, city, taxId }, credentials) {
  const data = await call('createClient', {
    name,
    phone:   phone   || '',
    email:   email   || '',
    address: address || '',
    city:    city    || '',
    taxId:   taxId   || '',
  }, credentials)

  return {
    externalId: String(data.client_id || data.id || data.clientId || ''),
    number:     String(data.client_id || data.id || ''),
    raw:        data,
  }
}

// ─── Create document (receipt / invoice-receipt) ─────────────
async function createDocument(docType, { clientExternalId, clientName, clientEmail, clientPhone, items, payments, notes }, credentials) {
  if (!items?.length)    throw new AccountingError('אין פריטים ליצירת מסמך',    { code: 'no_items',    provider: PROVIDER.EZCOUNT })
  if (!payments?.length) throw new AccountingError('אין תשלומים ליצירת מסמך', { code: 'no_payments', provider: PROVIDER.EZCOUNT })

  const payload = {
    type:     DOC_CODE[docType],
    customer: {
      ...(clientExternalId ? { id: clientExternalId } : {}),
      name:  clientName || 'לקוח',
      email: clientEmail || '',
      phone: clientPhone || '',
    },
    items: items.map(it => ({
      description: it.description,
      quantity:    Number(it.qty)       || 1,
      price:       Number(it.unitPrice) || 0,
      currency:    'ILS',
      vatType:     'INC',  // price includes VAT (change if needed)
    })),
    payment: payments.map(p => ({
      payment_type: PAYMENT_CODE[p.method] || PAYMENT_CODE[PAYMENT_METHOD.OTHER],
      sum:          Number(p.amount) || 0,
      ...(p.date        ? { date:          p.date }        : {}),
      ...(p.ccNum       ? { cc_number:     p.ccNum }       : {}),
      ...(p.chequeNum   ? { cheque_number: p.chequeNum }   : {}),
      ...(p.bankAccount ? { bank_account:  p.bankAccount } : {}),
    })),
    ...(notes ? { comment: notes } : {}),
    autoSend: false,  // app decides when to send
  }

  const data = await call('createDoc', payload, credentials)

  return {
    documentId:     String(data.doc_uuid || data.docUUID || data.doc_number || ''),
    documentNumber: String(data.doc_number || data.docNumber || ''),
    pdfUrl:         data.pdf_link || data.pdfUrl || data.doc_url || '',
    raw:            data,
  }
}

export async function createReceipt(data, credentials) {
  return createDocument(DOC_TYPE.RECEIPT, data, credentials)
}

export async function createInvoiceReceipt(data, credentials) {
  return createDocument(DOC_TYPE.INVOICE_RECEIPT, data, credentials)
}

// ─── Send document ───────────────────────────────────────────
export async function sendDocument({ documentId, method, to }, credentials) {
  const payload = {
    doc_uuid: documentId,
    ...(method === 'email' ? { email: to } : {}),
    ...(method === 'sms'   ? { phone: to } : {}),
  }
  await call('sendDocumentEmail', payload, credentials)
  return true
}

// ─── Provider info ───────────────────────────────────────────
export const providerInfo = {
  key:   PROVIDER.EZCOUNT,
  label: 'EZcount',
  credentialFields: [
    { name: 'apiKey',         label: 'API Key',                type: 'password' },
    { name: 'apiEmail',       label: 'אימייל החשבון ב-EZcount', type: 'text'     },
    { name: 'developerEmail', label: 'אימייל מפתח (לא חובה)',   type: 'text', optional: true },
  ],
  credentialsHint: 'צור API Key מדף "הגדרות > API" ב-EZcount. האימייל הוא של חשבון EZcount.',
}
