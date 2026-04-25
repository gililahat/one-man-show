// src/pages/clients/ClientsPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { subscribeClients, addClient, updateClient, deleteClient } from '@/firebase/db'
import ActionSwitch from '@/components/ui/ActionSwitch'
import { isAccountingEnabled, createCustomer as createAcctCustomer } from '@/integrations/accounting'
import useToastStore from '@/store/toastStore'

const EMPTY_FORM = { name: '', phone: '', email: '', address: '', notes: '', active: false }

// Sync a newly-created client to the accounting provider. Non-blocking.
async function syncNewClientToAccounting(uid, clientId, clientData, addToast) {
  try {
    const result = await createAcctCustomer(uid, {
      name:    clientData.name,
      phone:   clientData.phone,
      email:   clientData.email,
      address: clientData.address,
    })
    await updateClient(uid, clientId, {
      accounting: {
        externalId: result.externalId,
        provider:   result.provider,
        syncedAt:   new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[accounting] createCustomer failed:', err)
    addToast?.(`הלקוח נוצר באפליקציה, אך הסנכרון לחשבונאות נכשל: ${err.message}`, 'warning')
  }
}

export default function ClientsPage() {
  const uid                   = useAuthStore(s => s.uid())
  const navigate              = useNavigate()
  const [clients, setClients] = useState([])
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null) // null | 'add' | client object
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeClients(uid, (data) => {
      setClients(data)
      setLoading(false)
    })
    return unsub
  }, [uid])

  const filtered = clients.filter(c =>
    c.name?.includes(search) ||
    c.phone?.includes(search) ||
    c.email?.includes(search)
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">לקוחות</h1>
          <p className="text-sm text-ink-muted">{clients.length} לקוחות במערכת</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>
          + לקוח חדש
        </button>
      </div>

      {/* Search */}
      <input
        className="input max-w-sm"
        placeholder="חיפוש לפי שם, טלפון, אימייל..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* List */}
      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => setModal('add')} hasSearch={!!search} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <ClientCard
              key={c.id}
              client={c}
              uid={uid}
              onOpen={() => navigate(`/clients/${c.id}`)}
              onEdit={() => setModal(c)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ClientModal
          client={modal === 'add' ? null : modal}
          uid={uid}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )

  async function handleDelete(id) {
    if (!confirm('למחוק לקוח זה?')) return
    await deleteClient(uid, id)
  }
}

// ─── Client Card ──────────────────────────────────────────────
function ClientCard({ client, uid, onOpen, onEdit, onDelete }) {
  const initials = client.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'
  const isActive = !!client.active

  const handleActivate = async (val) => {
    await updateClient(uid, client.id, { active: val })
  }

  return (
    <div className="card overflow-hidden">

      {/* ── Tappable profile area ── */}
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-right flex items-center gap-3 hover:bg-surface-50 active:bg-surface-100 transition-colors rounded-xl p-1 -m-1"
      >
        <div
          className="w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center shrink-0 transition-colors duration-300"
          style={{
            background: isActive ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.06)',
            color:      isActive ? '#F5C518' : '#888',
          }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink truncate">{client.name}</p>
          {client.phone   && <p className="text-sm text-ink-muted truncate" dir="ltr">{client.phone}</p>}
          {client.email   && <p className="text-xs text-ink-subtle truncate" dir="ltr">{client.email}</p>}
          {client.address && <p className="text-xs text-ink-subtle truncate mt-0.5">📍 {client.address}</p>}
        </div>
        <span className="text-ink-subtle text-lg shrink-0">←</span>
      </button>

      {/* ── Bottom bar: toggle + actions ── */}
      <div className="mt-3 pt-3 border-t border-surface-300 flex items-center justify-between">
        <ActionSwitch
          label="הפעל לקוח"
          labelOn="לקוח פעיל"
          active={isActive}
          onToggle={handleActivate}
          color="gold"
        />
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={onEdit}>עריכה</button>
          <button className="btn-ghost text-xs text-danger" onClick={onDelete}>מחיקה</button>
        </div>
      </div>
    </div>
  )
}

// ─── Client Modal ─────────────────────────────────────────────
function ClientModal({ client, uid, onClose }) {
  const isEdit = !!client
  const [form, setForm]     = useState(client || EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const addToast            = useToastStore(s => s.addToast)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('שם הלקוח הוא שדה חובה'); return }
    setLoading(true)
    try {
      if (isEdit) {
        await updateClient(uid, client.id, form)
      } else {
        // Create locally first
        const ref = await addClient(uid, form)
        // Then sync to accounting provider in background (non-blocking)
        if (await isAccountingEnabled(uid)) {
          syncNewClientToAccounting(uid, ref.id, form, addToast)
        }
      }
      onClose()
    } catch {
      setError('שגיאה בשמירת הלקוח')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={isEdit ? 'עריכת לקוח' : 'לקוח חדש'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="שם מלא *"      value={form.name}    onChange={set('name')}    placeholder="ישראל ישראלי" />
        <Field label="טלפון"         value={form.phone}   onChange={set('phone')}   placeholder="050-0000000" dir="ltr" />
        <Field label="אימייל"        value={form.email}   onChange={set('email')}   placeholder="name@mail.com" type="email" dir="ltr" />
        <Field label="כתובת"         value={form.address} onChange={set('address')} placeholder="רחוב, עיר" />
        <div>
          <label className="label">הערות</label>
          <textarea className="input resize-none" rows={3}
            placeholder="פרטים נוספים..."
            value={form.notes} onChange={set('notes')} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'שומר...' : isEdit ? 'שמור שינויים' : 'הוסף לקוח'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>ביטול</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Shared ───────────────────────────────────────────────────
function Field({ label, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md
                      max-h-[90dvh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose}
                  className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3].map(i => (
        <div key={i} className="card animate-pulse">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-200 rounded w-3/4" />
              <div className="h-3 bg-surface-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onAdd, hasSearch }) {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <span className="text-5xl mb-4">👥</span>
      <p className="font-semibold text-ink mb-1">
        {hasSearch ? 'לא נמצאו לקוחות' : 'אין לקוחות עדיין'}
      </p>
      <p className="text-sm text-ink-muted mb-5">
        {hasSearch ? 'נסה חיפוש אחר' : 'הוסף את הלקוח הראשון שלך'}
      </p>
      {!hasSearch && (
        <button className="btn-primary" onClick={onAdd}>+ לקוח חדש</button>
      )}
    </div>
  )
}
