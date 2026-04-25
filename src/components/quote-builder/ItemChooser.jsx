// src/components/quote-builder/ItemChooser.jsx
// "Add item" source picker: shower measurement / standard product / manual.
export default function ItemChooser({ onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-4 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-surface-200">
          <h3 className="text-sm font-bold text-ink">בחר סוג פריט</h3>
          <button onClick={onClose} className="text-ink-subtle text-xl px-2">×</button>
        </div>

        <Choice icon="🚿" title="מקלחון בייצור אישי"
                subtitle="בחר ממדידות הלקוח + חישוב פרזול ומחיר"
                onClick={() => onPick('measurement')} />

        <Choice icon="📦" title="מוצר סטנדרטי"
                subtitle="בחר מקטלוג מקלחונים מוכנים"
                onClick={() => onPick('standard')} />

        <Choice icon="✏️" title="פריט ידני"
                subtitle="הכנסה חופשית — שם, כמות, מחיר"
                onClick={() => onPick('manual')} />
      </div>
    </div>
  )
}

function Choice({ icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick}
            className="card w-full text-right flex items-center gap-3 transition hover:border-brand-400 hover:shadow-md cursor-pointer">
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-2xl">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-ink text-sm">{title}</div>
        <div className="text-xs text-ink-muted">{subtitle}</div>
      </div>
      <span className="text-ink-subtle text-xl">‹</span>
    </button>
  )
}
