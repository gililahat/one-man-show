// src/pages/client-profile/ClientProfilePage.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import useAuthStore from '@/store/authStore'
import {
  subscribeClient, updateClient,
  subscribeQuotesByClient,
  getOrdersByClient, getProjectsByClientSub,
} from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'
import { findModel } from '@/utils/sirtoot/catalog'
import { computeShower } from '@/utils/sirtoot/rules'

// ─── Pipeline stages ──────────────────────────────────────────
const PIPELINE = [
  { key: 'lead',       label: 'ליד'       },
  { key: 'quoted',     label: 'הצעה'      },
  { key: 'approved',   label: 'אושר'      },
  { key: 'production', label: 'בביצוע'    },
  { key: 'done',       label: 'הושלם'     },
]

function deriveStage(quotes, orders, projects) {
  const hasApproved  = quotes.some(q => q.status === 'approved' || q.clientApproved || q.paymentConfirmed)
  const hasOrder     = orders.length > 0
  const hasDone      = projects.some(p => p.status === 'done' || p.status === 'completed')
  const hasProduction= projects.some(p => p.status === 'approved' || p.status === 'in_progress')
  const hasSent      = quotes.some(q => q.status === 'sent' || q.status === 'draft')
  const hasQuote     = quotes.length > 0

  if (hasDone)       return 'done'
  if (hasProduction) return 'production'
  if (hasOrder)      return 'production'
  if (hasApproved)   return 'approved'
  if (hasSent)       return 'quoted'
  if (hasQuote)      return 'quoted'
  return 'lead'
}

export default function ClientProfilePage() {
  const { id }     = useParams()
  const uid        = useAuthStore(s => s.uid())
  const navigate   = useNavigate()

  const [client,   setClient]   = useState(null)
  const [quotes,   setQuotes]   = useState([])
  const [orders,   setOrders]   = useState([])
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('quotes')
  const [editing,  setEditing]  = useState(false)

  useEffect(() => {
    if (!uid || !id) return
    const unsub = subscribeClient(uid, id, data => {
      setClient(data)
      setLoading(false)
    })
    return unsub
  }, [uid, id])

  useEffect(() => {
    if (!uid || !id || !client) return
    const unsubQuotes = subscribeQuotesByClient(uid, id, client.name, setQuotes)
    getOrdersByClient(uid, id, client.name).then(setOrders)
    const unsubProjects = getProjectsByClientSub(uid, id, client.name, setProjects)
    return () => { unsubQuotes(); unsubProjects?.() }
  }, [uid, id, client?.name]) // eslint-disable-line

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-xl bg-brand-600 animate-pulse" />
    </div>
  )
  if (!client) return (
    <div className="card text-center py-16">
      <p className="text-ink-muted mb-4">לקוח לא נמצא</p>
      <button className="btn-primary" onClick={() => navigate('/clients')}>חזור ללקוחות</button>
    </div>
  )

  const initials   = client.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'
  const waNum      = (client.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '972')
  const stage      = deriveStage(quotes, orders, projects)
  const stageIndex = PIPELINE.findIndex(s => s.key === stage)

  return (
    <div className="space-y-4 pb-8">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/clients')}
                className="p-2 rounded-xl text-ink-subtle hover:bg-surface-100 transition-colors text-xl">
          ←
        </button>
        <h1 className="page-title flex-1">{client.name}</h1>
        <button onClick={() => setEditing(true)}
                className="btn-secondary text-sm">
          ✏️ עריכה
        </button>
      </div>

      {/* ── Client card ─────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full font-bold text-lg flex items-center justify-center shrink-0"
               style={{ background: 'rgba(245,197,24,0.15)', color: '#F5C518' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="font-bold text-ink text-lg">{client.name}</p>
            {client.phone   && <p className="text-sm text-ink-muted" dir="ltr">{client.phone}</p>}
            {client.email   && <p className="text-xs text-ink-subtle" dir="ltr">{client.email}</p>}
            {client.address && <p className="text-xs text-ink-subtle">📍 {client.address}</p>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {client.phone && (
            <a href={`tel:${client.phone}`}
               className="btn-secondary text-sm flex items-center gap-1.5">
              📞 חייג
            </a>
          )}
          {waNum && (
            <a href={`https://wa.me/${waNum}`} target="_blank" rel="noopener noreferrer"
               className="btn-primary text-sm flex items-center gap-1.5">
              📱 ווצאפ
            </a>
          )}
          <button
            onClick={() => navigate(`/quote/new?clientId=${id}&clientName=${encodeURIComponent(client.name)}`)}
            className="btn-secondary text-sm flex items-center gap-1.5">
            🧮 הצעה חדשה
          </button>
        </div>

        {client.notes && (
          <p className="text-sm text-ink-muted border-t border-surface-100 pt-3">{client.notes}</p>
        )}
      </div>

      {/* ── Pipeline rail ────────────────────────────────────── */}
      <div className="card py-4" style={{ background: '#1e2330', border: '1px solid #2e3446' }}>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.1em' }}>סטטוס תיק לקוח</p>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#F5C518' }}>
            {PIPELINE[stageIndex]?.label}
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 rounded-full mb-5" style={{ background: '#2e3446' }}>
          <div className="absolute inset-y-0 right-0 rounded-full transition-all duration-500"
               style={{
                 background: 'linear-gradient(to left, #F5C518, #d4a800)',
                 width: `${(stageIndex / (PIPELINE.length - 1)) * 100}%`,
               }} />
        </div>

        {/* Stages row */}
        <div className="flex justify-between">
          {PIPELINE.map((s, i) => {
            const done    = i < stageIndex
            const current = i === stageIndex
            return (
              <div key={s.key} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                     style={{
                       background: done ? '#F5C518' : current ? '#F5C518' : '#2e3446',
                       color:      done || current ? '#1a1a2e' : '#64748b',
                       boxShadow:  current ? '0 0 0 3px rgba(245,197,24,0.3)' : 'none',
                       transform:  current ? 'scale(1.2)' : 'scale(1)',
                     }}>
                  {done ? '✓' : i + 1}
                </div>
                <span className="text-center leading-tight"
                      style={{
                        fontSize: 10,
                        fontWeight: current ? 700 : 500,
                        color: current ? '#F5C518' : done ? '#cbd5e1' : '#475569',
                      }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-surface-200 overflow-x-auto">
        {[
          { key: 'measurements', label: `מדידות (${(client.measurements || []).length})` },
          { key: 'quotes',       label: `הצעות מחיר (${quotes.length})`   },
          { key: 'orders',       label: `הזמנות (${orders.length})`        },
          { key: 'projects',     label: `פרויקטים (${projects.length})`    },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
                    ${tab === t.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────── */}
      {tab === 'measurements' && (
        <MeasurementsTab
          uid={uid}
          client={client}
          onNew={() => navigate(`/sirtoot?clientId=${id}&clientName=${encodeURIComponent(client.name)}`)}
          onOpen={(measId) => navigate(`/sirtoot?clientId=${id}&clientName=${encodeURIComponent(client.name)}&measurementId=${measId}`)}
        />
      )}

      {tab === 'quotes' && (
        <div className="space-y-3">
          {quotes.length === 0 ? (
            <EmptyTab text="אין הצעות מחיר עדיין"
              action={() => navigate(`/quote/new?clientId=${id}&clientName=${encodeURIComponent(client.name)}`)}
              actionLabel="צור הצעה" />
          ) : quotes.map(q => (
            <QuoteRow key={q.id} quote={q} onOpen={() => navigate(`/quote/${q.id}`)} />
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <EmptyTab text="אין הזמנות עדיין" />
          ) : orders.map(o => (
            <OrderRow key={o.id} order={o} onOpen={() => navigate(`/orders`)} />
          ))}
        </div>
      )}

      {tab === 'projects' && (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <EmptyTab text="אין פרויקטים עדיין" />
          ) : projects.map(p => (
            <ProjectRow key={p.id} project={p} onOpen={() => navigate(`/projects`)} />
          ))}
        </div>
      )}

      {/* ── Edit modal ──────────────────────────────────────── */}
      {editing && (
        <EditClientModal
          client={client}
          uid={uid}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}

// ─── Quote row ────────────────────────────────────────────────
function QuoteRow({ quote, onOpen }) {
  const STATUS = { draft:'טיוטה', sent:'נשלח', approved:'אושר', rejected:'נדחה', expired:'פג תוקף' }
  const COLOR  = { draft:'badge-neutral', sent:'badge-info', approved:'badge-success', rejected:'badge-danger', expired:'badge-warning' }
  const created = quote.createdAt?.toDate ? quote.createdAt.toDate() : new Date()
  const needsSketch = quote.complexity === 'ייצור אישי' || quote.complexity === 'עבודה מורכבת'

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3 cursor-pointer active:scale-[0.99]" onClick={onOpen}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-ink truncate">{quote.title || 'הצעת מחיר'}</p>
            <span className={`badge ${COLOR[quote.status] || 'badge-neutral'}`}>
              {STATUS[quote.status] || quote.status}
            </span>
          </div>
          <p className="text-xs text-ink-subtle mt-0.5">
            {format(created, 'd בMMM yyyy', { locale: he })}
            {quote.complexity ? ` · ${quote.complexity}` : ''}
          </p>
        </div>
        <div className="text-left shrink-0">
          <p className="font-bold text-ink">{formatCurrency(quote.result?.total || 0)}</p>
        </div>
        <span className="text-ink-subtle">←</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1 border-t border-surface-100">
        <button onClick={onOpen}
                className="btn-secondary text-xs flex items-center gap-1">
          📄 פתח הצעה
        </button>
        {needsSketch && (
          <button
            onClick={() => alert('סקיצה — בקרוב')}
            className="btn-secondary text-xs flex items-center gap-1 opacity-60">
            ✏️ סקיצה
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Order row ────────────────────────────────────────────────
function OrderRow({ order, onOpen }) {
  const created = order.createdAt?.toDate ? order.createdAt.toDate() : new Date()
  return (
    <div className="card flex items-center gap-3 cursor-pointer hover:shadow-card transition-shadow"
         onClick={onOpen}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink truncate">{order.title || order.supplierName || 'הזמנה'}</p>
        <p className="text-xs text-ink-subtle mt-0.5">{format(created, 'd בMMM yyyy', { locale: he })}</p>
      </div>
      <span className="text-ink-subtle text-lg">←</span>
    </div>
  )
}

// ─── Project row ──────────────────────────────────────────────
function ProjectRow({ project, onOpen }) {
  const STATUS = { approved:'בביצוע', done:'הושלם', completed:'הושלם', cancelled:'בוטל' }
  const COLOR  = { approved:'badge-info', done:'badge-success', completed:'badge-success', cancelled:'badge-danger' }
  return (
    <div className="card flex items-center gap-3 cursor-pointer hover:shadow-card transition-shadow"
         onClick={onOpen}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-ink truncate">{project.title || 'פרויקט'}</p>
          {project.status && (
            <span className={`badge ${COLOR[project.status] || 'badge-neutral'}`}>
              {STATUS[project.status] || project.status}
            </span>
          )}
        </div>
        {project.description && (
          <p className="text-xs text-ink-subtle mt-0.5 truncate">{project.description}</p>
        )}
      </div>
      <span className="text-ink-subtle text-lg">←</span>
    </div>
  )
}

// ─── Measurements tab ────────────────────────────────────────
function MeasurementsTab({ uid, client, onNew, onOpen }) {
  const measurements = client.measurements || []
  const handleDelete = async (measId, ev) => {
    ev.stopPropagation()
    if (!confirm('למחוק מדידה זו?')) return
    const next = measurements.filter(m => m.id !== measId)
    await updateClient(uid, client.id, { measurements: next })
  }
  return (
    <div className="space-y-3">
      <button className="btn-primary w-full text-sm py-3" onClick={onNew}>
        + הוסף מדידה חדשה (סירטוט)
      </button>
      {measurements.length === 0 ? (
        <div className="card flex flex-col items-center py-10 text-center">
          <p className="text-ink-muted text-sm">אין מדידות עדיין</p>
          <p className="text-ink-subtle text-xs mt-1">
            לחץ על "הוסף מדידה" כדי לסרטט מקלחון שמדדת אצל הלקוח
          </p>
        </div>
      ) : (
        measurements.map(m =>
          <MeasurementRow key={m.id}
            measurement={m}
            onOpen={() => onOpen(m.id)}
            onDelete={(ev) => handleDelete(m.id, ev)}
          />,
        )
      )}
    </div>
  )
}

function MeasurementRow({ measurement, onOpen, onDelete }) {
  const model = findModel(measurement.modelId)
  const summary = model
    ? (() => {
        try {
          const computed = computeShower({
            model, thickness: measurement.thickness,
            opening: { height: 1900 },
            panelInputs: measurement.panelInputs || [],
          })
          const widths = computed.map(p => p.gross.w).join(' + ')
          const h = computed[0]?.gross.h
          return `${widths} × ${h} מ״מ · זכוכית ${measurement.thickness} מ״מ`
        } catch { return '—' }
      })()
    : '—'
  return (
    <button onClick={onOpen}
            className="card flex items-center gap-3 w-full text-right hover:border-brand-400 hover:shadow-md transition cursor-pointer">
      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 text-lg">
        🚿
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink truncate">{measurement.name}</p>
        <p className="text-xs text-ink-muted truncate">
          {model?.label || measurement.modelId} · {summary}
        </p>
      </div>
      <span onClick={onDelete}
            className="p-2 rounded-lg text-ink-subtle hover:text-red-600 hover:bg-red-50 text-sm cursor-pointer">
        🗑️
      </span>
    </button>
  )
}

// ─── Empty tab ────────────────────────────────────────────────
function EmptyTab({ text, action, actionLabel }) {
  return (
    <div className="card flex flex-col items-center py-10 text-center">
      <p className="text-ink-muted text-sm">{text}</p>
      {action && (
        <button className="btn-primary mt-3 text-sm" onClick={action}>{actionLabel}</button>
      )}
    </div>
  )
}

// ─── Edit modal ───────────────────────────────────────────────
function EditClientModal({ client, uid, onClose }) {
  const [form, setForm]   = useState({ ...client })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    await updateClient(uid, client.id, form)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">עריכת לקוח</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">✕</button>
        </div>
        <Field label="שם מלא"  value={form.name}    onChange={set('name')}    placeholder="ישראל ישראלי" />
        <Field label="טלפון"   value={form.phone}   onChange={set('phone')}   placeholder="050-0000000" dir="ltr" />
        <Field label="אימייל"  value={form.email}   onChange={set('email')}   placeholder="name@mail.com" dir="ltr" />
        <Field label="כתובת"   value={form.address} onChange={set('address')} placeholder="רחוב, עיר" />
        <div>
          <label className="label">הערות</label>
          <textarea className="input resize-none" rows={3}
            value={form.notes || ''} onChange={set('notes')} placeholder="פרטים נוספים..." />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
          <button onClick={onClose} className="btn-secondary">ביטול</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  )
}
