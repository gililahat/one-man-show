// src/pages/suppliers/SuppliersPage.jsx
import { useEffect, useState } from 'react'
import useAuthStore from '@/store/authStore'
import { subscribeSuppliers, addSupplier, updateSupplier, deleteSupplier } from '@/firebase/db'

const TYPES = [
  { key: 'platform', label: 'מחובר למערכת', desc: 'מעקב הזמנות ועמלות', badge: 'badge-success' },
  { key: 'private',  label: 'ספק פרטי',      desc: 'שליחת קובץ בלבד',   badge: 'badge-neutral' },
]

const CATEGORIES = ['זכוכית', 'פרזול', 'אלומיניום', 'סיליקון', 'אחר']

const EMPTY = {
  name: '', type: 'private', category: 'זכוכית',
  phone: '', email: '', contactName: '', notes: '',
  commissionRate: 0,
}

export default function SuppliersPage() {
  const uid = useAuthStore(s => s.uid())
  const [suppliers, setSuppliers] = useState([])
  const [modal, setModal]         = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!uid) return
    return subscribeSuppliers(uid, data => { setSuppliers(data); setLoading(false) })
  }, [uid])

  const platform = suppliers.filter(s => s.type === 'platform')
  const privates = suppliers.filter(s => s.type === 'private')

  const handleDelete = async (id) => {
    if (!confirm('למחוק ספק זה?')) return
    await deleteSupplier(uid, id)
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">ספקים</h1>
          <p className="text-sm text-ink-muted">{suppliers.length} ספקים</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>+ ספק חדש</button>
      </div>

      {/* Type explanation cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {TYPES.map(t => (
          <div key={t.key} className="card flex items-start gap-3">
            <span className={`badge ${t.badge} mt-0.5`}>{t.label}</span>
            <p className="text-sm text-ink-muted">{t.desc}</p>
          </div>
        ))}
      </div>

      {loading ? <LoadingSkeleton /> : suppliers.length === 0 ? (
        <EmptyState onAdd={() => setModal('add')} />
      ) : (
        <div className="space-y-5">
          {platform.length > 0 && (
            <SupplierGroup title="ספקי פלטפורמה" suppliers={platform}
              onEdit={s => setModal(s)} onDelete={handleDelete} />
          )}
          {privates.length > 0 && (
            <SupplierGroup title="ספקים פרטיים" suppliers={privates}
              onEdit={s => setModal(s)} onDelete={handleDelete} />
          )}
        </div>
      )}

      {modal && (
        <SupplierModal
          supplier={modal === 'add' ? null : modal}
          uid={uid}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function SupplierGroup({ title, suppliers, onEdit, onDelete }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">{title}</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {suppliers.map(s => (
          <SupplierCard key={s.id} supplier={s} onEdit={() => onEdit(s)} onDelete={() => onDelete(s.id)} />
        ))}
      </div>
    </div>
  )
}

function SupplierCard({ supplier, onEdit, onDelete }) {
  const type = TYPES.find(t => t.key === supplier.type) || TYPES[1]
  return (
    <div className="card group hover:shadow-card transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-ink">{supplier.name}</p>
          <p className="text-xs text-ink-muted">{supplier.category}</p>
        </div>
        <span className={`badge ${type.badge} shrink-0`}>{type.label}</span>
      </div>

      {supplier.contactName && (
        <p className="text-sm text-ink-muted">👤 {supplier.contactName}</p>
      )}
      {supplier.phone && (
        <a href={`tel:${supplier.phone}`}
           className="text-sm text-brand-600 hover:text-brand-700 block" dir="ltr">
          {supplier.phone}
        </a>
      )}
      {supplier.type === 'platform' && supplier.commissionRate > 0 && (
        <p className="text-xs text-success mt-1">עמלה: {supplier.commissionRate}%</p>
      )}
      {supplier.notes && (
        <p className="text-xs text-ink-subtle mt-1 truncate">{supplier.notes}</p>
      )}

      <div className="flex gap-2 mt-3 pt-3 border-t border-surface-100
                      opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="btn-secondary text-xs flex-1" onClick={onEdit}>עריכה</button>
        <button className="btn-ghost text-xs text-danger flex-1" onClick={onDelete}>מחיקה</button>
      </div>
    </div>
  )
}

function SupplierModal({ supplier, uid, onClose }) {
  const isEdit = !!supplier
  const [form, setForm]     = useState(supplier || EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('שם הספק הוא שדה חובה'); return }
    setLoading(true)
    try {
      if (isEdit) await updateSupplier(uid, supplier.id, form)
      else        await addSupplier(uid, form)
      onClose()
    } catch { setError('שגיאה בשמירה') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md max-h-[90dvh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-ink">{isEdit ? 'עריכת ספק' : 'ספק חדש'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">שם הספק *</label>
            <input className="input" placeholder="זכוכית ישראל" value={form.name} onChange={set('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">סוג ספק</label>
              <select className="input" value={form.type} onChange={set('type')}>
                {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">קטגוריה</label>
              <select className="input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">שם איש קשר</label>
              <input className="input" placeholder="שם" value={form.contactName} onChange={set('contactName')} />
            </div>
            <div>
              <label className="label">טלפון</label>
              <input className="input" placeholder="050-..." value={form.phone} onChange={set('phone')} dir="ltr" />
            </div>
          </div>
          <div>
            <label className="label">אימייל</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} dir="ltr" />
          </div>
          {form.type === 'platform' && (
            <div>
              <label className="label">עמלה (%)</label>
              <input className="input max-w-xs" type="number" min={0} max={30}
                value={form.commissionRate} onChange={set('commissionRate')} dir="ltr" />
            </div>
          )}
          <div>
            <label className="label">הערות</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'שומר...' : isEdit ? 'שמור' : 'הוסף ספק'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {[1,2,3].map(i => (
        <div key={i} className="card animate-pulse space-y-2">
          <div className="h-4 bg-surface-200 rounded w-2/3" />
          <div className="h-3 bg-surface-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <span className="text-5xl mb-4">🏭</span>
      <p className="font-semibold text-ink mb-1">אין ספקים עדיין</p>
      <p className="text-sm text-ink-muted mb-5">הוסף ספקי זכוכית, פרזול ועוד</p>
      <button className="btn-primary" onClick={onAdd}>+ ספק חדש</button>
    </div>
  )
}
