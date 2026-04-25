// src/pages/standard-products/StandardProductsPage.jsx

import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { addQuote } from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'

const CATALOG = [
  {
    id:          'std-001',
    name:        'מקלחון',
    price:       900,
    description: 'מוצר לבדיקה — קטלוג מלא בהמשך',
    icon:        '🚿',
  },
]

export default function StandardProductsPage() {
  const uid                     = useAuthStore(s => s.uid())
  const navigate                = useNavigate()
  const [searchParams]          = useSearchParams()
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState(null)   // product chosen by user
  const [confirmed, setConfirmed] = useState(false) // after pressing ✓

  const clientId   = searchParams.get('clientId')   || ''
  const clientName = searchParams.get('clientName') || ''
  const phone      = searchParams.get('phone')      || ''
  const address    = searchParams.get('address')    || ''
  const complexity = searchParams.get('complexity') || ''

  const handleSelect = (product) => {
    if (loading) return
    setSelected(product)
    setConfirmed(false)
  }

  const handleConfirm = async () => {
    if (!selected || loading) return
    setConfirmed(true)
    setLoading(true)
    try {
      const ref = await addQuote(uid, {
        title:         `${selected.name} — ${clientName || 'לקוח'}`,
        clientId,
        clientName,
        clientPhone:   phone,
        clientAddress: address,
        complexity,
        projectName:   selected.name,
        items:         [{ name: selected.name, price: selected.price, qty: 1 }],
        result:        { total: selected.price },
      })
      navigate(`/quote/${ref.id}`)
    } catch {
      setLoading(false)
      setConfirmed(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">מוצרים סטנדרטיים</h1>
          {clientName && (
            <p className="text-sm text-ink-muted">👤 {clientName}{address ? ` · ${address}` : ''}</p>
          )}
        </div>
      </div>

      {/* Product list */}
      <div className="space-y-3">
        {CATALOG.map(product => {
          const isSelected = selected?.id === product.id
          return (
            <button
              key={product.id}
              disabled={loading}
              onClick={() => handleSelect(product)}
              className="card w-full text-right transition-all group active:scale-[0.99]"
              style={{
                opacity:   loading && !isSelected ? 0.45 : 1,
                boxShadow: isSelected ? '0 0 0 2px var(--color-brand-500)' : undefined,
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-400/10 flex items-center justify-center text-2xl shrink-0">
                  {product.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink">{product.name}</p>
                  {product.description && (
                    <p className="text-sm text-ink-muted mt-0.5">{product.description}</p>
                  )}
                </div>
                <div className="text-left shrink-0 flex items-center gap-3">
                  <div>
                    <p className="font-bold text-ink text-lg">{formatCurrency(product.price)}</p>
                    <p className="text-xs text-ink-subtle">לפני מע"מ</p>
                  </div>
                  {/* Checkmark when selected */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
                       style={{
                         background: isSelected ? 'var(--color-brand-500)' : 'var(--color-surface-200)',
                       }}>
                    <span style={{ color: isSelected ? '#fff' : 'transparent', fontSize: 14 }}>✓</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Placeholder */}
      <div className="card border-2 border-dashed border-surface-300 flex flex-col items-center py-8 text-center">
        <span className="text-3xl mb-2">🚧</span>
        <p className="font-medium text-ink-muted">קטלוג מלא בהמשך</p>
        <p className="text-sm text-ink-subtle mt-0.5">תמונות, מידות ומחירים</p>
      </div>

      {/* Confirm bar — slides up when a product is selected */}
      {selected && (
        <div
          className="fixed bottom-0 right-0 left-0 bg-white border-t border-surface-200 px-4 py-3 flex items-center gap-3"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', zIndex: 60 }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink truncate">{selected.name}</p>
            <p className="text-sm text-ink-muted">{formatCurrency(selected.price)}</p>
          </div>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-6"
            style={{ minWidth: 120 }}
          >
            {confirmed ? (
              <span className="animate-pulse">יוצר...</span>
            ) : (
              <>
                <span style={{ fontSize: 18 }}>✓</span>
                אישור
              </>
            )}
          </button>
        </div>
      )}

      {/* Spacer so confirm bar doesn't cover last item */}
      {selected && <div className="h-20" />}
    </div>
  )
}
