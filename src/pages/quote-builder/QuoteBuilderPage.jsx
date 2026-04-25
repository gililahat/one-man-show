// src/pages/quote-builder/QuoteBuilderPage.jsx
// Quote creation/editing flow. Builds a quote from multiple item sources:
// shower measurements (from the client's library), manual items, and
// (eventually) standard products. Items are stored flat on the quote with a
// `source` field so we can group/link back to a measurement.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { addQuote, updateQuote, getQuote, subscribeClient } from '@/firebase/db'
import { formatCurrency, PRICING_FORMULA } from '@/utils/calculatorEngine'
import ItemChooser from '@/components/quote-builder/ItemChooser'
import MeasurementPicker from '@/components/quote-builder/MeasurementPicker'
import MeasurementToQuote from '@/components/quote-builder/MeasurementToQuote'
import ManualItemForm from '@/components/quote-builder/ManualItemForm'
import StandardProductPicker from '@/components/quote-builder/StandardProductPicker'

const newItemId = () => 'itm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)

export default function QuoteBuilderPage() {
  const [params]     = useSearchParams()
  const { id }       = useParams()  // /quote/edit/:id → defined; /quote/new → undefined
  const navigate     = useNavigate()
  const uid          = useAuthStore(s => s.uid())

  const [clientId, setClientId]     = useState(params.get('clientId') || '')
  const [clientName, setClientName] = useState(params.get('clientName') || '')
  const [title, setTitle]           = useState('')
  const [items, setItems]           = useState([])
  const [snapshots, setSnapshots]   = useState([])  // shower snapshots for customer view
  const [notes, setNotes]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [loading, setLoading]       = useState(!!id)
  const [modal, setModal]           = useState(null)
  // modal ∈ null | 'chooser' | 'pickerMeas' | 'manual' | { type:'measToQuote', measurement }

  const [client, setClient]         = useState(null)  // subscribed when clientId known

  // Load existing quote for /quote/edit/:id
  useEffect(() => {
    if (!uid || !id) return
    getQuote(uid, id).then(q => {
      if (!q) { navigate('/quotes'); return }
      setTitle(q.title || '')
      setClientId(q.clientId || '')
      setClientName(q.clientName || '')
      setItems(normalizeItems(q.items))
      setSnapshots(q.measurementSnapshots || [])
      setNotes(q.notes || '')
      setLoading(false)
    })
  }, [uid, id])  // eslint-disable-line

  // Subscribe to client (for measurement picker)
  useEffect(() => {
    if (!uid || !clientId) return
    return subscribeClient(uid, clientId, setClient)
  }, [uid, clientId])

  const result = useMemo(() => computeTotals(items), [items])

  // Default install prices: ₪650 for custom (sirtoot) shower, ₪350 for standard.
  // The contractor can edit each line afterwards.
  const DEFAULT_INSTALL_CUSTOM   = 650
  const DEFAULT_INSTALL_STANDARD = 350

  // ── Actions ──────────────────────────────────────────────────
  const addItems = (newItems, snapshot) => {
    const stamped = newItems.map(it => ({ ...it, id: it.id || newItemId() }))

    // Auto-add an installation line per shower added in this batch
    const autoInstalls = []
    if (snapshot) {
      autoInstalls.push(makeInstallItem({
        name:  `התקנה — ${snapshot.name}`,
        price: DEFAULT_INSTALL_CUSTOM,
        link:  { measurementId: snapshot.id },
      }))
    } else {
      // Standard products — one install line per item from the 'standard' source
      for (const it of stamped) {
        if (it.source === 'standard') {
          autoInstalls.push(makeInstallItem({
            name:  `התקנה — ${it.name}`,
            price: DEFAULT_INSTALL_STANDARD,
            link:  { sku: it.sku },
          }))
        }
      }
    }

    setItems(prev => [...prev, ...stamped, ...autoInstalls])
    if (snapshot) {
      setSnapshots(prev => {
        const without = prev.filter(s => s.id !== snapshot.id)
        return [...without, snapshot]
      })
    }
    setModal(null)
  }
  const removeItem = (itemId) => setItems(prev => prev.filter(i => i.id !== itemId))
  const removeMeasurementGroup = (measId) => {
    setItems(prev => prev.filter(i =>
      i.measurementId !== measId && i.linkedTo?.measurementId !== measId,
    ))
    setSnapshots(prev => prev.filter(s => s.id !== measId))
  }
  const editItemPrice = (itemId) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const raw = prompt(`מחיר חדש ל-"${item.name}" (₪)`, String(item.price))
    if (raw == null) return
    const price = Number(raw)
    if (Number.isNaN(price) || price < 0) return
    setItems(prev => prev.map(i => i.id === itemId
      ? { ...i, price, total: price * (Number(i.qty) || 1) }
      : i,
    ))
  }

  const makeInstallItem = ({ name, price, link }) => ({
    id: newItemId(),
    source: 'installation',
    linkedTo: link,
    name, qty: 1, unit: 'יח׳',
    price, total: price,
  })

  const handleSave = async (status = 'draft') => {
    if (!uid || saving) return
    if (!clientName && !clientId) { alert('חסר לקוח'); return }
    setSaving(true)
    try {
      const payload = {
        title: title || `הצעת מחיר — ${clientName}`,
        clientId, clientName,
        items, notes,
        measurementSnapshots: snapshots,
        result,
        status,
      }
      if (id) {
        await updateQuote(uid, id, payload)
        navigate(`/quote/${id}`)
      } else {
        const ref = await addQuote(uid, payload)
        navigate(`/quote/${ref.id}`)
      }
    } catch (e) {
      console.error(e)
      alert('שמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-ink-muted">טוען…</div>

  // Group shower items by measurementId for display
  const grouped = groupItems(items)

  return (
    <div className="space-y-4 pb-24">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
                className="p-2 rounded-xl text-ink-subtle hover:bg-surface-100 text-xl">←</button>
        <h1 className="page-title flex-1">{id ? 'עריכת הצעה' : 'הצעת מחיר חדשה'}</h1>
      </div>

      {/* Meta */}
      <div className="card space-y-3">
        <div>
          <label className="label">כותרת</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)}
                 placeholder={`הצעת מחיר — ${clientName || 'לקוח'}`} />
        </div>
        <div className="text-sm">
          <span className="text-ink-muted">לקוח: </span>
          <span className="font-semibold text-ink">{clientName || '—'}</span>
        </div>
      </div>

      {/* ── Items ───────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-ink">פריטים ({items.length})</h2>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-ink-muted text-sm">
            אין פריטים עדיין — לחץ "הוסף פריט" למטה
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.measurements.map(group => (
              <MeasurementGroup key={group.measurementId}
                group={group}
                onRemove={() => removeMeasurementGroup(group.measurementId)}
              />
            ))}
            {grouped.others.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-ink-muted">פריטים נוספים (התקנות / ידני / מקלחונים סטנדרטיים)</p>
                {grouped.others.map(it => (
                  <ItemRow key={it.id} item={it}
                    onRemove={() => removeItem(it.id)}
                    onEditPrice={() => editItemPrice(it.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={() => setModal('chooser')}
                className="btn-primary w-full mt-4 text-sm py-3">
          + הוסף פריט
        </button>
      </div>

      {/* Notes */}
      <div className="card">
        <label className="label">הערות</label>
        <textarea className="input resize-none" rows={3} value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="הערות פנימיות / תנאי תשלום / זמן אספקה…" />
      </div>

      {/* ── Totals ──────────────────────────────────────────── */}
      <div className="card bg-surface-50 space-y-1 text-sm">
        <Row label="עלות חומרים:"          value={formatCurrency(result.subtotal)} />
        <Row label="לפני מע״מ (×2.2):"     value={formatCurrency(result.preTax)} />
        <Row label="מע״מ 18%:"              value={formatCurrency(result.vat)} />
        {result.installsTotal > 0 && (
          <Row label="התקנות (מחיר סופי):" value={formatCurrency(result.installsTotal)} />
        )}
        <Row label='סה"כ לתשלום:'           value={formatCurrency(result.total)} highlight />
      </div>

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="flex gap-2 sticky bottom-0 bg-white p-3 -mx-4 lg:-mx-6 border-t border-surface-200">
        <button className="btn-secondary flex-1" onClick={() => navigate(-1)}>ביטול</button>
        <button className="btn-primary flex-1" onClick={() => handleSave('draft')} disabled={saving}>
          {saving ? 'שומר…' : '💾 שמור טיוטה'}
        </button>
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {modal === 'chooser' && (
        <ItemChooser
          onPick={(type) => {
            if (type === 'measurement') setModal('pickerMeas')
            else if (type === 'manual') setModal('manual')
            else if (type === 'standard') setModal('standard')
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'standard' && (
        <StandardProductPicker
          onAdd={addItems}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'pickerMeas' && (
        <MeasurementPicker
          clientName={clientName}
          measurements={client?.measurements || []}
          onPick={(m) => setModal({ type: 'measToQuote', measurement: m })}
          onClose={() => setModal(null)}
        />
      )}
      {modal && typeof modal === 'object' && modal.type === 'measToQuote' && (
        <MeasurementToQuote
          measurement={modal.measurement}
          onAdd={addItems}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'manual' && (
        <ManualItemForm
          onAdd={addItems}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Normalize legacy items into the new shape ─────────────────
function normalizeItems(items) {
  if (!Array.isArray(items)) return []
  return items.map(it => ({
    id: it.id || newItemId(),
    source: it.source || 'manual',
    measurementId: it.measurementId,
    measurementName: it.measurementName,
    name: it.name || it.he || '—',
    qty: Number(it.qty) || 1,
    unit: it.unit || 'יח׳',
    price: Number(it.unitPrice ?? it.price) || 0,
    total: Number(it.total) || (Number(it.qty || 1) * Number(it.unitPrice ?? it.price ?? 0)),
  }))
}

// ── Totals ─────────────────────────────────────────────
// Regular items (showers, manual, standard) get margin + VAT.
// Installation items are FINAL prices (already include VAT, no markup) and
// are added after VAT as their own block.
function computeTotals(items) {
  const installs = items.filter(i => i.source === 'installation')
  const regular  = items.filter(i => i.source !== 'installation')

  const subtotal      = regular.reduce((s, i) => s + (Number(i.total) || (i.qty * i.price) || 0), 0)
  const preTax        = subtotal * PRICING_FORMULA.margin
  const vat           = preTax   * (PRICING_FORMULA.vat - 1)
  const regularTotal  = preTax + vat
  const installsTotal = installs.reduce((s, i) => s + (Number(i.total) || (i.qty * i.price) || 0), 0)

  return {
    subtotal:       Math.round(subtotal),       // raw cost of regular items
    preTax:         Math.round(preTax),         // cost × margin
    vat:            Math.round(vat),            // VAT on regular only
    regularTotal:   Math.round(regularTotal),   // pre-tax + VAT
    installsTotal:  Math.round(installsTotal),  // installations as-is (already final)
    total:          Math.round(regularTotal + installsTotal),
  }
}

function groupItems(items) {
  const byMeas = new Map()
  const others = []
  for (const it of items) {
    if (it.source === 'measurement' && it.measurementId) {
      if (!byMeas.has(it.measurementId)) {
        byMeas.set(it.measurementId, {
          measurementId: it.measurementId,
          measurementName: it.measurementName || 'מקלחון',
          items: [],
        })
      }
      byMeas.get(it.measurementId).items.push(it)
    } else {
      others.push(it)
    }
  }
  return { measurements: [...byMeas.values()], others }
}

function MeasurementGroup({ group, onRemove }) {
  const subtotal = group.items.reduce((s, i) => s + (Number(i.total) || 0), 0)
  return (
    <div className="border border-surface-200 rounded-xl overflow-hidden">
      <div className="bg-brand-50 px-3 py-2 flex items-center justify-between">
        <div>
          <span className="text-base">🚿 </span>
          <span className="font-semibold text-ink text-sm">{group.measurementName}</span>
          <span className="text-[11px] text-ink-muted mr-2">{group.items.length} פריטים</span>
        </div>
        <button onClick={onRemove}
                className="text-xs text-red-600 hover:bg-red-50 rounded px-2 py-1">
          הסר מקלחון
        </button>
      </div>
      <div className="divide-y divide-surface-100">
        {group.items.map(it => <ItemRow key={it.id} item={it} compact />)}
      </div>
      <div className="bg-surface-50 px-3 py-1.5 text-xs text-right">
        <span className="text-ink-muted">סכום מקלחון: </span>
        <b className="font-mono text-ink">{formatCurrency(Math.round(subtotal))}</b>
      </div>
    </div>
  )
}

function ItemRow({ item, onRemove, onEditPrice, compact }) {
  const isInstall = item.source === 'installation'
  return (
    <div className={`flex items-center gap-2 ${compact ? 'px-3 py-1.5' : 'p-2'} text-xs ${isInstall ? 'bg-amber-50' : ''}`}>
      <span className="flex-1 truncate">
        {isInstall && '🔧 '}
        {item.name}
      </span>
      <span className="font-mono text-ink-muted whitespace-nowrap">{item.qty} {item.unit}</span>
      {onEditPrice ? (
        <button onClick={onEditPrice}
                className="font-mono text-ink-muted whitespace-nowrap hover:bg-surface-200 rounded px-1"
                title="לחץ לעריכת מחיר">
          × {formatCurrency(item.price)}
        </button>
      ) : (
        <span className="font-mono text-ink-muted whitespace-nowrap">× {formatCurrency(item.price)}</span>
      )}
      <span className="font-mono font-bold text-ink whitespace-nowrap min-w-[60px] text-left">
        {formatCurrency(item.total)}
      </span>
      {onRemove && (
        <button onClick={onRemove}
                className="text-ink-subtle hover:text-red-600 text-sm px-1">×</button>
      )}
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div className={`flex justify-between ${highlight ? 'text-base font-bold border-t border-ink pt-2 mt-1' : ''}`}>
      <span className={highlight ? 'text-ink' : 'text-ink-muted'}>{label}</span>
      <b className="font-mono text-ink">{value}</b>
    </div>
  )
}
