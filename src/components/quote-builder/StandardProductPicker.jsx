// src/components/quote-builder/StandardProductPicker.jsx
// Pick a pre-configured standard shower from the supplier catalog. User can
// filter by category + size + glass. Clicking a product adds it to the quote
// as a single line item (name + qty + unit price).
import { useMemo, useState } from 'react'
import { CATEGORIES, STANDARD_PRODUCTS, productName } from '@/utils/standardProducts'
import { formatCurrency } from '@/utils/calculatorEngine'

const newItemId = () => 'itm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)

export default function StandardProductPicker({ onAdd, onClose }) {
  const [cat, setCat]       = useState(CATEGORIES[0].key)
  const [q, setQ]           = useState('')
  const [glassFilter, setGF] = useState('')
  const [selected, setSelected] = useState(null)  // product object
  const [qty, setQty]       = useState(1)

  const products = useMemo(() => {
    const list = STANDARD_PRODUCTS.filter(p => p.cat === cat)
    return list.filter(p => {
      if (glassFilter && p.glass !== glassFilter) return false
      if (q) {
        const hay = (p.sku + p.size + p.glass + (p.note || '')).toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [cat, q, glassFilter])

  const glassesInCategory = useMemo(() => {
    const set = new Set(STANDARD_PRODUCTS.filter(p => p.cat === cat).map(p => p.glass))
    return [...set]
  }, [cat])

  const counts = useMemo(() => {
    const m = {}
    for (const p of STANDARD_PRODUCTS) m[p.cat] = (m[p.cat] || 0) + 1
    return m
  }, [])

  const confirmAdd = () => {
    if (!selected) return
    onAdd([{
      id: newItemId(),
      source: 'standard',
      sku: selected.sku,
      name: productName(selected),
      qty: Number(qty) || 1,
      unit: 'יח׳',
      price: selected.price,
      total: Math.round((Number(qty) || 1) * selected.price),
    }])
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
          <button onClick={onClose} className="text-ink-muted text-sm px-2">ביטול</button>
          <h3 className="text-sm font-bold text-ink">מוצר סטנדרטי</h3>
          {selected ? (
            <button onClick={confirmAdd} className="text-sm text-brand-600 font-bold px-2">הוסף ✓</button>
          ) : <span className="w-10" />}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-surface-200 px-2">
          {CATEGORIES.map(c => (
            <button key={c.key}
              onClick={() => { setCat(c.key); setSelected(null); setGF('') }}
              className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition ${
                cat === c.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-muted hover:text-ink'
              }`}>
              {c.label} <span className="text-[10px] text-ink-subtle">({counts[c.key] || 0})</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-3 py-2 border-b border-surface-200 overflow-x-auto">
          <input className="input flex-1 text-xs py-1.5" placeholder="חיפוש…"
                 value={q} onChange={e => setQ(e.target.value)} />
          <select className="input text-xs py-1.5 w-auto"
                  value={glassFilter} onChange={e => setGF(e.target.value)}>
            <option value="">כל הזכוכיות</option>
            {glassesInCategory.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {products.length === 0 ? (
            <div className="text-center py-8 text-ink-muted text-sm">אין מוצרים תואמים</div>
          ) : products.map(p => (
            <button key={p.sku}
              onClick={() => setSelected(p)}
              className={`w-full text-right px-3 py-2 rounded-lg border transition flex items-center gap-3 ${
                selected?.sku === p.sku
                  ? 'bg-brand-50 border-brand-400'
                  : 'bg-white border-surface-200 hover:border-brand-300 hover:bg-surface-50'
              }`}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink text-sm">{p.size} · {p.glass}{p.hw !== 'כרום' ? ` · ${p.hw}` : ''}</div>
                <div className="text-[10px] text-ink-muted font-mono">{p.sku}{p.note ? ` · ${p.note}` : ''}</div>
              </div>
              <div className="font-mono font-bold text-ink text-sm whitespace-nowrap">
                {formatCurrency(p.price)}
              </div>
            </button>
          ))}
        </div>

        {/* Quantity footer (when selected) */}
        {selected && (
          <div className="border-t border-surface-200 p-3 bg-surface-50 flex items-center gap-2">
            <span className="text-xs text-ink-muted">כמות:</span>
            <button onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-8 h-8 rounded-lg border border-surface-300 font-bold">−</button>
            <span className="font-mono font-bold text-base w-10 text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)}
                    className="w-8 h-8 rounded-lg border border-surface-300 font-bold">+</button>
            <span className="flex-1" />
            <span className="text-xs text-ink-muted">סה״כ:</span>
            <b className="font-mono text-base text-ink">{formatCurrency(qty * selected.price)}</b>
          </div>
        )}
      </div>
    </div>
  )
}
