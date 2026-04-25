// src/App.jsx
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

// Layout
import AppShell from '@/components/layout/AppShell'

// Auth pages
import LoginPage    from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// App pages
import DashboardPage    from '@/pages/dashboard/DashboardPage'
import ClientsPage      from '@/pages/clients/ClientsPage'
import ProjectsPage     from '@/pages/projects/ProjectsPage'
import AppointmentsPage from '@/pages/appointments/AppointmentsPage'
import SettingsPage     from '@/pages/settings/SettingsPage'
import QuotesPage      from '@/pages/quotes/QuotesPage'
import SuppliersPage   from '@/pages/suppliers/SuppliersPage'
import OrdersPage      from '@/pages/orders/OrdersPage'
import OutputsPage     from '@/pages/outputs/OutputsPage'
import AdminPage       from '@/pages/admin/AdminPage'
import ExpensesPage           from '@/pages/expenses/ExpensesPage'
import StandardProductsPage   from '@/pages/standard-products/StandardProductsPage'
import QuoteViewPage          from '@/pages/quote-view/QuoteViewPage'
import ClientProfilePage      from '@/pages/client-profile/ClientProfilePage'
import PublicQuotePage        from '@/pages/public-quote/PublicQuotePage'
import SupplierConfirmPage    from '@/pages/supplier-confirm/SupplierConfirmPage'
import BookingPage            from '@/pages/booking/BookingPage'
import SirtootPage            from '@/pages/sirtoot/SirtootPage'
import QuoteBuilderPage       from '@/pages/quote-builder/QuoteBuilderPage'

// ─── Route Guards ─────────────────────────────────────────────
function RequireAdmin({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading || (user && profile === null)) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!profile.isAdmin) return <Navigate to="/" replace />
  return children
}

function RequireAuth({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function RequireGuest({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (user)    return <Navigate to="/" replace />
  return children
}

function LoadingScreen() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-surface-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-brand-600 animate-pulse" />
        <p className="text-sm text-ink-muted">טוען...</p>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', fontFamily: 'system-ui, sans-serif', direction: 'rtl',
    }}>
      <p style={{ fontSize: 56, margin: '0 0 12px' }}>📋</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
        הדף לא נמצא
      </p>
      <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
        הקישור לא תקין או שפג תוקפו
      </p>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const init = useAuthStore(s => s.init)

  useEffect(() => {
    const unsubscribe = init()
    return unsubscribe
  }, [init])

  return (
    <BrowserRouter>
      <Routes>
        {/* Guest routes */}
        <Route path="/login"    element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/register" element={<RequireGuest><RegisterPage /></RequireGuest>} />

        {/* Protected routes — pathless layout, RequireAuth only runs when a child matches */}
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index                    element={<DashboardPage />} />
          <Route path="clients"           element={<ClientsPage />} />
          <Route path="projects"          element={<ProjectsPage />} />
          <Route path="appointments"      element={<AppointmentsPage />} />
          <Route path="sirtoot"           element={<SirtootPage />} />
          <Route path="quote/new"         element={<QuoteBuilderPage />} />
          <Route path="quote/edit/:id"    element={<QuoteBuilderPage />} />
          <Route path="quotes"            element={<QuotesPage />} />
          <Route path="suppliers"         element={<SuppliersPage />} />
          <Route path="orders"            element={<OrdersPage />} />
          <Route path="outputs"           element={<OutputsPage />} />
          <Route path="expenses"          element={<ExpensesPage />} />
          <Route path="standard-products" element={<StandardProductsPage />} />
          <Route path="quote/:id"         element={<QuoteViewPage />} />
          <Route path="clients/:id"       element={<ClientProfilePage />} />
          <Route path="settings"          element={<SettingsPage />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />

        {/* Public quote — no auth (new format: /p/:uid/:id, old: /p/:id) */}
        <Route path="/p/:uid/:id" element={<PublicQuotePage />} />
        <Route path="/p/:id"      element={<PublicQuotePage />} />
        <Route path="/sc/:token" element={<SupplierConfirmPage />} />
        <Route path="/book/:token" element={<BookingPage />} />

        {/* Fallback — neutral page, never shows login to strangers */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
