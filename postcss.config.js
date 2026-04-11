// src/pages/quotes/QuotesPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import useAuthStore from '@/store/authStore'
import { subscribeQuotes, updateQuote, deleteQuote } from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'

const STATUSES = [
  { key: 'draft',    label: 'טיוטה',       color: 'badge-neutral' },
  { key: 'sent',     label: 'נשלח',         color: 'badge-info'    },
  { key: 'approved', label: 'אושר',         color: 'badge-success' },
  { key: 'rejected', label: 'נדחה',         color: 'badge-danger'  },
  { key: 'expired',  label: 'פג תוקף',     color: 'badge-warning' },
]

export default function QuotesPage() {
  const uid      = useAuthStore(s => s.uid())
  const navigate = useNavigate()
  const [quotes, setQuotes]       = useState([])
  const [filterStatus, setFilter] = useState('all')
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeQuotes(uid, data => { setQuotes(data); setLoading(false) })
    return unsub
  }, [uid])

  const filtered = filterStatus === 'all'
    ? quotes
    : quotes.filter(q => q.status === filterStatus)

  const handleDelete = async (id) => {
    if (!confirm('למחוק הצעת מחיר זו?')) return
    await deleteQuote(uid, id)
    if (selected?.id === id) setSelected(null)
  }

  const handleStatusChange = async (id, status) => {
    await updateQuote(uid, id, { status })
    if (selected?.id === id) setSelected(s => ({ ...s, status }))
  }

  // Totals
  const totalApproved = quotes
    .filter(q => q.status === 'approved')
    .reduce((s, q) => s + (q.result?.total || 0), 0)

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">הצעות מחיר</h1>
          <p className="text-sm text-ink-muted">{quotes.length} הצעות</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/calculator')}>
          + הצעה חדשה
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniKpi label="הכל"     value={quotes.length}                              active={filterStatus==='all'}     onClick={() => setFilter('all')} />
        <MiniKpi label="טיוטות"  value={quotes.filter(q=>q.status==='draft').length} active={filterStatus==='draft'}   onClick={() => setFilter('draft')} />
        <MiniKpi label="ממתין"   value={quotes.filter(q=>q.status==='sent').length}  active={filterStatus==='sent'}    onClick={() => setFilter('sent')} />
        <MiniKpi label="אושרו"   value={formatCurrency(totalApproved)}              active={filterStatus==='approved'} onClick={() => setFilter('approved')} green />
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* List */}
        <div className="space-y-3">
          {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
            <EmptyState navigate={navigate} hasFilter={filterStatus !== 'all'} />
          ) : (
            filtered.map(q => (
              <QuoteCard key={q.id} quote={q}
                isSelected={selected?.id === q.id}
                onClick={() => setSelected(q)}
                onDelete={() => handleDelete(q.id)}
                onStatusChange={(s) => handleStatusChange(q.id, s)}
                onCreateOrder={() => navigate(`/orders?quoteId=${q.id}&clientName=${encodeURIComponent(q.clientName||'')}&projectName=${encodeURIComponent(q.projectName||'')}&clientId=${q.clientId||''}&projectId=${q.projectId||''}`)}
                onCreateOutput={() => navigate(`/outputs?quoteId=${q.id}`)} />
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <QuoteDetail quote={selected} onClose={() => setSelected(null)}
            navigate={navigate}
            onDelete={() => handleDelete(selected.id)}
            onStatusChange={(s) => handleStatusChange(selected.id, s)} />
        )}
      </div>
    </div>
  )
}

// ─── Quote Card ───────────────────────────────────────────────
function QuoteCard({ quote, isSelected, onClick, onDelete, onStatusChange, onCreateOrder, onCreateOutput }) {
  const status  = STATUSES.find(s => s.key === quote.status) || STATUSES[0]
  const created = quote.createdAt?.toDate ? quote.createdAt.toDate() : new Date(quote.createdAt || Date.now())

  return (
    <div onClick={onClick}
         className={`card cursor-pointer transition-all hover:shadow-card
           ${isSelected ? 'ring-2 ring-brand-500 shadow-card' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink truncate">{quote.title || 'הצעת מחיר'}</p>
            <span className={`badge ${status.color}`}>{status.label}</span>
          </div>
          {quote.clientName && <p className="text-sm text-ink-muted mt-0.5">👤 {quote.clientName}</p>}
          <p className="text-xs text-ink-subtle mt-1">
            {format(created, 'd בMMM yyyy', { locale: he })}
          </p>
        </div>
        <div className="text-left shrink-0">
          <p className="font-bold text-ink text-lg">{formatCurrency(quote.result?.total || 0)}</p>
          <p className="text-xs text-ink-subtle">{quote.result?.totalArea?.toFixed(2)} מ"ר</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-surface-100">
        {quote.status === 'draft' && (
          <button className="btn-secondary text-xs" onClick={e => { e.stopPropagation(); onStatusChange('sent') }}>
            סמן כנשלח
          </button>
        )}
        {quote.status === 'sent' && (<>
          <button className="btn-primary text-xs" onClick={e => { e.stopPropagation(); onStatusChange('approved') }}>
            ✓ אושר
          </button>
          <button className="btn-ghost text-xs text-danger" onClick={e => { e.stopPropagation(); onStatusChange('rejected') }}>
            ✗ נדחה
          </button>
        </>)}
        {quote.status === 'approved' && (
          <button className="btn-primary text-xs" onClick={e => { e.stopPropagation(); onCreateOrder() }}>
            📦 צור הזמנה
          </button>
        )}
        {quote.status === 'approved' && (
          <button className="btn-secondary text-xs" onClick={e => { e.stopPropagation(); onCreateOutput() }}>
            📄 הפק פלט
          </button>
        )}
        <button className="btn-ghost text-xs text-danger mr-auto"
                onClick={e => { e.stopPropagation(); onDelete() }}>
          מחיקה
        </button>
      </div>
    </div>
  )
}

// ─── Quote Detail ─────────────────────────────────────────────
function QuoteDetail({ quote, onClose, onDelete, onStatusChange, navigate }) {
  const status = STATUSES.find(s => s.key === quote.status) || STATUSES[0]
  const r      = quote.result || {}

  return (
    <div className="card sticky top-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-ink">{quote.title}</h3>
          {quote.clientName && <p className="text-sm text-ink-muted">👤 {quote.clientName}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100 text-xs">✕</button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-muted">סטטוס:</span>
        <span className={`badge ${status.color}`}>{status.label}</span>
      </div>

      {/* Panels breakdown */}
      {quote.panels?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">פנלים</p>
          <div className="space-y-1.5">
            {quote.panels.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">{p.label || `פנל ${i+1}`} ({p.width}×{p.height})</span>
                <span className="font-medium text-ink">
                  {formatCurrency(quote.result?.panelResults?.[i]?.panelPrice || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="rounded-xl bg-surface-50 p-3 space-y-2 text-sm">
        <DetailRow label="זכוכית"   value={formatCurrency(r.glassSubtotal   || 0)} />
        <DetailRow label="פרופיל"   value={formatCurrency(r.profileCost     || 0)} />
        <DetailRow label="פרזול"    value={formatCurrency(r.hardwareCost    || 0)} />
        <DetailRow label="התקנה"   value={formatCurrency(r.installCost     || 0)} />
        {r.discountAmount > 0 && (
          <DetailRow label={`הנחה (${quote.config?.discountPct}%)`}
                     value={`− ${formatCurrency(r.discountAmount)}`} className="text-success" />
        )}
        <DetailRow label={`מע"מ (${r.vatPct}%)`} value={formatCurrency(r.vatAmount || 0)} />
        <div className="border-t border-surface-200 pt-2 flex items-center justify-between font-bold">
          <span>סה"כ</span>
          <span className="text-brand-600 text-base">{formatCurrency(r.total || 0)}</span>
        </div>
      </div>

      {quote.notes && (
        <div>
          <p className="text-xs font-semibold text-ink-muted mb-1">הערות</p>
          <p className="text-sm text-ink">{quote.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-1">
        {quote.status === 'draft' && (
          <button className="btn-primary w-full text-sm" onClick={() => onStatusChange('sent')}>
            📤 סמן כנשלח ללקוח
          </button>
        )}
        {quote.status === 'sent' && (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary text-sm" onClick={() => onStatusChange('approved')}>✓ אושר</button>
            <button className="btn-secondary text-sm text-danger" onClick={() => onStatusChange('rejected')}>✗ נדחה</button>
          </div>
        )}
        {quote.status === 'approved' && (<>
          <button className="btn-primary w-full text-sm"
            onClick={() => navigate(`/orders?quoteId=${quote.id}&clientName=${encodeURIComponent(quote.clientName||'')}&projectName=${encodeURIComponent(quote.projectName||'')}&clientId=${quote.clientId||''}&projectId=${quote.projectId||''}`)}>
            📦 צור הזמנה לספק
          </button>
          <button className="btn-secondary w-full text-sm"
            onClick={() => navigate(`/outputs?quoteId=${quote.id}`)}>
            📄 הפק פלט
          </button>
        </>)}
        <button className="btn-ghost w-full text-sm text-danger" onClick={onDelete}>מחיקה</button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────
function DetailRow({ label, value, className }) {
  return (
    <div className={`flex items-center justify-between ${className || ''}`}>
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

function MiniKpi({ label, value, active, onClick, green }) {
  return (
    <button onClick={onClick}
      className={`card text-center py-3 transition-all hover:shadow-card
        ${active ? 'ring-2 ring-brand-500' : ''}`}>
      <p className={`text-lg font-bold ${green ? 'text-success' : 'text-ink'}`}>{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="card animate-pulse flex gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-200 rounded w-1/2" />
            <div className="h-3 bg-surface-100 rounded w-1/3" />
          </div>
          <div className="w-20 h-8 bg-surface-200 rounded" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ navigate, hasFilter }) {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <span className="text-5xl mb-4">📋</span>
      <p className="font-semibold text-ink mb-1">{hasFilter ? 'אין הצעות בסטטוס זה' : 'אין הצעות מחיר עדיין'}</p>
      <p className="text-sm text-ink-muted mb-5">צור הצעה חדשה מהמחשבון</p>
      {!hasFilter && (
        <button className="btn-primary" onClick={() => navigate('/calculator')}>
          פתח מחשבון
        </button>
      )}
    </div>
  )
}
