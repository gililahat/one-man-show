// src/components/quote-builder/ManualItemForm.jsx
// Free-form item entry: name, qty, unit, unit price.
import { useState } from 'react'

const newItemId = () => 'itm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)

export default function ManualItemForm({ onAdd, onClose }) {
  const [name, setName]   = useState('')
  const [qty, setQty]     = useState(1)
  const [unit, setUnit]   = useState('יח׳')
  const [price, setPrice] = useState(0)

  const total = Math.round((Number(qty) || 0) * (Number(price) || 0))

  const handleAdd = () => {
    if (!name.trim()) { alert('הזן שם פריט'); return }
    onAdd([{
      id: newItemId(),
      source: 'manual',
      name: name.trim(),
      qty: Number(qty) || 1,
      unit: unit || 'יח׳',
      price: Number(price) || 0,
      total,
    }])
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
          <button onClick={onClose} className="text-ink-muted text-sm px-2">ביטול</button>
          <h3 className="text-sm font-bold text-ink">פריט ידני</h3>
          <button onClick={handleAdd} className="text-sm text-brand-600 font-bold px-2">הוסף ✓</button>
        </div>
        <div className="p-4 space-y-3">
          <label className="block">
            <span className="label">שם הפריט</span>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
                   placeholder="לדוגמה: ידית כרום מיוחדת" autoFocus />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="label">כמות</span>
              <input type="number" className="input text-center font-mono"
                     value={qty} onChange={e => setQty(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">יחידה</span>
              <input className="input text-center" value={unit}
                     onChange={e => setUnit(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">מחיר יח׳ (₪)</span>
              <input type="number" className="input text-center font-mono"
                     value={price} onChange={e => setPrice(e.target.value)} />
            </label>
          </div>
          <div className="bg-surface-50 rounded-lg p-3 text-center">
            <span className="text-xs text-ink-muted">סה״כ: </span>
            <b className="font-mono font-bold text-ink">₪{total.toLocaleString('he-IL')}</b>
          </div>
        </div>
      </div>
    </div>
  )
}
