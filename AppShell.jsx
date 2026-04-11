// src/pages/dashboard/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { getClients }      from '@/firebase/db'
import { getProjects }     from '@/firebase/db'
import { getAppointments } from '@/firebase/db'
import { getQuotes }       from '@/firebase/db'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'

export default function DashboardPage() {
  const uid         = useAuthStore(s => s.uid())
  const displayName = useAuthStore(s => s.displayName())
  const [stats, setStats]             = useState(null)
  const [upcomingAppts, setUpcoming]  = useState([])
  const [recentProjects, setRecent]   = useState([])

  useEffect(() => {
    if (!uid) return
    const load = async () => {
      const [clients, projects, appointments, quotes] = await Promise.all([
        getClients(uid),
        getProjects(uid),
        getAppointments(uid),
        getQuotes(uid),
      ])
      setStats({
        clients:      clients.length,
        projects:     projects.length,
        active:       projects.filter(p => p.status === 'active' || p.status === 'new').length,
        appointments: appointments.length,
        openQuotes:   quotes.filter(q => q.status === 'draft' || q.status === 'sent').length,
      })
      const now = new Date()
      setUpcoming(
        appointments
          .filter(a => a.date?.toDate ? a.date.toDate() >= now : new Date(a.date) >= now)
          .slice(0, 3)
      )
      setRecent(projects.slice(0, 4))
    }
    load()
  }, [uid])

  const hour   = new Date().getHours()
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-ink">{greeting}, {displayName.split(' ')[0]} 👋</h1>
        <p className="text-sm text-ink-muted mt-1">
          {format(new Date(), "EEEE, d בMMMM yyyy", { locale: he })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="לקוחות"         value={stats?.clients}      icon="👥" color="blue"   to="/clients" />
        <KpiCard label="פרויקטים פעילים" value={stats?.active}       icon="⚡" color="amber"  to="/projects" />
        <KpiCard label="הצעות פתוחות"   value={stats?.openQuotes}   icon="📋" color="violet" to="/quotes" />
        <KpiCard label="פגישות"          value={stats?.appointments} icon="📅" color="green"  to="/appointments" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">
          פעולות מהירות
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction to="/clients"      label="לקוח חדש"    emoji="👤" />
          <QuickAction to="/projects"     label="פרויקט חדש"  emoji="📂" />
          <QuickAction to="/appointments" label="קביעת פגישה" emoji="📅" />
          <QuickAction to="/projects"     label="הצעת מחיר"   emoji="📋" soon />
        </div>
      </div>

      {/* Upcoming appointments */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">פגישות קרובות</h2>
            <Link to="/appointments" className="text-xs text-brand-600 hover:text-brand-700">
              הכל
            </Link>
          </div>
          {upcomingAppts.length === 0 ? (
            <EmptyState emoji="📅" text="אין פגישות מתוכננות" />
          ) : (
            <div className="space-y-2">
              {upcomingAppts.map(a => (
                <AppointmentRow key={a.id} appt={a} />
              ))}
            </div>
          )}
        </div>

        {/* Recent projects */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">פרויקטים אחרונים</h2>
            <Link to="/projects" className="text-xs text-brand-600 hover:text-brand-700">
              הכל
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <EmptyState emoji="📁" text="אין פרויקטים עדיין" />
          ) : (
            <div className="space-y-2">
              {recentProjects.map(p => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────

function KpiCard({ label, value, icon, color, to }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    amber:  'bg-amber-50 text-amber-700',
    green:  'bg-emerald-50 text-emerald-700',
  }
  return (
    <Link to={to} className="card hover:shadow-card transition-shadow">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-ink">
        {value ?? <span className="w-8 h-6 bg-surface-100 rounded animate-pulse inline-block" />}
      </p>
      <p className="text-xs text-ink-muted mt-0.5">{label}</p>
    </Link>
  )
}

function QuickAction({ to, label, emoji, soon }) {
  return (
    <Link to={to}
          className={`card flex flex-col items-center gap-2 py-4 text-center
                     hover:shadow-card transition-shadow cursor-pointer
                     ${soon ? 'opacity-50 pointer-events-none' : ''}`}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-medium text-ink">{label}</span>
      {soon && <span className="badge badge-neutral text-xs">בקרוב</span>}
    </Link>
  )
}

function AppointmentRow({ appt }) {
  const date = appt.date?.toDate ? appt.date.toDate() : new Date(appt.date)
  const label = isToday(date) ? 'היום' : isTomorrow(date) ? 'מחר'
    : format(date, 'd בMMM', { locale: he })
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-50">
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex flex-col items-center justify-center shrink-0">
        <span className="text-xs font-bold text-brand-600 leading-none">{label}</span>
        <span className="text-xs text-brand-400">{format(date, 'HH:mm')}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{appt.title || 'פגישה'}</p>
        <p className="text-xs text-ink-muted truncate">{appt.clientName || ''}</p>
      </div>
    </div>
  )
}

function ProjectRow({ project }) {
  const statusColors = {
    new:        'badge-info',
    active:     'badge-success',
    completed:  'badge-neutral',
    cancelled:  'badge-danger',
  }
  const statusLabels = {
    new: 'חדש', active: 'פעיל', completed: 'הושלם', cancelled: 'בוטל'
  }
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-50">
      <div className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center shrink-0 text-base">
        📁
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{project.title}</p>
        <p className="text-xs text-ink-muted truncate">{project.clientName || ''}</p>
      </div>
      <span className={`badge ${statusColors[project.status] || 'badge-neutral'}`}>
        {statusLabels[project.status] || project.status}
      </span>
    </div>
  )
}

function EmptyState({ emoji, text }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="text-3xl">{emoji}</span>
      <p className="text-sm text-ink-subtle">{text}</p>
    </div>
  )
}
