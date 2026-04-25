// src/integrations/accounting/types.js
// ─────────────────────────────────────────────────────────────
// Shared types for the accounting integration layer.
// Providers translate these to their own codes internally.
// ─────────────────────────────────────────────────────────────

// Document types the app knows about (MVP set)
export const DOC_TYPE = {
  RECEIPT:         'receipt',         // קבלה
  INVOICE_RECEIPT: 'invoice_receipt', // חשבונית מס קבלה
}

export const DOC_TYPE_LABELS = {
  [DOC_TYPE.RECEIPT]:         'קבלה',
  [DOC_TYPE.INVOICE_RECEIPT]: 'חשבונית מס/קבלה',
}

// Payment methods — app-level keys. Provider maps to its own codes.
export const PAYMENT_METHOD = {
  CASH:          'cash',
  CHECK:         'check',
  CREDIT_CARD:   'credit_card',
  BANK_TRANSFER: 'bank_transfer',
  BIT:           'bit',
  PAYPAL:        'paypal',
  OTHER:         'other',
}

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHOD.CASH]:          'מזומן',
  [PAYMENT_METHOD.CHECK]:         'שיק',
  [PAYMENT_METHOD.CREDIT_CARD]:   'כרטיס אשראי',
  [PAYMENT_METHOD.BANK_TRANSFER]: 'העברה בנקאית',
  [PAYMENT_METHOD.BIT]:           'ביט',
  [PAYMENT_METHOD.PAYPAL]:        'פייפאל',
  [PAYMENT_METHOD.OTHER]:         'אחר',
}

// Provider keys
export const PROVIDER = {
  ICOUNT:  'icount',
  MORNING: 'morning',  // future
  EZCOUNT: 'ezcount',  // future
}

export const PROVIDER_LABELS = {
  [PROVIDER.ICOUNT]:  'iCount',
  [PROVIDER.MORNING]: 'Morning / חשבונית ירוקה',
  [PROVIDER.EZCOUNT]: 'EZcount',
}

// ─── Error class ─────────────────────────────────────────────
export class AccountingError extends Error {
  constructor(message, { code, provider, originalError } = {}) {
    super(message)
    this.name = 'AccountingError'
    this.code = code
    this.provider = provider
    this.originalError = originalError
  }
}
