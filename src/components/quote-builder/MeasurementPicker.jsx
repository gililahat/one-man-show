// src/components/quote-builder/MeasurementPicker.jsx
// List of client's saved measurements — pick one to add to the quote.
import { findModel } from '@/utils/sirtoot/catalog'
import { computeShower } from '@/utils/sirtoot/rules'

export default function MeasurementPicker({ clientName, measurements, onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80dvh] flex flex-col">

        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
          <button onClick={onClose} className="text-ink-muted text-sm px-2">ביטול</button>
          <h3 className="text-sm font-bold text-ink">מדידות של {clientName || 'הלקוח'}</h3>
          <span className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {measurements.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-ink-muted text-sm">אין מדידות ללקוח זה</p>
              <p className="text-ink-subtle text-xs mt-1">
                חזור לדף הלקוח, לשונית "מדידות", והוסף מדידה חדשה
              </p>
            </div>
          ) : (
            measurements.map(m => <Row key={m.id} measurement={m} onPick={() => onPick(m)} />)
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ measurement, onPick }) {
  const model = findModel(measurement.modelId)
  const summary = summarize(model, measurement)
  return (
    <button onClick={onPick}
            className="card w-full text-right flex items-center gap-3 hover:border-brand-400 hover:shadow-md transition">
      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-xl">🚿</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-sm truncate">{measurement.name}</p>
        <p className="text-[11px] text-ink-muted truncate">
          {model?.label || measurement.modelId} · {summary}
        </p>
      </div>
      <span className="text-ink-subtle text-xl">‹</span>
    </button>
  )
}

function summarize(model, m) {
  if (!model) return '—'
  try {
    const computed = computeShower({
      model, thickness: m.thickness, opening: { height: 1900 },
      panelInputs: m.panelInputs || [],
    })
    const widths = computed.map(p => p.gross.w).join(' + ')
    const h = computed[0]?.gross.h
    return `${widths} × ${h} מ״מ · זכוכית ${m.thickness} מ״מ`
  } catch { return '—' }
}
