// src/pages/appointments/AppointmentsPage.jsx
import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         startOfWeek, endOfWeek, isSameDay, isSameMonth,
         addMonths, subMonths, isToday, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'
import useAuthStore from '@/store/authStore'
import { subscribeAppointments, addAppointment, updateAppointment, deleteAppointment, getClients } from '@/firebase/db'

const TYPES = [
  { key: 'measurement', label: 'מדידה',      emoji: '📏' },
  { key: 'installation',label: 'התקנה',      emoji: '🔧' },
  { key: 'consultation', label: 'ייעוץ',      emoji: '💬' },
  { key: 'followup',     label: 'מעקב',       emoji: '📞' },
  { key: 'other',        label: 'אחר',         emoji: '📌' },
]

const EMPTY_FORM = {
  title: '', clientId: '', clientName: '',
  date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  type: 'measurement', notes: '', status: 'scheduled'
}

export default function AppointmentsPage() {
  const uid = useAuthStore(s => s.uid())
  const [appointments, setAppointments] = useState([])
  const [clients, setClients]   = useState([])
  const [view, setView]         = useState('list') // 'list' | 'calendar'
  const [month, setMonth]       = useState(new Date())
  const [selected, setSelected] = useState(new Date())
  const [modal, setModal]       = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeAppointments(uid, data => { setAppointments(data); setLoading(false) })
    getClients(uid).then(setClients)
    return unsub
  }, [uid])

  // Normalize appointment date
  const apptDate = (a) => a.date?.toDate ? a.date.toDate() : new Date(a.date)

  const dayAppts = appointments.filter(a => isSameDay(apptDate(a), selected))
  const upcoming = appointments
    .filter(a => apptDate(a) >= new Date())
    .sort((a, b) => apptDate(a) - apptDate(b))

  const daysWithAppts = new Set(
    appointments.map(a => format(apptDate(a), 'yyyy-MM-dd'))
  )

  const handleDelete = async (id) => {
    if (!confirm('למחוק פגישה זו?')) return
    await deleteAppointment(uid, id)
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">יומן פגישות</h1>
          <p className="text-sm text-ink-muted">{upcoming.length} פגישות קרובות</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-surface-200">
            <button onClick={() => setView('list')}
              className={`px-3 py-2 text-xs font-medium transition-colors
                ${view === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-ink-muted hover:bg-surface-50'}`}>
              רשימה
            </button>
            <button onClick={() => setView('calendar')}
              className={`px-3 py-2 text-xs font-medium transition-colors
                ${view === 'calendar' ? 'bg-brand-600 text-white' : 'bg-white text-ink-muted hover:bg-surface-50'}`}>
              לוח שנה
            </button>
          </div>
          <button className="btn-primary" onClick={() => setModal('add')}>+ פגישה</button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          {/* Calendar */}
          <div className="card">
            <CalendarHeader month={month} onPrev={() => setMonth(m => subMonths(m, 1))}
                            onNext={() => setMonth(m => addMonths(m, 1))} />
            <CalendarGrid month={month} selected={selected} daysWithAppts={daysWithAppts}
                          onSelect={setSelected} />
          </div>
          {/* Day list */}
          <div className="card">
            <h3 className="font-semibold text-ink mb-3">
              {isToday(selected) ? 'היום' : format(selected, 'EEEE, d בMMM', { locale: he })}
            </h3>
            {dayAppts.length === 0 ? (
              <p className="text-sm text-ink-subtle py-4 text-center">אין פגישות ביום זה</p>
            ) : (
              <div className="space-y-2">
                {dayAppts.map(a => (
                  <ApptCard key={a.id} appt={a} onEdit={() => setModal(a)} onDelete={() => handleDelete(a.id)} />
                ))}
              </div>
            )}
            <button className="btn-secondary w-full mt-3 text-sm" onClick={() => setModal('add')}>
              + הוסף פגישה ליום זה
            </button>
          </div>
        </div>
      ) : (
        /* List view */
        <div>
          {loading ? <LoadingSkeleton /> : upcoming.length === 0 ? (
            <EmptyState onAdd={() => setModal('add')} />
          ) : (
            <div className="space-y-3">
              {upcoming.map(a => (
                <ApptCard key={a.id} appt={a} showDate
                  onEdit={() => setModal(a)} onDelete={() => handleDelete(a.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <AppointmentModal
          appt={modal === 'add' ? null : modal}
          uid={uid} clients={clients}
          defaultDate={view === 'calendar' ? selected : null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ─── Calendar ─────────────────────────────────────────────────
function CalendarHeader({ month, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button onClick={onPrev} className="p-2 rounded-xl hover:bg-surface-100 text-ink-muted">‹</button>
      <h3 className="font-semibold text-ink">
        {format(month, 'MMMM yyyy', { locale: he })}
      </h3>
      <button onClick={onNext} className="p-2 rounded-xl hover:bg-surface-100 text-ink-muted">›</button>
    </div>
  )
}

function CalendarGrid({ month, selected, daysWithAppts, onSelect }) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const end   = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
  const days  = eachDayOfInterval({ start, end })
  const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-ink-subtle py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const key    = format(day, 'yyyy-MM-dd')
          const hasAppt = daysWithAppts.has(key)
          const inMonth = isSameMonth(day, month)
          const isSelected = isSameDay(day, selected)
          const today  = isToday(day)
          return (
            <button key={key} onClick={() => onSelect(day)}
              className={`relative aspect-square flex items-center justify-center rounded-xl text-sm
                transition-colors font-medium
                ${!inMonth ? 'text-ink-subtle/40' : ''}
                ${isSelected ? 'bg-brand-600 text-white' : today ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface-100 text-ink'}
              `}>
              {format(day, 'd')}
              {hasAppt && !isSelected && (
                <span className="absolute bottom-1 right-1/2 translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Appointment Card ─────────────────────────────────────────
function ApptCard({ appt, onEdit, onDelete, showDate }) {
  const date = appt.date?.toDate ? appt.date.toDate() : new Date(appt.date)
  const type = TYPES.find(t => t.key === appt.type) || TYPES[4]
  return (
    <div className="card flex items-center gap-3 hover:shadow-card transition-shadow group">
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex flex-col items-center justify-center shrink-0">
        <span className="text-base leading-none">{type.emoji}</span>
        <span className="text-xs text-brand-500 font-medium leading-none mt-0.5">
          {format(date, 'HH:mm')}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink text-sm">{appt.title || type.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {appt.clientName && <span className="text-xs text-ink-muted">{appt.clientName}</span>}
          {showDate && <span className="text-xs text-ink-subtle">{format(date, 'EEE, d MMM', { locale: he })}</span>}
        </div>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button className="btn-secondary text-xs" onClick={onEdit}>עריכה</button>
        <button className="btn-ghost text-xs text-danger" onClick={onDelete}>מחיקה</button>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────
function AppointmentModal({ appt, uid, clients, defaultDate, onClose }) {
  const isEdit = !!appt
  const defaultDateStr = defaultDate
    ? format(defaultDate, "yyyy-MM-dd'T'09:00")
    : EMPTY_FORM.date
  const [form, setForm]     = useState(appt
    ? { ...appt, date: appt.date?.toDate
        ? format(appt.date.toDate(), "yyyy-MM-dd'T'HH:mm")
        : format(new Date(appt.date), "yyyy-MM-dd'T'HH:mm") }
    : { ...EMPTY_FORM, date: defaultDateStr })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const handleClientChange = (e) => {
    const c = clients.find(c => c.id === e.target.value)
    setForm(f => ({ ...f, clientId: e.target.value, clientName: c?.name || '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('כותרת הפגישה היא שדה חובה'); return }
    setLoading(true)
    try {
      const data = { ...form, date: new Date(form.date) }
      if (isEdit) await updateAppointment(uid, appt.id, data)
      else        await addAppointment(uid, data)
      onClose()
    } catch { setError('שגיאה בשמירה') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md max-h-[90dvh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-ink">{isEdit ? 'עריכת פגישה' : 'פגישה חדשה'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">כותרת *</label>
            <input className="input" placeholder="מדידה בדירת הלקוח" value={form.title} onChange={set('title')} />
          </div>
          <div>
            <label className="label">סוג פגישה</label>
            <select className="input" value={form.type} onChange={set('type')}>
              {TYPES.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">תאריך ושעה</label>
            <input className="input" type="datetime-local" value={form.date} onChange={set('date')} dir="ltr" />
          </div>
          <div>
            <label className="label">לקוח</label>
            <select className="input" value={form.clientId} onChange={handleClientChange}>
              <option value="">— בחר לקוח —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">הערות</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'שומר...' : isEdit ? 'שמור' : 'קבע פגישה'}
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
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="card animate-pulse flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-surface-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-200 rounded w-1/2" />
            <div className="h-3 bg-surface-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <span className="text-5xl mb-4">📅</span>
      <p className="font-semibold text-ink mb-1">אין פגישות מתוכננות</p>
      <p className="text-sm text-ink-muted mb-5">קבע את הפגישה הראשונה שלך</p>
      <button className="btn-primary" onClick={onAdd}>+ קבע פגישה</button>
    </div>
  )
}
