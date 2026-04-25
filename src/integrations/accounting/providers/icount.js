// src/integrations/accounting/providers/icount.js
// ─────────────────────────────────────────────────────────────
// iCount (api.icount.co.il) adapter.
//
// Auth: companyId + user + password, or preferred: api_token
// Base: https://api.icount.co.il/api/v3.php/?method=<METHOD>
//
// Only the 4 MVP operations are implemented here:
//   createCustomer, createReceipt, createInvoiceReceipt, sendDocument
// ─────────────────────────────────────────────────────────────

import { AccountingError, PAYMENT_METHOD, DOC_TYPE, PROVIDER } from '../types'

const BASE = 'https://api.icount.co.il/api/v3.php'

// iCount payment method codes
const PAYMENT_CODE = {
  [PAYMENT_METHOD.CASH]:          1,
  [PAYMENT_METHOD.CHECK]:         2,
  [PAYMENT_METHOD.CREDIT_CARD]:   3,
  [PAYMENT_METHOD.BANK_TRANSFER]: 4,
  [PAYMENT_METHOD.BIT]:           6,
  [PAYMENT_METHOD.PAYPAL]:        7,
  [PAYMENT_METHOD.OTHER]:         10,
}

// iCount document type codes
const DOC_CODE = {
  [DOC_TYPE.RECEIPT]:         'receipt',
  [DOC_TYPE.INVOICE_RECEIPT]: 'invrec',
}

// ─── Auth payload builder ─────────────────────────────────────
function authPayload(credentials) {
  if (credentials.apiToken) {
    return { api_token: credentials.apiToken }
  }
  return {
    cid:  credentials.companyId,
    user: credentials.username,
    pass: credentials.password,
  }
}

// ─── Low-level HTTP call ──────────────────────────────────────
async function call(method, payload, credentials) {
  const body = { ...authPayload(credentials), ...payload }
  let res
  try {
    res = await fetch(`${BASE}/?method=${method}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch (err) {
    throw new AccountingError('בעיית רשת בחיבור ל-iCount', {
      code: 'network_error', provider: PROVIDER.ICOUNT, originalError: err,
    })
  }
  let data
  try {
    data = await res.json()
  } catch (err) {
    throw new AccountingError('תגובה לא תקינה מ-iCount', {
      code: 'bad_response', provider: PROVIDER.ICOUNT, originalError: err,
    })
  }
  if (!res.ok || data?.status === false) {
    throw new AccountingError(
      data?.error_description || data?.error || `שגיאת iCount (${res.status})`,
      { code: data?.error || 'api_error', provider: PROVIDER.ICOUNT, originalError: data },
    )
  }
  return data
}

// ─── Connection test ──────────────────────────────────────────
export async function testConnection(credentials) {
  // Lightweight ping — iCount's auth_test method validates credentials
  await call('auth_test', {}, credentials)
  return true
}

// ─── Create customer ──────────────────────────────────────────
export async function createCustomer({ name, phone, email, address, city, taxId }, credentials) {
  const data = await call('client/create_or_update', {
    client_name: name,
    email:       email || '',
    phone:       phone || '',
    address:     address || '',
    city:        city || '',
    vat_id:      taxId || '',
  }, credentials)

  return {
    externalId: String(data.client_id || data.clientid || ''),
    number:     String(data.client_id || data.clientid || ''),
    raw:        data,
  }
}

// ─── Create a document (receipt or invoice-receipt) ───────────
async function createDocument(docType, { clientExternalId, clientName, items, payments, notes }, credentials) {
  if (!items?.length)    throw new AccountingError('אין פריטים ליצירת מסמך',     { code: 'no_items',    provider: PROVIDER.ICOUNT })
  if (!payments?.length) throw new AccountingError('אין תשלומים ליצירת מסמך',  { code: 'no_payments', provider: PROVIDER.ICOUNT })

  const payload = {
    doctype: DOC_CODE[docType],
    ...(clientExternalId ? { client_id: clientExternalId } : { client_name: clientName || 'לקוח' }),
    items: items.map(it => ({
      description: it.description,
      quantity:    Number(it.qty)    || 1,
      unitprice:   Number(it.unitPrice) || 0,
    })),
    ...paymentsPayload(payments),
    ...(notes ? { hwc: notes } : {}),  // hwc = hashavshevet/hearot comment
    // send_email: 0,  // do not auto-send; app decides
  }

  const data = await call('doc/create', payload, credentials)

  return {
    documentId:     String(data.doc_num || data.docnum || data.docid || ''),
    documentNumber: String(data.doc_num || data.docnum || ''),
    pdfUrl:         data.doc_url || data.pdf_link || '',
    raw:            data,
  }
}

function paymentsPayload(payments) {
  // iCount accepts a flat list under `payments` or, for convenience, specific fields.
  return {
    payments: payments.map(p => ({
      payment_type_id: PAYMENT_CODE[p.method] || PAYMENT_CODE[PAYMENT_METHOD.OTHER],
      sum:             Number(p.amount) || 0,
      ...(p.date        ? { payment_date: p.date } : {}),
      ...(p.ccNum       ? { cc_number:    p.ccNum } : {}),
      ...(p.chequeNum   ? { cheque_num:   p.chequeNum } : {}),
      ...(p.bankAccount ? { bank_account: p.bankAccount } : {}),
    })),
  }
}

// ─── Public helpers for the unified API ───────────────────────
export async function createReceipt(data, credentials) {
  return createDocument(DOC_TYPE.RECEIPT, data, credentials)
}

export async function createInvoiceReceipt(data, credentials) {
  return createDocument(DOC_TYPE.INVOICE_RECEIPT, data, credentials)
}

// ─── Send an existing document ────────────────────────────────
// method: 'email' | 'sms' | 'whatsapp'
export async function sendDocument({ documentId, documentType, method, to }, credentials) {
  const payload = {
    doctype: DOC_CODE[documentType] || 'receipt',
    docnum:  documentId,
    ...(method === 'email' ? { email: to } : {}),
    ...(method === 'sms'   ? { sms:   to } : {}),
  }
  await call('doc/send', payload, credentials)
  return true
}

// ─── Provider capability flag ─────────────────────────────────
export const providerInfo = {
  key:   PROVIDER.ICOUNT,
  label: 'iCount',
  credentialFields: [
    { name: 'apiToken',  label: 'API Token (מומלץ)', type: 'password', optional: true },
    { name: 'companyId', label: 'מזהה חברה (cid)',   type: 'text',     optional: true },
    { name: 'username',  label: 'שם משתמש',            type: 'text',     optional: true },
    { name: 'password',  label: 'סיסמה',                type: 'password', optional: true },
  ],
  credentialsHint: 'הזן API Token מדף "הגדרות API" ב-iCount, או לחלופין cid + משתמש + סיסמה.',
}
