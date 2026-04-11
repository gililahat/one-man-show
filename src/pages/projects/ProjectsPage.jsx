// src/pages/projects/ProjectsPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import {
  subscribeProjects, addProject, updateProject, deleteProject,
  getClients, getQuotesByProject, getOrdersByProject,
} from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'

const STATUSES = [
  { key: 'new',        label: 'חדש',         color: 'badge-info'    },
  { key: 'measured',   label: 'מדוד',        color: 'badge-warning' },
  { key: 'quoted',     label: 'הוצע מחיר',   color: 'badge-neutral' },
  { key: 'approved',   label: 'אושר',        color: 'badge-success' },
  { key: 'production', label: 'בייצור',      color: 'badge-warning' },
  { key: 'installed',  label: 'הותקן',       color: 'badge-success' },
  { key: 'completed',  label: 'הושלם',       color: 'badge-neutral' },
]

const EMPTY_FORM = { title: '', clientId: '', clientName: '', status: 'new', description: '', notes: '' }

export default function ProjectsPage() {
  const uid      = useAuthStore(s => s.uid())
  const navigate = useNavigate()
  const [projects, setProjects]   = useState([])
  const [clients, setClients]     = useState([])
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [modal, setModal]         = useState(null)
  const [detailProject, setDetail]= useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeProjects(uid, data => { setProjects(data); setLoading(false) })
    getClients(uid).then(setClients)
    return unsub
  }, [uid])

  const filtered = projects.filter(p => {
    const matchSearch = p.title?.includes(search) || p.clientName?.includes(search)
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleDelete = async (id) => {
    if (!confirm('למחוק פרויקט זה?')) return
    await deleteProject(uid, id)
    if (detailProject?.id === id) setDetail(null)
  }

  const handleCreateQuote = (project) => {
    navigate(`/calculator?clientId=${project.clientId}&clientName=${encodeURIComponent(project.clientName||'')}&projectId=${project.id}&projectName=${encodeURIComponent(project.title)}`)
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">פרויקטים</h1>
          <p className="text-sm text-ink-muted">{projects.length} פרויקטים</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>+ פרויקט חדש</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input className="input flex-1 max-w-xs" placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          <FilterBtn active={filterStatus === 'all'} onClick={() => setFilter('all')}>הכל</FilterBtn>
          {STATUSES.map(s => (
            <FilterBtn key={s.key} active={filterStatus === s.key} onClick={() => setFilter(s.key)}>{s.label}</FilterBtn>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${detailProject ? 'lg:grid-cols-[1fr_380px]' : ''}`}>
        <div className="space-y-3">
          {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
            <EmptyState onAdd={() => setModal('add')} hasSearch={!!search || filterStatus !== 'all'} />
          ) : (
            filtered.map(p => (
              <ProjectRow key={p.id} project={p}
                isSelected={detailProject?.id === p.id}
                onClick={() => setDetail(p)}
                onEdit={() => setModal(p)}
                onDelete={() => handleDelete(p.id)}
                onCreateQuote={() => handleCreateQuote(p)}
              />
            ))
          )}
        </div>
        {detailProject && (
          <ProjectDetailPanel project={detailProject} uid={uid}
            onClose={() => setDetail(null)}
            onEdit={() => setModal(detailProject)}
            onCreateQuote={() => handleCreateQuote(detailProject)}
            navigate={navigate}
          />
        )}
      </div>

      {modal && (
        <ProjectModal project={modal === 'add' ? null : modal}
          uid={uid} clients={clients} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function ProjectRow({ project, isSelected, onClick, onEdit, onDelete, onCreateQuote }) {
  const status = STATUSES.find(s => s.key === project.status) || STATUSES[0]
  return (
    <div onClick={onClick}
         className={`card cursor-pointer flex items-center gap-4 hover:shadow-card transition-all group ${isSelected ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 text-xl">📁</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-ink">{project.title}</p>
          <span className={`badge ${status.color}`}>{status.label}</span>
        </div>
        {project.clientName && <p className="text-sm text-ink-muted mt-0.5">👤 {project.clientName}</p>}
        {project.description && <p className="text-xs text-ink-subtle mt-0.5 truncate">{project.description}</p>}
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
        <button className="btn-primary text-xs" onClick={onCreateQuote}>+ הצעה</button>
        <button className="btn-secondary text-xs" onClick={onEdit}>עריכה</button>
        <button className="btn-ghost text-xs text-danger" onClick={onDelete}>מחיקה</button>
      </div>
    </div>
  )
}

function ProjectDetailPanel({ project, uid, onClose, onEdit, onCreateQuote, navigate }) {
  const [quotes, setQuotes] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getQuotesByProject(uid, project.id), getOrdersByProject(uid, project.id)])
      .then(([q, o]) => { setQuotes(q); setOrders(o); setLoading(false) })
  }, [project.id, uid])

  const status = STATUSES.find(s => s.key === project.status) || STATUSES[0]
  const totalQuoted = quotes.reduce((s, q) => s + (q.result?.total || 0), 0)

  return (
    <div className="card sticky top-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-ink">{project.title}</h3>
          {project.clientName && <p className="text-sm text-ink-muted">👤 {project.clientName}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100 text-xs">✕</button>
      </div>
      <span className={`badge ${status.color}`}>{status.label}</span>
      {project.description && <p className="text-sm text-ink-muted">{project.description}</p>}

      <div className="space-y-2">
        <button className="btn-primary w-full text-sm" onClick={onCreateQuote}>🧮 צור הצעת מחיר</button>
        <button className="btn-secondary w-full text-sm" onClick={onEdit}>✏️ ערוך פרויקט</button>
      </div>

      <LinkedSection title={`הצעות מחיר (${quotes.length})`} extra={totalQuoted > 0 ? formatCurrency(totalQuoted) : null} loading={loading} empty="אין הצעות מחיר עדיין">
        {quotes.map(q => (
          <LinkedItem key={q.id} label={q.title || 'הצעת מחיר'} value={formatCurrency(q.result?.total||0)}
            status={q.status} statusColors={{ draft:'badge-neutral', sent:'badge-info', approved:'badge-success', rejected:'badge-danger' }}
            statusLabels={{ draft:'טיוטה', sent:'נשלח', approved:'אושר', rejected:'נדחה' }}
            onClick={() => navigate('/quotes')} />
        ))}
      </LinkedSection>

      <LinkedSection title={`הזמנות ספקים (${orders.length})`} loading={loading} empty="אין הזמנות עדיין">
        {orders.map(o => (
          <LinkedItem key={o.id} label={o.supplierName || 'ספק'} value={o.totalAmount ? formatCurrency(o.totalAmount) : ''}
            status={o.status} statusColors={{ draft:'badge-neutral', sent:'badge-info', confirmed:'badge-success', in_prod:'badge-warning', ready:'badge-success', delivered:'badge-neutral' }}
            statusLabels={{ draft:'טיוטה', sent:'נשלח', confirmed:'אושר', in_prod:'בייצור', ready:'מוכן', delivered:'סופק' }}
            onClick={() => navigate('/orders')} />
        ))}
      </LinkedSection>
    </div>
  )
}

function LinkedSection({ title, extra, loading, empty, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{title}</p>
        {extra && <span className="text-xs font-medium text-brand-600">{extra}</span>}
      </div>
      {loading ? <div className="h-8 bg-surface-100 rounded-xl animate-pulse" />
        : React.Children.count(children) === 0 ? <p className="text-xs text-ink-subtle py-2">{empty}</p>
        : <div className="space-y-1.5">{children}</div>}
    </div>
  )
}

function LinkedItem({ label, value, status, statusColors, statusLabels, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors text-right">
      <span className="text-sm text-ink truncate flex-1">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {value && <span className="text-xs font-medium text-brand-600">{value}</span>}
        <span className={`badge ${statusColors[status]||'badge-neutral'}`}>{statusLabels[status]||status}</span>
      </div>
    </button>
  )
}

function ProjectModal({ project, uid, clients, onClose }) {
  const isEdit = !!project
  const [form, setForm] = useState(project || EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const handleClientChange = e => {
    const c = clients.find(c => c.id === e.target.value)
    setForm(f => ({ ...f, clientId: e.target.value, clientName: c?.name || '' }))
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('שם הפרויקט הוא שדה חובה'); return }
    setLoading(true)
    try {
      if (isEdit) await updateProject(uid, project.id, form)
      else        await addProject(uid, form)
      onClose()
    } catch { setError('שגיאה בשמירה') } finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md max-h-[90dvh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-ink">{isEdit ? 'עריכת פרויקט' : 'פרויקט חדש'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">שם *</label><input className="input" value={form.title} onChange={set('title')} /></div>
          <div><label className="label">לקוח</label>
            <select className="input" value={form.clientId} onChange={handleClientChange}>
              <option value="">— בחר לקוח —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">סטטוס</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div><label className="label">תיאור</label><textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} /></div>
          <div><label className="label">הערות</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} /></div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'שומר...' : isEdit ? 'שמור' : 'צור'}</button>
            <button type="button" className="btn-secondary" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return <button onClick={onClick} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${active ? 'bg-brand-600 text-white' : 'bg-surface-100 text-ink-muted hover:bg-surface-200'}`}>{children}</button>
}
function LoadingSkeleton() {
  return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="card animate-pulse flex gap-4"><div className="w-10 h-10 rounded-xl bg-surface-200 shrink-0"/><div className="flex-1 space-y-2"><div className="h-4 bg-surface-200 rounded w-1/2"/><div className="h-3 bg-surface-100 rounded w-1/3"/></div></div>)}</div>
}
function EmptyState({ onAdd, hasSearch }) {
  return <div className="card flex flex-col items-center py-16 text-center"><span className="text-5xl mb-4">📁</span><p className="font-semibold text-ink mb-1">{hasSearch ? 'לא נמצאו פרויקטים' : 'אין פרויקטים עדיין'}</p><p className="text-sm text-ink-muted mb-5">{hasSearch ? 'נסה חיפוש אחר' : 'צור את הפרויקט הראשון'}</p>{!hasSearch&&<button className="btn-primary" onClick={onAdd}>+ פרויקט חדש</button>}</div>
}

import React from 'react'
