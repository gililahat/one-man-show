// src/components/quote-builder/MeasurementToQuote.jsx
// Takes a saved measurement + lets the user pick glass finish, hardware color,
// and options → runs the shower pricing engine → returns items to the quote.
import { useMemo, useState } from 'react'
import { findModel } from '@/utils/sirtoot/catalog'
import { computeShower } from '@/utils/sirtoot/rules'
import { calculateShower, formatCurrency, GLASS_OPTIONS, HARDWARE_COLORS } from '@/utils/calculatorEngine'

const newItemId = () => 'itm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)

export default function MeasurementToQuote({ measurement, onAdd, onClose }) {
  const [glassType, setGlass]    = useState('שקוף')
  const [color, setColor]        = useState('שחור')
  const [zz, setZZ]              = useState(false)
  const [towel, setTowel]        = useState(false)
  const [noarm, setNoarm]        = useState(false)

  const model = findModel(measurement.modelId)

  const { config, result } = useMemo(() => {
    if (!model) return { config: null, result: null }
    const computed = computeShower({
      model, thickness: measurement.thickness,
      opening: { height: 1900 },
      panelInputs: measurement.panelInputs || [],
    })
    const hasBend = computed.some(p => p.angleBefore && p.angleBefore !== 180)
    const hasStep = computed.some(p => p.step && p.step.w > 0 && p.step.h > 0)
    let len1 = 0, len2 = 0
    if (!hasBend) {
      len1 = computed.reduce((s, p) => s + p.gross.w, 0) / 10
    } else {
      const bendIdx = computed.findIndex(p => p.angleBefore && p.angleBefore !== 180)
      len1 = computed.slice(0, bendIdx).reduce((s, p) => s + p.gross.w, 0) / 10
      len2 = computed.slice(bendIdx).reduce((s, p) => s + p.gross.w, 0) / 10
    }
    const height = Math.max(...computed.map(p => p.gross.h)) / 10
    const config = {
      thickness: measurement.thickness,
      type: model.calculatorType,
      layout: hasBend ? 'corner' : 'straight',
      len1, len2, height,
      glassType, color,
      options: { step: hasStep, zz, towel, noarm },
    }
    const result = calculateShower(config)
    return { config, result }
  }, [model, measurement, glassType, color, zz, towel, noarm])

  const handleAdd = () => {
    if (!result) return
    const items = result.items.map(it => ({
      id: newItemId(),
      source: 'measurement',
      measurementId: measurement.id,
      measurementName: measurement.name,
      name: it.he,
      qty: it.qty,
      unit: it.unit === 'sqm' ? 'מ״ר' : (it.unit || 'יח׳'),
      price: it.price,
      total: it.total,
    }))
    // Snapshot of the shower — attached to the quote so the customer-facing
    // page can render one summary line (description + sketch + price) instead
    // of the full hardware breakdown.
    const snapshot = {
      id: measurement.id,
      name: measurement.name,
      modelId: model.id,
      modelLabel: model.label,
      thickness: measurement.thickness,
      panelInputs: measurement.panelInputs,
      glassType, color,
      options: { zz, towel, noarm },
    }
    onAdd(items, snapshot)
  }

  if (!model) {
    return (
      <Modal onClose={onClose} title="שגיאה">
        <p className="text-sm text-ink-muted">דגם לא נמצא: {measurement.modelId}</p>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} title={measurement.name}
           rightAction={
             <button onClick={handleAdd} className="text-sm text-brand-600 font-bold px-2">
               הוסף להצעה ✓
             </button>
           }>
      <div className="text-xs text-ink-muted text-center pb-2 border-b border-surface-200">
        {model.label} · זכוכית {measurement.thickness} מ״מ
      </div>

      <div className="space-y-3 p-3">
        {/* Choices */}
        <div className="grid grid-cols-2 gap-2">
          <Select label="גימור זכוכית" value={glassType} onChange={setGlass}
                  options={GLASS_OPTIONS.map(g => g.val)} />
          <Select label="צבע פרזול" value={color} onChange={setColor}
                  options={HARDWARE_COLORS.map(c => c.val)} />
        </div>

        <div className="flex flex-wrap gap-3 px-1 py-2">
          <Check label="ציר זכוכית-זכוכית" checked={zz}    onChange={setZZ} />
          <Check label="ידית מגבת"        checked={towel} onChange={setTowel} />
          <Check label="ללא זרוע"         checked={noarm} onChange={setNoarm} />
        </div>

        {/* Items preview */}
        {result && (
          <div className="bg-surface-50 rounded-lg p-2 max-h-[40dvh] overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-ink-muted border-b border-surface-200">
                  <th className="text-right py-1">פריט</th>
                  <th className="text-left">כמות</th>
                  <th className="text-left">מחיר</th>
                  <th className="text-left">סכום</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((it, i) => (
                  <tr key={i} className="border-b border-surface-100">
                    <td className="py-1.5">{it.he}</td>
                    <td className="text-left">{it.qty} {it.unit === 'sqm' ? 'מ״ר' : it.unit}</td>
                    <td className="text-left">{formatCurrency(it.price)}</td>
                    <td className="text-left font-bold">{formatCurrency(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        {result && (
          <div className="bg-ink text-white rounded-lg p-3 space-y-1 text-sm">
            <Row label="שטח זכוכית:"       value={`${result.sqm} מ״ר`} />
            <Row label="עלות חומרים:"      value={formatCurrency(result.subtotal)} />
            <Row label="לפני מע״מ:"         value={formatCurrency(result.preTax)} />
            <Row label='סה"כ כולל מע"מ:'   value={formatCurrency(result.total)} highlight />
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Helpers ────────────────────────────────────────────────
function Modal({ title, rightAction, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
          <button onClick={onClose} className="text-ink-muted text-sm px-2">ביטול</button>
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {rightAction || <span className="w-10" />}
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold text-ink-muted mb-1">{label}</span>
      <select className="input py-2" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
             className="w-4 h-4 accent-ink" />
      {label}
    </label>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div className={`flex justify-between ${highlight ? 'text-base font-bold border-t border-white/30 pt-1.5 mt-1' : 'opacity-85'}`}>
      <span>{label}</span>
      <b className="font-mono">{value}</b>
    </div>
  )
}
