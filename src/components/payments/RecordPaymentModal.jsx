// src/components/payments/RecordPaymentModal.jsx
// Reusable modal — records a payment + issues an accounting document (receipt / invoice-receipt).
import { useState } from 'react'
import {
  createReceipt, createInvoiceReceipt, sendDocument,
  DOC_TYPE, DOC_TYPE_LABELS,
  PAYMENT_METHOD, PAYMENT_METHOD_LABELS,
  isAccountingEnabled,
} from '@/integrations/accounting'
import useToastStore from '@/store/toastStore'

export default function RecordPaymentModal({
  uid,
  quote,      // { id, clientName, clientPhone, clientEmail, result, items, accounting? }
  clientExternalId, // optional — if client was synced to accounting, their external id
  onSaved,    // (paymentRecord) => void
  onClose,
}) {
  const addToast = useToastStore(s => s.addToast)

  const [amount,    setAmount]    = useState(quote?.result?.total || '')
  const [method,    setMethod]    = useState(PAYMENT_METHOD.BANK_TRANSFER)
  const [docType,   setDocType]   = useState(DOC_TYPE.INVOICE_RECEIPT)
  const [notes,     setNotes]     = useState('')
  const [ccNum,     setCcNum]     = useState('')
  const [chequeNum, setChequeNum] = useState('')
  const [sendAfter, setSendAfter] = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) { setError('יש להזין סכום חיובי'); return }

    setSaving(true); setError('')
    try {
      const acctEnabled = await isAccountingEnabled(uid)
      let docResult = null

      if (acctEnabled) {
        const payload = {
          clientExternalId,
          clientName: quote.clientName || '',
          items:      buildItemsFromQuote(quote, amt),
          payments: [{
            method, amount: amt,
            date:      new Date().toISOString().slice(0, 10),
            ccNum:     ccNum      || undefined,
            chequeNum: chequeNum || undefined,
          }],
          notes: notes || undefined,
        }

        docResult = docType === DOC_TYPE.INVOICE_RECEIPT
          ? await createInvoiceReceipt(uid, payload)
          : await createReceipt(uid, payload)

        // Optional send
        if (sendAfter && docResult.documentId && quote.clientEmail) {
          try {
            await sendDocument(uid, {
              documentId:   docResult.documentId,
              documentType: docType,
              method:       'email',
              to:           quote.clientEmail,
            })
          } catch (err) {
            console.error('[accounting] send failed:', err)
            addToast?.('המסמך הונפק אך השליחה נכשלה', 'warning')
          }
        }
      }

      // Build payment record for the app
      const record = {
        amount: amt,
        method,
        date:   new Date().toISOString(),
        notes,
        type:   docType,
        accounting: docResult ? {
          documentId:     docResult.documentId,
          documentNumber: docResult.documentNumber,
          pdfUrl:         docResult.pdfUrl,
          provider:       docResult.provider,
          issuedAt:       new Date().toISOString(),
        } : null,
      }

      onSaved(record)
      addToast?.(
        acctEnabled
          ? `תשלום נרשם והמסמך הונפק (${docResult?.documentNumber || ''})`
          : 'תשלום נרשם (חיבור חשבונאות לא פעיל — לא הונפק מסמך)',
        'success'
      )
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.message || 'שגיאה ברישום התשלום')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-200 rounded-2xl shadow-modal w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 border border-surface-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink">רישום תשלום</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-300">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">סכום (₪)</label>
            <input type="number" min={1} className="input text-center font-mono" dir="ltr"
                   value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div>
            <label className="label">אמצעי תשלום</label>
            <select className="input text-sm" value={method} onChange={e => setMethod(e.target.value)}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) =>
                <option key={k} value={k}>{v}</option>
              )}
            </select>
          </div>

          {method === PAYMENT_METHOD.CREDIT_CARD && (
            <div>
              <label className="label">4 ספרות אחרונות</label>
              <input className="input text-sm" dir="ltr" maxLength={4}
                     value={ccNum} onChange={e => setCcNum(e.target.value)} />
            </div>
          )}
          {method === PAYMENT_METHOD.CHECK && (
            <div>
              <label className="label">מספר שיק</label>
              <input className="input text-sm" dir="ltr"
                     value={chequeNum} onChange={e => setChequeNum(e.target.value)} />
            </div>
          )}

          <div>
            <label className="label">סוג מסמך</label>
            <select className="input text-sm" value={docType} onChange={e => setDocType(e.target.value)}>
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) =>
                <option key={k} value={k}>{v}</option>
              )}
            </select>
          </div>

          <div>
            <label className="label">הערות</label>
            <textarea className="input text-sm resize-none" rows={2}
                      value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {quote?.clientEmail && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 rounded accent-brand-400"
                     checked={sendAfter} onChange={e => setSendAfter(e.target.checked)} />
              <span className="text-sm text-ink">שלח את המסמך ללקוח במייל ({quote.clientEmail})</span>
            </label>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'מנפיק...' : 'רשום והנפק'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Build accounting line items from a quote + optionally override amount (partial payment)
function buildItemsFromQuote(quote, overrideAmount) {
  const title = quote?.projectName || quote?.title || 'הצעת מחיר'
  const total = quote?.result?.total || 0

  // If paying the full amount, use itemized breakdown if available
  if (Math.abs(total - overrideAmount) < 0.5 && quote?.items?.length > 0) {
    return quote.items.map(it => ({
      description: it.name,
      qty:         it.qty,
      unitPrice:   it.unitPrice || (it.total / (it.qty || 1)),
    }))
  }

  // Partial payment — single consolidated line
  return [{
    description: title,
    qty:         1,
    unitPrice:   overrideAmount,
  }]
}
