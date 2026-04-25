// src/pages/expenses/ExpensesPage.jsx
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { addMonths, subMonths, format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns'
import { he } from 'date-fns/locale'
import useAuthStore from '@/store/authStore'
import { subscribeExpenses, addExpense, updateExpense, deleteExpense, getProjects } from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'
import useGlobalSettings from '@/hooks/useGlobalSettings'

const DEFAULT_CATEGORIES = [
  { key: 'materials',  label: 'חומרים',       color: '#3B82F6' },
  { key: 'tools',      label: 'כלים וציוד',   color: '#8B5CF6' },
  { key: 'transport',  label: 'תחבורה',        color: '#F59E0B' },
  { key: 'marketing',  label: 'שיווק',         color: '#EC4899' },
  { key: 'office',     label: 'משרד',          color: '#10B981' },
  { key: 'other',      label: 'אחר',           color: '#6B7280' },
]

const EMPTY_FORM = {
  description: '',
  categoryKey: 'other',
  amount:      '',
  date:        format(new Date(), 'yyyy-MM-dd'),
  notes:       '',
  projectId:   '',
  projectName: '',
}

// ─── useCountUp ───────────────────────────────────────────────
function useCountUp(target, duration = 600) {
  const [value,  setValue]  = useState(0)
  const rafRef              = useRef(null)
  const fromRef             = useRef(0)

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const from      = fromRef.current
    const startTime = performance.now()

    const tick = (now) => {
      const t     = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
        setValue(target)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

// ─── Page ─────────────────────────────────────────────────────
export default function ExpensesPage() {
  const uid = useAuthStore(s => s.uid())
  const { settings } = useGlobalSettings()
  const categories = settings?.expenseCategories?.length ? settings.expenseCategories : DEFAULT_CATEGORIES

  const [expenses,        setExpenses]        = useState([])
  const [projects,        setProjects]        = useState([])
  const [currentDate,     setCurrentDate]     = useState(new Date())
  const [modal,           setModal]           = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [newlyAddedId,    setNewlyAddedId]    = useState(null)
  const [toastMsg,        setToastMsg]        = useState(null)
  const [progressMounted, setProgressMounted] = useState(false)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeExpenses(uid, data => { setExpenses(data); setLoading(false) })
    getProjects(uid).then(setProjects)
    return unsub
  }, [uid])

  // Animate progress bars on mount and month change
  useEffect(() => {
    setProgressMounted(false)
    const t = setTimeout(() => setProgressMounted(true), 80)
    return () => clearTimeout(t)
  }, [currentDate])

  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)

  const monthExpenses = useMemo(() =>
    expenses.filter(e => {
      try { return isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd }) }
      catch { return false }
    }),
    [expenses, currentDate] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const monthTotal    = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const animatedTotal = useCountUp(monthTotal)

  // Expenses not linked to a project = might need assignment
  const pendingReview = monthExpenses.filter(e => !e.projectId).length

  const catTotals = useMemo(() => {
    const map = {}
    for (const e of monthExpenses) {
      map[e.categoryKey] = (map[e.categoryKey] || 0) + (Number(e.amount) || 0)
    }
    return map
  }, [monthExpenses])

  const handleDelete = async (id) => {
    if (!confirm('למחוק הוצאה זו?')) return
    await deleteExpense(uid, id)
  }

  const handleSaved = useCallback((id) => {
    setNewlyAddedId(id)
    setToastMsg('ההוצאה נשמרה ✓')
    setTimeout(() => setNewlyAddedId(null), 2200)
    setTimeout(() => setToastMsg(null),     2700)
  }, [])

  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: he })

  return (
    <div className="space-y-5 pb-4">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">הוצאות 💰</h1>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs px-2.5 py-1.5"
                  onClick={() => setCurrentDate(d => subMonths(d, 1))}>←</button>
          <span className="text-sm text-ink-muted font-medium">{monthLabel}</span>
          <button className="btn-ghost text-xs px-2.5 py-1.5"
                  onClick={() => setCurrentDate(d => addMonths(d, 1))}>→</button>
        </div>
      </div>

      {/* ── Hero card ───────────────────────────────────── */}
      <div className="card text-center py-8 relative overflow-hidden">
        {/* Subtle gold radial glow behind number */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(245,197,24,0.06) 0%, transparent 70%)' }} />

        <p className="text-2xl font-bold text-ink mb-4">הכסף שחוזר אליך</p>

        <p className="text-5xl font-bold text-brand-400 tabular-nums mb-2 leading-none">
          {formatCurrency(animatedTotal)}
        </p>
        <p className="text-sm text-ink-subtle">חזר אליך החודש</p>

        {/* Stats pills */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <span className="px-3 py-1.5 rounded-full bg-surface-300 text-ink-muted text-xs font-medium">
            {monthExpenses.length} חשבוניות
          </span>
          {pendingReview > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-amber-400/10 text-amber-400 text-xs font-medium">
              {pendingReview} לבדיקה
            </span>
          )}
        </div>
      </div>

      {/* ── Action buttons ───────────────────────────────── */}
      <div className="space-y-3">
        <ScanButton />
        <button
          onClick={() => setModal('add')}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl
                     bg-surface-200 text-ink font-medium text-base border border-surface-300
                     active:scale-[0.98] transition-transform duration-100 hover:bg-surface-300"
        >
          <span className="text-lg">✏️</span>
          הוסף ידנית
        </button>
      </div>

      {/* ── Category breakdown (collapsible) ─────────────── */}
      {monthTotal > 0 && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-ink-muted">פירוט לפי קטגוריה</h2>
          <div className="space-y-2.5">
            {categories.map(cat => {
              const total = catTotals[cat.key] || 0
              if (total === 0) return null
              const pct = Math.round((total / monthTotal) * 100)
              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-ink-muted">{cat.label}</span>
                    <span className="text-xs font-medium text-ink tabular-nums">
                      {formatCurrency(total)}
                      <span className="text-ink-subtle ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-300 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width:           progressMounted ? `${pct}%` : '0%',
                        backgroundColor: cat.color,
                        transition:      'width 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Expense list ─────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-ink-muted mb-3">הוצאות אחרונות</h2>
        {loading ? (
          <LoadingSkeleton />
        ) : monthExpenses.length === 0 ? (
          <EmptyState onAdd={() => setModal('add')} />
        ) : (
          <div className="space-y-2">
            {monthExpenses.map(e => {
              const cat = categories.find(c => c.key === e.categoryKey) || categories.at(-1)
              return (
                <ExpenseRow key={e.id} expense={e} cat={cat}
                  isNew={e.id === newlyAddedId}
                  onEdit={() => setModal(e)}
                  onDelete={() => handleDelete(e.id)} />
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────── */}
      {modal && (
        <ExpenseModal
          expense={modal === 'add' ? null : modal}
          uid={uid}
          categories={categories}
          projects={projects}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────── */}
      {toastMsg && <SuccessToast message={toastMsg} />}
    </div>
  )
}

// ─── Scan button (primary CTA) ────────────────────────────────
function ScanButton() {
  const [scanning, setScanning] = useState(false)

  const handleClick = () => {
    if (scanning) return
    setScanning(true)
    setTimeout(() => setScanning(false), 1800)
  }

  return (
    <button
      onClick={handleClick}
      className={[
        'w-full flex items-center justify-center gap-3 py-4 rounded-2xl',
        'font-semibold text-base transition-all duration-100',
        scanning
          ? 'bg-brand-500 text-black scale-[0.99] animate-gold-pulse'
          : 'bg-brand-400 text-black hover:bg-brand-300 active:scale-[0.98]',
      ].join(' ')}
    >
      {scanning ? (
        <>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-black/30 animate-pulse-bar" />
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-black/30 animate-pulse-bar [animation-delay:0.2s]" />
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-black/30 animate-pulse-bar [animation-delay:0.4s]" />
          <span className="mr-1">מנתח קבלה...</span>
        </>
      ) : (
        <>
          <span className="text-lg">📷</span>
          סרוק קבלה
        </>
      )}
    </button>
  )
}

// ─── Row ──────────────────────────────────────────────────────
function ExpenseRow({ expense, cat, onEdit, onDelete, isNew }) {
  return (
    <div className={[
      'group flex items-center gap-3 px-4 py-3.5 rounded-2xl',
      'bg-surface-200 border border-surface-300',
      'hover:border-surface-400 transition-colors duration-150',
      isNew ? 'animate-slide-up animate-flash-green' : '',
    ].join(' ')}>
      {/* Category color stripe */}
      <div className="w-1 self-stretch rounded-full shrink-0"
           style={{ backgroundColor: cat?.color || '#6B7280', minHeight: '2rem' }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink text-sm leading-snug truncate">{expense.description}</p>
        <p className="text-xs text-ink-subtle mt-0.5">
          <span className="text-ink-muted font-medium tabular-nums">{formatCurrency(Number(expense.amount))}</span>
          {' · '}{expense.date}
          {' · '}{cat?.label}
          {expense.projectName && <span> · 📁 {expense.projectName}</span>}
        </p>
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
           onClick={e => e.stopPropagation()}>
        <button onClick={onEdit}
                className="p-2 rounded-xl hover:bg-surface-400 text-ink-subtle text-xs transition-colors active:scale-90">
          ✏️
        </button>
        <button onClick={onDelete}
                className="p-2 rounded-xl hover:bg-red-500/10 text-danger text-xs transition-colors active:scale-90">
          🗑
        </button>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────
function ExpenseModal({ expense, uid, categories, projects, onClose, onSaved }) {
  const isEdit = !!expense
  const [form,     setForm]     = useState(expense || EMPTY_FORM)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const handleProjectChange = e => {
    const p = projects.find(p => p.id === e.target.value)
    setForm(f => ({ ...f, projectId: e.target.value, projectName: p?.title || '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) { setError('תיאור הוצאה הוא שדה חובה'); return }
    if (!form.amount || isNaN(Number(form.amount))) { setError('יש להזין סכום תקין'); return }
    if (!form.date) { setError('יש לבחור תאריך'); return }
    setLoading(true)
    try {
      const data = { ...form, amount: Number(form.amount) }
      if (isEdit) {
        await updateExpense(uid, expense.id, data)
        onSaved?.(expense.id)
      } else {
        const ref = await addExpense(uid, data)
        onSaved?.(ref?.id)
      }
      onClose()
    } catch { setError('שגיאה בשמירה') } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-surface-200 rounded-2xl border border-surface-300 shadow-modal
                      w-full max-w-md max-h-[90dvh] overflow-y-auto p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-ink">{isEdit ? 'עריכת הוצאה' : 'הוצאה חדשה'}</h3>
          <button onClick={onClose}
                  className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-300 active:scale-90 transition-all">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">תיאור *</label>
            <input className="input" value={form.description} onChange={set('description')}
                   placeholder="לדוג׳ חומרי זכוכית" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">קטגוריה</label>
              <select className="input" value={form.categoryKey} onChange={set('categoryKey')}>
                {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">סכום (₪) *</label>
              <input className="input" type="number" min={0} step={0.01} dir="ltr"
                     value={form.amount} onChange={set('amount')} placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className="label">תאריך *</label>
            <input className="input" type="date" value={form.date} onChange={set('date')} dir="ltr" />
          </div>

          <div>
            <label className="label">פרויקט קשור</label>
            <select className="input" value={form.projectId} onChange={handleProjectChange}>
              <option value="">— ללא פרויקט —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          <div>
            <label className="label">הערות</label>
            <textarea className="input resize-none" rows={2}
                      value={form.notes} onChange={set('notes')} placeholder="הערות נוספות..." />
          </div>

          {/* Receipt / scan placeholder */}
          <div className="border border-dashed border-surface-400 rounded-xl p-4 text-center">
            <p className="text-xs text-ink-subtle">📎 צירוף קבלה — יתווסף בגרסה הבאה</p>
          </div>

          {error && <p className="text-sm text-danger animate-slide-up">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-black/20 border-t-black animate-spin inline-block" />
                    שומר...
                  </span>
                : isEdit ? 'שמור' : 'הוסף הוצאה'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Success Toast ─────────────────────────────────────────────
function SuccessToast({ message }) {
  return (
    <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-toast-in">
      <div className="bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 rounded-2xl
                      shadow-card flex items-center gap-2 whitespace-nowrap">
        <span className="text-base leading-none">✓</span>
        {message}
      </div>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3 px-4 py-3.5 rounded-2xl bg-surface-200 border border-surface-300 animate-pulse">
          <div className="w-1 rounded-full bg-surface-400 shrink-0 self-stretch" style={{ minHeight: '2rem' }} />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-surface-400 rounded-lg w-2/3" />
            <div className="h-3 bg-surface-300 rounded-lg w-1/2" />
          </div>
          <div className="h-3.5 bg-surface-400 rounded-lg w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="card flex flex-col items-center py-14 text-center">
      <span className="text-5xl mb-4">💸</span>
      <p className="font-semibold text-ink mb-1">אין הוצאות החודש</p>
      <p className="text-sm text-ink-muted mb-5">סרוק קבלה או הוסף ידנית</p>
      <button className="btn-primary" onClick={onAdd}>+ הוצאה חדשה</button>
    </div>
  )
}
