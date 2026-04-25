// src/pages/orders/OrdersPage.jsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ActionSwitch from '@/components/ui/ActionSwitch'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import useAuthStore from '@/store/authStore'
import { subscribeOrders, addOrder, updateOrder, deleteOrder,
         subscribeSuppliers, getQuotes, addSupplier,
         generateToken, createSupplierToken } from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'
import { publicOrigin } from '@/utils/publicUrl'

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
  supplierPhone: '', supplierEmail: '',
  quoteId: '', clientName: '', projectName: '',
  items: '', totalAmount: 0, notes: '', status: 'draft',
}

export default function OrdersPage() {
  const uid     = useAuthStore(s => s.uid())
  const profile = useAuthStore(s => s.profile)
  const bizName = profile?.profile?.businessName || 'ONE MAN SHOW'
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
            <OrderCard key={o.id} order={o} bizName={bizName}
              onDelete={() => handleDelete(o.id)}
              onEdit={() => setModal(o)}
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

function OrderCard({ order, bizName, onDelete, onEdit, onStatusChange }) {
  const status  = ORDER_STATUSES.find(s => s.key === order.status) || ORDER_STATUSES[0]
  const created = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || Date.now())
  const next    = ORDER_STATUSES[ORDER_STATUSES.findIndex(s => s.key === order.status) + 1]

  const waNum = (order.supplierPhone || '').replace(/[^0-9]/g, '').replace(/^0/, '972')

  const handleSendWhatsApp = () => {
    const confirmUrl = order.confirmToken ? `${publicOrigin()}/sc/${order.confirmToken}` : null
    const msg = [
      `הזמנה מ: ${bizName}`,
      `לקוח: ${order.clientName || ''}`,
      `פרויקט: ${order.projectName || ''}`,
      ``,
      `פריטים:`,
      order.items || '',
      order.notes ? `\nהערות: ${order.notes}` : '',
      order.totalAmount > 0 ? `\nסה"כ: ₪${Number(order.totalAmount).toLocaleString()}` : '',
      confirmUrl ? `\nכשהסחורה מוכנה — אשר כאן:\n${confirmUrl}` : '',
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleSendEmail = () => {
    const confirmUrl = order.confirmToken ? `${publicOrigin()}/sc/${order.confirmToken}` : null
    const subject = encodeURIComponent(`הזמנה מ-${bizName} — ${order.projectName || order.clientName || ''}`)
    const body = encodeURIComponent([
      `הזמנה מ: ${bizName}`,
      `לקוח: ${order.clientName || ''}`,
      `פרויקט: ${order.projectName || ''}`,
      ``,
      `פריטים:`,
      order.items || '',
      order.notes ? `\nהערות: ${order.notes}` : '',
      order.totalAmount > 0 ? `\nסה"כ: ₪${Number(order.totalAmount).toLocaleString()}` : '',
      confirmUrl ? `\nכשהסחורה מוכנה — אשר כאן:\n${confirmUrl}` : '',
    ].filter(Boolean).join('\n'))
    window.open(`mailto:${order.supplierEmail || ''}?subject=${subject}&body=${body}`)
  }

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

      {(order.orderItems?.length > 0 || order.items) && (
        <div className="mt-3 pt-3 border-t border-surface-100 space-y-1">
          {order.orderItems?.filter(i => i.desc).length > 0 ? (
            order.orderItems.filter(i => i.desc).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-ink-muted">
                <span className="text-ink-subtle shrink-0 w-4">{idx + 1}.</span>
                <span className="flex-1">{item.desc}</span>
                {item.dims && <span dir="ltr" className="text-ink-subtle shrink-0">{item.dims}</span>}
                <span className="text-ink-subtle shrink-0">×{item.qty}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-ink-muted whitespace-pre-line">{order.items}</p>
          )}
        </div>
      )}

      {order.deliveryDate && (
        <p className="text-xs text-ink-subtle mt-1.5">📅 אספקה: {order.deliveryDate}</p>
      )}
      {order.notes && (
        <p className="text-xs text-ink-subtle mt-1 whitespace-pre-line">{order.notes}</p>
      )}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-300">
        {order.status === 'ready' ? (
          <ActionSwitch
            label="ספק הגיע"
            labelOn="סופק ✓"
            active={false}
            onToggle={() => onStatusChange('delivered')}
            color="green"
          />
        ) : order.status === 'delivered' ? (
          <ActionSwitch
            label="סופק"
            labelOn="סופק ✓"
            active={true}
            onToggle={() => {}}
            disabled={true}
            color="green"
          />
        ) : next ? (
          <button className="btn-primary text-xs"
                  onClick={() => onStatusChange(next.key)}>
            → {next.label}
          </button>
        ) : null}
        {waNum && (
          <button className="btn-primary text-xs flex items-center gap-1" onClick={handleSendWhatsApp}>
            📱 שלח
          </button>
        )}
        {order.supplierEmail && (
          <button className="btn-secondary text-xs flex items-center gap-1" onClick={handleSendEmail}>
            📧 מייל
          </button>
        )}
        <button className="btn-secondary text-xs" onClick={onEdit}>עריכה</button>
        <button className="btn-ghost text-xs text-danger mr-auto" onClick={onDelete}>מחיקה</button>
      </div>
    </div>
  )
}

function OrderModal({ order, prefill = {}, uid, suppliers, quotes, onClose }) {
  const isEdit = !!order

  const initItems = () => {
    if (order?.orderItems?.length > 0) return order.orderItems
    if (order?.items) return [{ desc: order.items, dims: '', qty: 1 }]
    return [{ desc: '', dims: '', qty: 1 }]
  }

  const [form, setForm] = useState(order || {
    ...EMPTY_ORDER,
    quoteId:     prefill.quoteId     || '',
    clientName:  prefill.clientName  || '',
    clientId:    prefill.clientId    || '',
    projectName: prefill.projectName || '',
    projectId:   prefill.projectId   || '',
  })
  const [orderItems, setOrderItems]   = useState(initItems)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [addingSupplier, setAddingSupplier] = useState(false)
  const [newSupplier, setNewSupplier] = useState({ name: '', category: 'זכוכית', phone: '', email: '', address: '', type: 'private' })

  const handleSaveNewSupplier = async () => {
    if (!newSupplier.name.trim()) return
    const ref = await addSupplier(uid, newSupplier)
    const saved = { id: ref.id, ...newSupplier }
    // auto-select the new supplier
    setForm(f => ({
      ...f,
      supplierId:    saved.id,
      supplierName:  saved.name,
      supplierType:  saved.type,
      supplierPhone: saved.phone,
      supplierEmail: saved.email,
    }))
    suppliers.push(saved)   // optimistic update to local list
    setAddingSupplier(false)
    setNewSupplier({ name: '', category: 'זכוכית', phone: '', email: '', address: '', type: 'private' })
  }

  const selectedSupplier = suppliers.find(s => s.id === form.supplierId)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSupplierChange = (e) => {
    const s = suppliers.find(s => s.id === e.target.value)
    setForm(f => ({
      ...f,
      supplierId:    e.target.value,
      supplierName:  s?.name  || '',
      supplierType:  s?.type  || 'private',
      supplierPhone: s?.phone || '',
      supplierEmail: s?.email || '',
    }))
  }

  const handleQuoteChange = (e) => {
    const q = quotes.find(q => q.id === e.target.value)
    if (!q) { setForm(f => ({ ...f, quoteId: '' })); return }
    setForm(f => ({ ...f, quoteId: e.target.value, clientName: q?.clientName || '', projectName: q?.projectName || '' }))
    // Auto-fill items from quote panels/items
    const rows = []
    if (q.panels?.length > 0)
      q.panels.forEach((p, i) => rows.push({ desc: p.label || `פנל ${i + 1}`, dims: `${p.width}×${p.height}`, qty: 1 }))
    if (q.items?.length > 0)
      q.items.forEach(item => rows.push({ desc: item.name || '', dims: '', qty: item.qty || 1 }))
    if (rows.length > 0) setOrderItems(rows)
  }

  const addItem    = () => setOrderItems(p => [...p, { desc: '', dims: '', qty: 1 }])
  const removeItem = (i) => setOrderItems(p => p.filter((_, idx) => idx !== i))
  const updateItem = (i, k, v) => setOrderItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.supplierId) { setError('יש לבחור ספק'); return }
    const itemsText = orderItems.filter(i => i.desc)
      .map((it, i) => `${i + 1}. ${it.desc}${it.dims ? ' | ' + it.dims + ' מ"מ' : ''} × ${it.qty}`)
      .join('\n')
    setLoading(true)
    try {
      const data = { ...form, orderItems, items: itemsText }
      if (isEdit) {
        await updateOrder(uid, order.id, data)
      } else {
        // Generate confirm token for new orders so supplier gets a confirmation link
        const token = generateToken()
        data.confirmToken = token
        const orderRef = await addOrder(uid, data)
        const bizSnap = profile?.profile || {}
        await createSupplierToken(token, {
          uid,
          quoteId:       data.quoteId || '',
          orderId:       orderRef.id,
          supplierName:  data.supplierName  || '',
          supplierPhone: data.supplierPhone || '',
          items:         itemsText,
          orderItems,
          projectRef:    (data.quoteId || orderRef.id || '').slice(0, 8).toUpperCase(),
          projectName:   data.projectName || '',
          // NO clientName — supplier must not see end-client personal info
          biz: {
            name:       profile?.profile?.businessName || 'ONE MAN SHOW',
            logoUrl:    bizSnap.logoUrl    || '',
            vatId:      bizSnap.vatId      || '',
            phone:      bizSnap.phone      || '',
            phone2:     bizSnap.phone2     || '',
            whatsapp:   bizSnap.whatsapp   || '',
            email:      bizSnap.email      || '',
            website:    bizSnap.website    || '',
            address:    bizSnap.address    || '',
            instagram:  bizSnap.instagram  || '',
            facebook:   bizSnap.facebook   || '',
          },
        })
      }
      onClose()
    } catch { setError('שגיאה בשמירה') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-ink">{isEdit ? 'עריכת הזמנה' : 'הזמנה חדשה'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Supplier */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">ספק *</label>
              <button type="button"
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      onClick={() => setAddingSupplier(true)}>
                + ספק חדש
              </button>
            </div>
            <select className="input" value={form.supplierId} onChange={handleSupplierChange}>
              <option value="">— בחר ספק —</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.isPrimary ? ' ★' : ''}{s.active === false ? ' (לא פעיל)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Inline add-supplier form */}
          {addingSupplier && (
            <div className="bg-surface-50 rounded-xl p-4 space-y-3 border border-brand-200">
              <p className="text-sm font-semibold text-ink">הוספת ספק חדש</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">שם *</label>
                  <input className="input py-1.5 text-sm" placeholder="זכוכית ישראל"
                    value={newSupplier.name} onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label text-xs">קטגוריה</label>
                  <select className="input py-1.5 text-sm" value={newSupplier.category}
                          onChange={e => setNewSupplier(p => ({ ...p, category: e.target.value }))}>
                    {['זכוכית','פרזול','אלומיניום','סיליקון','אחר'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">טלפון / WhatsApp</label>
                  <input className="input py-1.5 text-sm" placeholder="050-..." dir="ltr"
                    value={newSupplier.phone} onChange={e => setNewSupplier(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label text-xs">אימייל</label>
                  <input className="input py-1.5 text-sm" type="email" dir="ltr"
                    value={newSupplier.email} onChange={e => setNewSupplier(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label text-xs">כתובת</label>
                <input className="input py-1.5 text-sm" placeholder="רחוב, עיר"
                  value={newSupplier.address} onChange={e => setNewSupplier(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-primary text-xs flex-1" onClick={handleSaveNewSupplier}>
                  שמור ספק
                </button>
                <button type="button" className="btn-ghost text-xs" onClick={() => setAddingSupplier(false)}>
                  ביטול
                </button>
              </div>
            </div>
          )}

          {/* Supplier contact info — shown after selection */}
          {selectedSupplier && !addingSupplier && (
            <div className="bg-surface-50 rounded-xl p-3 space-y-0.5 text-xs text-ink-muted border border-surface-200">
              {selectedSupplier.contactName && <p>👤 {selectedSupplier.contactName}</p>}
              {selectedSupplier.phone   && <p dir="ltr">📞 {selectedSupplier.phone}</p>}
              {selectedSupplier.email   && <p dir="ltr">✉️ {selectedSupplier.email}</p>}
              {selectedSupplier.address && <p>📍 {selectedSupplier.address}</p>}
            </div>
          )}

          {/* Quote */}
          <div>
            <label className="label">הצעת מחיר קשורה</label>
            <select className="input" value={form.quoteId} onChange={handleQuoteChange}>
              <option value="">— בחר הצעה (ימלא פריטים אוטומטית) —</option>
              {quotes.map(q => <option key={q.id} value={q.id}>{q.title || q.clientName}</option>)}
            </select>
          </div>

          {/* Structured items table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">פריטים להזמנה</label>
              <button type="button" className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      onClick={addItem}>+ הוסף שורה</button>
            </div>
            <div className="rounded-xl border border-surface-200 overflow-hidden">
              <div className="grid gap-0 text-xs font-medium text-ink-muted bg-surface-50 px-3 py-2"
                   style={{ gridTemplateColumns: '1fr 90px 50px 28px' }}>
                <span>תיאור / סוג</span>
                <span>מידות (מ"מ)</span>
                <span className="text-center">כמות</span>
                <span />
              </div>
              {orderItems.map((item, i) => (
                <div key={i} className="grid gap-1 px-2 py-1.5 border-t border-surface-100 items-center"
                     style={{ gridTemplateColumns: '1fr 90px 50px 28px' }}>
                  <input className="input py-1 text-sm" placeholder='זכוכית שקופה 8מ"מ'
                    value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} />
                  <input className="input py-1 text-sm" placeholder="800×2000"
                    value={item.dims} dir="ltr" onChange={e => updateItem(i, 'dims', e.target.value)} />
                  <input className="input py-1 text-sm text-center" type="number" min={1}
                    value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} />
                  <button type="button" onClick={() => removeItem(i)}
                          className="text-ink-subtle hover:text-danger text-base leading-none text-center">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Total + delivery date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">סה"כ הזמנה (₪)</label>
              <input className="input" type="number" min={0}
                value={form.totalAmount} onChange={set('totalAmount')} dir="ltr" />
            </div>
            <div>
              <label className="label">תאריך אספקה</label>
              <input className="input" type="date"
                value={form.deliveryDate || ''} onChange={set('deliveryDate')} dir="ltr" />
            </div>
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
