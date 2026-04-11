// src/components/layout/AppShell.jsx
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { logout } from '@/firebase/auth'

// ─── Nav items ────────────────────────────────────────────────
const NAV = [
  { to: '/',             label: 'לוח בקרה',   icon: IconGrid,       exact: true },
  { to: '/clients',      label: 'לקוחות',      icon: IconUsers              },
  { to: '/projects',     label: 'פרויקטים',    icon: IconFolder             },
  { to: '/appointments', label: 'יומן',        icon: IconCalendar           },
  { to: '/calculator',   label: 'מחשבון',      icon: IconCalculator         },
  { to: '/quotes',       label: 'הצעות מחיר',  icon: IconClipboard          },
  { to: '/suppliers',    label: 'ספקים',        icon: IconTruck              },
  { to: '/orders',       label: 'הזמנות',       icon: IconPackage            },
  { to: '/outputs',      label: 'פלטים',        icon: IconDownload           },
  { to: '/settings',     label: 'הגדרות',       icon: IconSettings           },
]

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const displayName = useAuthStore(s => s.displayName())
  const navigate    = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row-reverse bg-surface-50">

      {/* ── Sidebar (desktop) ────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed right-0 top-0 bottom-0 w-sidebar
                        bg-white border-l border-surface-200 z-30">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">OMS</span>
            </div>
            <div>
              <p className="text-sm font-bold text-ink leading-none">ONE MAN SHOW</p>
              <p className="text-xs text-ink-subtle mt-0.5">ניהול עסק שלם</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-surface-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center
                            text-brand-700 text-sm font-semibold shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{displayName}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg text-ink-subtle
                     hover:text-ink hover:bg-surface-100 transition-colors">
              <IconLogout className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="flex-1 lg:ml-0 lg:mr-sidebar flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-surface-200
                           px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">OMS</span>
            </div>
            <span className="text-sm font-bold text-ink">ONE MAN SHOW</span>
          </div>
          <button onClick={() => setMobileOpen(true)}
                  className="p-2 rounded-xl hover:bg-surface-100 text-ink-muted">
            <IconMenu className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <div className="flex-1 px-4 py-5 lg:px-6 lg:py-6 max-w-5xl mx-auto w-full">
          <Outlet />
        </div>

        {/* Mobile bottom nav — top 5 routes only */}
        <nav className="lg:hidden sticky bottom-0 bg-white border-t border-surface-200
                        grid grid-cols-5 px-1 py-2 gap-0.5 safe-area-bottom">
          {NAV.slice(0, 5).map(item => (
            <MobileNavItem key={item.to} {...item} />
          ))}
        </nav>
      </main>

      {/* ── Mobile drawer overlay ─────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative mr-auto w-64 bg-white h-full flex flex-col shadow-modal">
            <div className="px-4 pt-5 pb-4 flex items-center justify-between border-b border-surface-100">
              <span className="font-bold text-ink">תפריט</span>
              <button onClick={() => setMobileOpen(false)}
                      className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-1">
              {NAV.map(item => (
                <SidebarLink key={item.to} {...item} onClick={() => setMobileOpen(false)} />
              ))}
            </nav>
            <div className="px-4 py-4 border-t border-surface-100">
              <button onClick={handleLogout}
                      className="flex items-center gap-2 text-sm text-danger font-medium">
                <IconLogout className="w-4 h-4" />
                התנתקות
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

// ─── Sidebar nav link ─────────────────────────────────────────
function SidebarLink({ to, label, icon: Icon, exact, onClick }) {
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onClick}
      className={({ isActive }) =>
        isActive ? 'nav-item-active' : 'nav-item'
      }
    >
      <Icon className="w-4.5 h-4.5 shrink-0" />
      {label}
    </NavLink>
  )
}

// ─── Mobile bottom nav item ───────────────────────────────────
function MobileNavItem({ to, label, icon: Icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl text-xs font-medium
         transition-colors ${isActive
           ? 'text-brand-600 bg-brand-50'
           : 'text-ink-subtle hover:text-ink'}`
      }
    >
      <Icon className="w-5 h-5" />
      {label}
    </NavLink>
  )
}

// ─── Icons ────────────────────────────────────────────────────
function IconGrid({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function IconUsers({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}
function IconFolder({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    </svg>
  )
}
function IconCalendar({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IconLogout({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  )
}
function IconTruck({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="1" y="3" width="15" height="13" rx="1"/>
      <path d="M16 8h4l3 5v3h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  )
}
function IconPackage({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}
function IconDownload({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
function IconCalculator({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="10" x2="14" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="14" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="10" y2="18"/><line x1="12" y1="18" x2="16" y2="18"/>
    </svg>
  )
}
function IconClipboard({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  )
}
function IconSettings({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
}
function IconMenu({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}
function IconX({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
