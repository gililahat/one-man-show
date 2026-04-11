// src/App.jsx
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

// Layout
import AppShell from '@/components/layout/AppShell'

// Auth pages
import LoginPage    from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Phase 4
import LandingPage     from '@/pages/landing/LandingPage'
import FeatureGate, { TrialBanner } from '@/components/shared/FeatureGate'
import OnboardingPage  from '@/pages/onboarding/OnboardingPage'

// App pages
import DashboardPage    from '@/pages/dashboard/DashboardPage'
import ClientsPage      from '@/pages/clients/ClientsPage'
import ProjectsPage     from '@/pages/projects/ProjectsPage'
import AppointmentsPage from '@/pages/appointments/AppointmentsPage'
import SettingsPage     from '@/pages/settings/SettingsPage'
import CalculatorPage  from '@/pages/calculator/CalculatorPage'
import QuotesPage      from '@/pages/quotes/QuotesPage'
import SuppliersPage   from '@/pages/suppliers/SuppliersPage'
import OrdersPage      from '@/pages/orders/OrdersPage'
import OutputsPage     from '@/pages/outputs/OutputsPage'

// ─── Route Guards ─────────────────────────────────────────────
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

// Redirect to onboarding if not completed
function RequireOnboarding({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading)  return <LoadingScreen />
  if (!user)    return <Navigate to="/" replace />
  if (profile && !profile.onboardingComplete) return <Navigate to="/onboarding" replace />
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
        {/* Public routes */}
        <Route path="/home"     element={<LandingPage />} />
        <Route path="/login"    element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/register" element={<RequireGuest><RegisterPage /></RequireGuest>} />

        {/* Onboarding — auth required, onboarding not complete */}
        <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />

        {/* Protected routes — wrapped in AppShell */}
        <Route path="/" element={<RequireOnboarding><RequireAuth><AppShell /></RequireAuth></RequireOnboarding>}>
          <Route index                  element={<DashboardPage />} />
          <Route path="clients"         element={<ClientsPage />} />
          <Route path="projects"        element={<ProjectsPage />} />
          <Route path="appointments"    element={<AppointmentsPage />} />
          <Route path="calculator"      element={<CalculatorPage />} />
          <Route path="quotes"          element={<QuotesPage />} />
          <Route path="suppliers"       element={<FeatureGate feature="suppliers"><SuppliersPage /></FeatureGate>} />
          <Route path="orders"          element={<FeatureGate feature="orders"><OrdersPage /></FeatureGate>} />
          <Route path="outputs"         element={<FeatureGate feature="outputs"><OutputsPage /></FeatureGate>} />
          <Route path="settings"        element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
