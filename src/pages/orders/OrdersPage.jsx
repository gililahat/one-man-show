// src/pages/orders/OrdersPage.jsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import useAuthStore from '@/store/authStore'
import { subscribeOrders, addOrder, updateOrder, deleteOrder,
         subscribeSuppliers, getQuotes, getClients } from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'

const ORDER_STATUSES = [
  { key: 'draft',     label: 'טיוטה',      color: 'badge-neutral' },
  { key: 'sent',      label: 'נשלח',        color: 'badge-info'    },
  { key: 'confirmed', label: 'אושר',        color: 'badge-success' },
  { key: 'in_prod',   label: 'בייצור',      color: 'badge-warning' },
  { key: 'ready',     label: 'מוכן למשלוח', color: 'badge-success' },
  { key: 'delivered', label: 'סופק',         color: 'badge-neutral' },
]

const EMPTY_ORDER = {
  supplierId: '', supplierName: '', supplierType: 'private',
  quoteId: '', clientName: '', projectName: '',
  items: '', totalAmount: 0, notes: '', status: 'draft',
}

export default function OrdersPage() {
  const uid = useAuthStore(s => s.uid())
  const [searchParams] = useSearchParams()
  const [orders, setOrders]       = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [quotes, setQuotes]       = useState([])
  const [modal, setModal]         = useState(null)
  const [loading, setLoading]     = useState(true)

  // Auto-open modal if arriving from a quote
  const urlPrefill = {
    quoteId:     searchParams.get('quoteId')     || '',
    clientName:  searchParams.get('clientName')  || '',
    projectName: searchParams.get('projectName') || '',
    clientId:    searchParams.get('clientId')    || '',
    projectId:   searchParams.get('projectId')   || '',
  }

  useEffect(() => {
    if (urlPrefill.quoteId) setModal({ _prefill: urlPrefill })
  }, [urlPrefill.quoteId]) // eslint-disable-line

  useEffect(() => {
    if (!uid) return
    const unsub1 = subscribeOrders(uid, data => { setOrders(data); setLoading(false) })
    const unsub2 = subscribeSuppliers(uid, setSuppliers)
    getQuotes(uid).then(setQuotes)
    return () => { unsub1(); unsub2() }
  }, [uid])

  const handleDelete = async (id) => {
    if (!confirm('למחוק הזמנה זו?')) return
    await deleteOrder(uid, id)
  }

  const handleStatusChange = async (id, status) => {
    await updateOrder(uid, id, { status })
  }

  const totalOpen = orders
    .filter(o => !['delivered'].includes(o.status))
    .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0)

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">הזמנות ספקים</h1>
          <p className="text-sm text-ink-muted">{orders.length} הזמנות</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>+ הזמנה חדשה</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ORDER_STATUSES.slice(0, 4).map(s => (
          <div key={s.key} className="card text-center py-3">
            <p className="text-xl font-bold text-ink">
              {orders.filter(o => o.status === s.key).length}
            </p>
            <span className={`badge ${s.color} mt-1`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Open orders value */}
      {totalOpen > 0 && (
        <div className="card bg-brand-50 border-brand-100 flex items-center justify-between">
          <span className="text-sm font-medium text-brand-800">סה"כ הזמנות פתוחות</span>
          <span className="font-bold text-brand-700 text-lg">{formatCurrency(totalOpen)}</span>
        </div>
      )}

      {loading ? <LoadingSkeleton /> : orders.length === 0 ? (
        <EmptyState onAdd={() => setModal('add')} />
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <OrderCard key={o.id} order={o}
              onDelete={() => handleDelete(o.id)}
              onStatusChange={s => handleStatusChange(o.id, s)} />
          ))}
        </div>
      )}

      {modal && (
        <OrderModal
          order={(modal === 'add' || modal?._prefill) ? null : modal}
          prefill={modal?._prefill || (modal === 'add' ? {} : {})}
          uid={uid} suppliers={suppliers} quotes={quotes}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function OrderCard({ order, onDelete, onStatusChange }) {
  const status = ORDER_STATUSES.find(s => s.key === order.status) || ORDER_STATUSES[0]
  const created = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || Date.now())
  const next = ORDER_STATUSES[ORDER_STATUSES.findIndex(s => s.key === order.status) + 1]

  return (
    <div className="card group hover:shadow-card transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0 text-xl">
          🏭
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink">{order.supplierName || 'ספק'}</p>
            <span className={`badge ${status.color}`}>{status.label}</span>
            {order.supplierType === 'platform' && (
              <span className="badge badge-success">פלטפורמה</span>
            )}
          </div>
          {order.clientName && <p className="text-sm text-ink-muted mt-0.5">👤 {order.clientName}</p>}
          {order.projectName && <p className="text-sm text-ink-muted">📁 {order.projectName}</p>}
          <p className="text-xs text-ink-subtle mt-1">
            {format(created, 'd בMMM yyyy', { locale: he })}
          </p>
        </div>
        {order.totalAmount > 0 && (
          <div className="text-left shrink-0">
            <p className="font-bold text-ink">{formatCurrency(order.totalAmount)}</p>
          </div>
        )}
      </div>

      {order.items && (
        <div className="mt-3 pt-3 border-t border-surface-100">
          <p className="text-xs text-ink-muted whitespace-pre-line line-clamp-2">{order.items}</p>
        </div>
      )}

      <div className="flex gap-2 mt-3 pt-3 border-t border-surface-100">
        {next && (
          <button className="btn-primary text-xs"
                  onClick={() => onStatusChange(next.key)}>
            → {next.label}
          </button>
        )}
        <button className="btn-ghost text-xs text-danger mr-auto" onClick={onDelete}>מחיקה</button>
      </div>
    </div>
  )
}

function OrderModal({ order, prefill = {}, uid, suppliers, quotes, onClose }) {
  const isEdit = !!order
  const [form, setForm] = useState(order || {
    ...EMPTY_ORDER,
    quoteId:     prefill.quoteId     || '',
    clientName:  prefill.clientName  || '',
    clientId:    prefill.clientId    || '',
    projectName: prefill.projectName || '',
    projectId:   prefill.projectId   || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSupplierChange = (e) => {
    const s = suppliers.find(s => s.id === e.target.value)
    setForm(f => ({ ...f, supplierId: e.target.value, supplierName: s?.name || '', supplierType: s?.type || 'private' }))
  }

  const handleQuoteChange = (e) => {
    const q = quotes.find(q => q.id === e.target.value)
    setForm(f => ({ ...f, quoteId: e.target.value, clientName: q?.clientName || '', projectName: q?.projectName || '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.supplierId) { setError('יש לבחור ספק'); return }
    setLoading(true)
    try {
      if (isEdit) await updateOrder(uid, order.id, form)
      else        await addOrder(uid, form)
      onClose()
    } catch { setError('שגיאה בשמירה') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md max-h-[90dvh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-ink">{isEdit ? 'עריכת הזמנה' : 'הזמנה חדשה'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">ספק *</label>
            <select className="input" value={form.supplierId} onChange={handleSupplierChange}>
              <option value="">— בחר ספק —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">הצעת מחיר קשורה</label>
            <select className="input" value={form.quoteId} onChange={handleQuoteChange}>
              <option value="">— בחר הצעה —</option>
              {quotes.map(q => <option key={q.id} value={q.id}>{q.title || q.clientName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">פריטים להזמנה</label>
            <textarea className="input resize-none" rows={4}
              placeholder="פנל 1: 800×2000 שקוף 8מ&quot;מ&#10;פנל 2: 600×2000 שקוף 8מ&quot;מ"
              value={form.items} onChange={set('items')} />
          </div>
          <div>
            <label className="label">סה"כ הזמנה (₪)</label>
            <input className="input max-w-xs" type="number" min={0}
              value={form.totalAmount} onChange={set('totalAmount')} dir="ltr" />
          </div>
          <div>
            <label className="label">הערות</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'שומר...' : isEdit ? 'שמור' : 'צור הזמנה'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return <div className="space-y-3">{[1,2,3].map(i => (
    <div key={i} className="card animate-pulse flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-surface-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-200 rounded w-1/2" />
        <div className="h-3 bg-surface-100 rounded w-1/3" />
      </div>
    </div>
  ))}</div>
}

function EmptyState({ onAdd }) {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <span className="text-5xl mb-4">📦</span>
      <p className="font-semibold text-ink mb-1">אין הזמנות עדיין</p>
      <p className="text-sm text-ink-muted mb-5">צור הזמנה לספק מהצעת מחיר</p>
      <button className="btn-primary" onClick={onAdd}>+ הזמנה חדשה</button>
    </div>
  )
}
