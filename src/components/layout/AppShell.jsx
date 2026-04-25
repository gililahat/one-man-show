// src/components/layout/AppShell.jsx
import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { logout } from '@/firebase/auth'
import ToastContainer from '@/components/ui/ToastContainer'

// ─── Nav items ────────────────────────────────────────────────
const NAV = [
  { to: '/',             label: 'לוח בקרה',        icon: IconGrid,       exact: true },
  { to: '/clients',      label: 'לקוחות והצעות',    icon: IconUsers              },
  { to: '/projects',     label: 'פרויקטים',         icon: IconFolder             },
  { to: '/appointments', label: 'סידור עבודה / יומן', icon: IconCalendar        },
  { to: '/expenses',     label: 'הוצאות',           icon: IconWallet             },
  { to: '/suppliers',    label: 'ספקים',             icon: IconTruck              },
  { to: '/orders',       label: 'הזמנות מספקים',    icon: IconPackage            },
  { to: '/outputs',      label: 'פלטים',             icon: IconDownload           },
  { to: '/settings',     label: 'הגדרות',            icon: IconSettings           },
]

// ─── Tape menu — main navigation destinations ──────
const TAPE_NAV = [
  { to: '/appointments', label: 'סידור עבודה / יומן', icon: IconCalendar  },
  { to: '/projects',     label: 'מעקב פרויקטים',      icon: IconFolder    },
  { to: '/clients',      label: 'לקוחות והצעות',       icon: IconUsers     },
  { to: '/orders',       label: 'הזמנות מספקים',       icon: IconPackage   },
  { to: '/suppliers',    label: 'רשימת ספקים',          icon: IconTruck     },
  { to: '/expenses',     label: 'הוצאות',               icon: IconWallet    },
  { to: '/settings',     label: 'הגדרות',               icon: IconSettings  },
]

const ITEM_H = 52   // px per tape segment

export default function AppShell() {
  const displayName  = useAuthStore(s => s.displayName())
  const navigate     = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row-reverse bg-surface-50 overflow-x-hidden">

      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed right-0 top-0 bottom-0 w-sidebar
                        bg-surface-100 border-l border-surface-300 z-30">
        <div className="px-5 pt-6 pb-4 border-b border-surface-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-400 flex items-center justify-center">
              <span className="text-black text-xs font-bold">OMS</span>
            </div>
            <div>
              <p className="text-sm font-bold text-ink leading-none">ONE MAN SHOW</p>
              <p className="text-xs text-ink-subtle mt-0.5">ניהול עסק שלם</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item => <SidebarLink key={item.to} {...item} />)}
        </nav>
        <div className="px-3 py-4 border-t border-surface-300">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-brand-400/15 flex items-center justify-center
                            text-brand-400 text-sm font-semibold shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{displayName}</p>
            </div>
            <button onClick={handleLogout}
                    className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-300 transition-colors">
              <IconLogout className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content — slides right when drawer opens ── */}
      <main
        className="flex-1 lg:mr-sidebar flex flex-col relative"
        style={{
          transform:  menuOpen ? 'translateX(310px)' : 'translateX(0)',
          transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-[20] bg-surface-100 border-b border-surface-300
                           px-4 h-14 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-400 flex items-center justify-center">
              <span className="text-black text-xs font-bold">OMS</span>
            </div>
            <span className="text-sm font-bold text-ink">ONE MAN SHOW</span>
          </div>
        </header>

        {/* Dark scrim over page content when drawer is open — inside main, no z-index battle */}
        {menuOpen && (
          <div
            className="lg:hidden absolute inset-0 z-[30] bg-black/50"
            onClick={closeMenu}
          />
        )}

        {/* Page content */}
        <div className="flex-1 px-4 py-5 lg:px-6 lg:py-6 max-w-5xl mx-auto w-full">
          <Outlet />
        </div>

        <ToastContainer />
      </main>

      {/* ── Tape menu housing + panel — fixed, outside main, unaffected by slide ── */}
      <div className="lg:hidden">
        <MeasuringTapeMenu
          open={menuOpen}
          onToggle={() => setMenuOpen(o => !o)}
          onClose={closeMenu}
          onLogout={handleLogout}
        />
      </div>
    </div>
  )
}

// ─── Measuring tape menu ──────────────────────────────────────
function MeasuringTapeMenu({ open, onToggle, onClose, onLogout }) {
  const navigate  = useNavigate()
  const location  = useLocation()

  const handleNav = (to) => { onClose(); navigate(to) }

  const isActive = (item) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)

  return (
    <>
      {/* ── Housing button — always visible, outside <main> so never slides ── */}
      <button
        onClick={onToggle}
        aria-label="תפריט ניווט"
        className="fixed top-3 left-3 z-[10000]"
        style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
      >
        <div className="relative rounded-[18px] overflow-hidden"
             style={{ width: 58, height: 72,
                      background: 'linear-gradient(150deg, #2e2e2e 0%, #191919 60%, #111 100%)',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.7), inset 0 2px 3px rgba(255,255,255,0.08), inset 0 -3px 6px rgba(0,0,0,0.6), 0 2px 0 #000' }}>
          <div className="absolute top-0 bottom-0 left-0 w-[10px] rounded-l-[18px]"
               style={{ background: 'linear-gradient(to right, #c8920a, #F5C518 60%, #ffe066)' }} />
          <div className="absolute top-0 bottom-0 right-0 w-[10px] rounded-r-[18px]"
               style={{ background: 'linear-gradient(to left, #c8920a, #F5C518 60%, #ffe066)' }} />
          {[0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60].map(y => (
            <div key={y} className="absolute left-0 w-[11px] h-px"
                 style={{ top: y, background: 'rgba(0,0,0,0.18)' }} />
          ))}
          {[0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,60].map(y => (
            <div key={y} className="absolute right-0 w-[11px] h-px"
                 style={{ top: y, background: 'rgba(0,0,0,0.18)' }} />
          ))}
          <div className="absolute top-[8px] left-1/2 -translate-x-1/2 rounded-[5px]"
               style={{ width: 20, height: 10,
                        background: 'linear-gradient(to bottom, #ff5555 0%, #cc0000 60%, #990000 100%)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.6), inset 0 1px rgba(255,255,255,0.25)' }} />
          <div className="absolute rounded-xl flex flex-col items-center justify-center"
               style={{ left: 12, right: 12, top: 22, bottom: 10,
                        background: 'rgba(0,0,0,0.45)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
            <span style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, lineHeight: 1.3 }}>ONE MAN</span>
            <span style={{ fontSize: 8, fontWeight: 800, color: '#F5C518', letterSpacing: 1.5, lineHeight: 1.2 }}>SHOW</span>
          </div>
          {[[8,11],[8,39]].map(([t,l],i) => (
            <div key={i} className="absolute rounded-full"
                 style={{ top: t, left: l, width: 4, height: 4,
                          background: 'radial-gradient(circle at 35% 35%, #666, #222)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.8)' }} />
          ))}
          <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2 rounded-sm"
               style={{ width: 18, height: 4, background: '#000',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.9)' }} />
        </div>
        <div style={{
               marginLeft: 20, width: 18,
               height: open ? 0 : 10,
               background: 'linear-gradient(to right, #a07000, #F5C518 25%, #ffe066 50%, #F5C518 75%, #a07000)',
               borderLeft: '1px solid rgba(0,0,0,0.35)', borderRight: '1px solid rgba(0,0,0,0.35)',
               borderBottom: '2px solid rgba(0,0,0,0.4)', borderRadius: '0 0 3px 3px',
               transition: 'height 180ms ease',
             }} />
      </button>

      {/* ── Tape panel — fixed, outside <main>, visible when drawer is open ── */}
      {open && (
        <>
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="סגור תפריט"
            className="fixed flex items-center justify-center active:scale-90 transition-transform z-[10000]"
            style={{
              left: 30, top: 84 + 11, width: 22, height: 30,
              borderRadius: 4,
              background: 'rgba(0,0,0,0.55)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Tape + items panel */}
          <div className="fixed flex overflow-hidden z-[10000]"
               style={{
                 left: 30, top: 84, direction: 'ltr',
                 maxHeight: `${(TAPE_NAV.length + 1) * ITEM_H}px`,
                 borderRadius: '0 16px 16px 0',
               }}>
            {/* Tape strip */}
            <div className="w-[22px] shrink-0 relative overflow-hidden"
                 style={{
                   background: 'linear-gradient(to right, #c8920a 0%, #F5C518 30%, #ffe066 50%, #F5C518 70%, #c8920a 100%)',
                   borderLeft: '1px solid rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(0,0,0,0.3)',
                 }}>
              {[...TAPE_NAV, { logout: true }].map((_, i) => <TapeTick key={i} index={i} />)}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/35" />
            </div>

            {/* Menu items */}
            <div className="bg-surface-100 border border-surface-300 border-t-0 border-l-0"
                 style={{ minWidth: 250, borderRadius: '0 16px 16px 0' }}>
              {TAPE_NAV.map((item) => {
                const active = isActive(item)
                return (
                  <button
                    key={item.to}
                    onClick={() => handleNav(item.to)}
                    style={{ height: ITEM_H, direction: 'rtl' }}
                    className={[
                      'w-full flex items-center gap-3 px-4',
                      'border-b border-surface-300 last:border-0',
                      'transition-colors duration-100 active:bg-surface-400',
                      active ? 'bg-brand-400/10' : 'hover:bg-surface-300',
                    ].join(' ')}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-400' : 'text-ink-subtle'}`} />
                    <span className={`text-sm font-medium ${active ? 'text-brand-400' : 'text-ink'}`}>{item.label}</span>
                  </button>
                )
              })}
              <button
                onClick={() => { onClose(); onLogout() }}
                style={{ height: ITEM_H, direction: 'rtl' }}
                className="w-full flex items-center gap-3 px-4 border-t-2 border-surface-300
                           hover:bg-surface-300 active:bg-surface-400 transition-colors"
              >
                <IconLogout className="w-4 h-4 shrink-0 text-danger" />
                <span className="text-sm font-medium text-danger">יציאה</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ─── Tape tick segment ────────────────────────────────────────
function TapeTick({ index }) {
  return (
    <div
      className="relative border-t border-black/30"
      style={{ height: ITEM_H }}
    >
      {/* Measurement number */}
      <span
        className="absolute left-[2px] top-[2px] font-mono font-bold leading-none"
        style={{ fontSize: 7, color: 'rgba(0,0,0,0.45)' }}
      >
        {(index + 1) * 10}
      </span>

      {/* Minor ticks (3 ticks divide each segment into 4 parts) */}
      {[1, 2, 3].map(t => (
        <div
          key={t}
          className="absolute left-0 bg-black/25"
          style={{
            top:    Math.round((t / 4) * ITEM_H),
            width:  t === 2 ? '65%' : '40%',
            height: 1,
          }}
        />
      ))}
    </div>
  )
}

// ─── Desktop sidebar link ─────────────────────────────────────
function SidebarLink({ to, label, icon: Icon, exact, onClick }) {
  return (
    <NavLink
      to={to} end={exact} onClick={onClick}
      className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
    >
      <Icon className="w-4.5 h-4.5 shrink-0" />
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
function IconWallet({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
      <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>
      <circle cx="16" cy="14" r="1" fill="currentColor"/>
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
function IconSettings({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
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
