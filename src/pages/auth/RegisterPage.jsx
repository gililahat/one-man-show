// src/pages/auth/RegisterPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerWithEmail } from '@/firebase/auth'

export default function RegisterPage() {
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate              = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('הסיסמאות אינן תואמות'); return }
    if (form.password.length < 6)       { setError('סיסמה חייבת להכיל לפחות 6 תווים'); return }
    setLoading(true)
    try {
      await registerWithEmail(form.email, form.password, form.name)
      navigate('/')
    } catch (err) {
      setError(getErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center
                    bg-gradient-to-br from-surface-50 via-white to-brand-50 px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center
                          shadow-card mb-4">
            <span className="text-white text-lg font-bold">OMS</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">ONE MAN SHOW</h1>
          <p className="text-sm text-ink-muted mt-1">14 ימי ניסיון חינם • ללא כרטיס אשראי</p>
        </div>

        <div className="card shadow-card">
          <h2 className="text-lg font-semibold text-ink mb-5">יצירת חשבון</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">שם מלא</label>
              <input className="input" type="text" placeholder="ישראל ישראלי"
                value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="label">אימייל</label>
              <input className="input" type="email" placeholder="name@example.com"
                value={form.email} onChange={set('email')} required dir="ltr" />
            </div>
            <div>
              <label className="label">סיסמה</label>
              <input className="input" type="password" placeholder="לפחות 6 תווים"
                value={form.password} onChange={set('password')} required dir="ltr" />
            </div>
            <div>
              <label className="label">אימות סיסמה</label>
              <input className="input" type="password" placeholder="הזן שוב"
                value={form.confirm} onChange={set('confirm')} required dir="ltr" />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full h-11 text-base mt-1">
              {loading ? 'יוצר חשבון...' : 'הרשמה'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-6">
          כבר יש לך חשבון?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:text-brand-700">
            כניסה למערכת
          </Link>
        </p>
      </div>
    </div>
  )
}

function getErrorMessage(code) {
  const map = {
    'auth/email-already-in-use': 'כתובת האימייל כבר בשימוש',
    'auth/invalid-email':        'כתובת אימייל לא תקינה',
    'auth/weak-password':        'הסיסמה חלשה מדי',
  }
  return map[code] || 'אירעה שגיאה. אנא נסה שוב'
}
