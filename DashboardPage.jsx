// src/pages/auth/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithEmail } from '@/firebase/auth'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginWithEmail(email, password)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center
                    bg-gradient-to-br from-surface-50 via-white to-brand-50 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center
                          shadow-card mb-4">
            <span className="text-white text-lg font-bold tracking-tight">OMS</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">ONE MAN SHOW</h1>
          <p className="text-sm text-ink-muted mt-1">ניהול עסק שלם בלחיצת כפתור</p>
        </div>

        {/* Card */}
        <div className="card shadow-card">
          <h2 className="text-lg font-semibold text-ink mb-5">כניסה למערכת</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">אימייל</label>
              <input
                type="email"
                className="input"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                dir="ltr"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">סיסמה</label>
                <Link to="/forgot-password"
                      className="text-xs text-brand-600 hover:text-brand-700">
                  שכחתי סיסמה
                </Link>
              </div>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                dir="ltr"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 text-base mt-1"
            >
              {loading ? 'מתחבר...' : 'כניסה'}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-ink-muted mt-6">
          אין לך חשבון?{' '}
          <Link to="/register" className="text-brand-600 font-medium hover:text-brand-700">
            הרשמה חינם
          </Link>
        </p>
      </div>
    </div>
  )
}

function getErrorMessage(code) {
  const map = {
    'auth/invalid-credential':     'אימייל או סיסמה שגויים',
    'auth/user-not-found':         'משתמש לא קיים במערכת',
    'auth/wrong-password':         'סיסמה שגויה',
    'auth/too-many-requests':      'יותר מדי ניסיונות. נסה שוב מאוחר יותר',
    'auth/network-request-failed': 'בעיית חיבור לאינטרנט',
  }
  return map[code] || 'אירעה שגיאה. אנא נסה שוב'
}
