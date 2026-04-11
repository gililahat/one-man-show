// src/pages/onboarding/OnboardingPage.jsx
// ─────────────────────────────────────────────────────────────
// 3-step onboarding wizard shown once after first registration.
// Saves to Firestore and marks onboarding as complete.
// Steps: 1. Business profile  2. Trade setup  3. Ready
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import useAuthStore from '@/store/authStore'

const STEPS = ['פרטי העסק', 'הגדרות מקצועיות', 'מוכן להתחיל']

export default function OnboardingPage() {
  const uid        = useAuthStore(s => s.uid())
  const profile    = useAuthStore(s => s.profile)
  const setProfile = useAuthStore(s => s.setProfile)
  const navigate   = useNavigate()

  const [step, setStep]     = useState(0)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    // Step 1
    name:         profile?.profile?.name || '',
    businessName: '',
    phone:        '',
    city:         '',
    // Step 2
    trade:        'shower',
    defaultVAT:   17,
    currency:     'ILS',
    installFee:   500,
  })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleNext = () => setStep(s => s + 1)
  const handleBack = () => setStep(s => s - 1)

  const handleFinish = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', uid), {
        profile: {
          ...profile?.profile,
          name:         form.name,
          businessName: form.businessName,
          phone:        form.phone,
          city:         form.city,
          trade:        form.trade,
        },
        settings: {
          currency:   form.currency,
          defaultVAT: Number(form.defaultVAT),
          installFee: Number(form.installFee),
          language:   'he',
        },
        onboardingComplete: true,
      })
      setProfile({
        ...profile,
        profile: { ...profile?.profile, name: form.name, businessName: form.businessName, trade: form.trade },
        settings: { currency: form.currency, defaultVAT: Number(form.defaultVAT) },
        onboardingComplete: true,
      })
      navigate('/')
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800
                    flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center
                          justify-center mb-4 border border-white/20">
            <span className="text-white text-lg font-bold">OMS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ONE MAN SHOW</h1>
          <p className="text-brand-300 text-sm mt-1">בואו נגדיר את העסק שלך</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                transition-all ${i < step ? 'bg-brand-400 text-white'
                  : i === step ? 'bg-white text-brand-800'
                  : 'bg-white/10 text-white/40'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-brand-400' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 shadow-modal">
          <h2 className="text-xl font-bold text-ink mb-1">{STEPS[step]}</h2>
          <p className="text-sm text-ink-muted mb-6">
            {step === 0 && 'כמה פרטים על העסק שלך'}
            {step === 1 && 'הגדרות שישמשו במחשבון ובהצעות'}
            {step === 2 && 'הכל מוכן — אפשר להתחיל!'}
          </p>

          {step === 0 && <Step1 form={form} set={set} />}
          {step === 1 && <Step2 form={form} set={set} />}
          {step === 2 && <Step3 form={form} />}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && step < 2 && (
              <button className="btn-secondary flex-1" onClick={handleBack}>חזור</button>
            )}
            {step < 2 && (
              <button className="btn-primary flex-1" onClick={handleNext}
                      disabled={step === 0 && !form.name.trim()}>
                המשך
              </button>
            )}
            {step === 2 && (
              <button className="btn-primary flex-1 h-12 text-base" onClick={handleFinish}
                      disabled={saving}>
                {saving ? 'שומר...' : 'כניסה למערכת 🚀'}
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        {step < 2 && (
          <button onClick={handleFinish}
                  className="w-full text-center text-brand-300 text-sm mt-4 hover:text-white transition-colors">
            דלג על ההגדרות כרגע
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Step 1 — Business profile ────────────────────────────────
function Step1({ form, set }) {
  return (
    <div className="space-y-4">
      <Field label="שם מלא *"   value={form.name}         onChange={set('name')}         placeholder="ישראל ישראלי" />
      <Field label="שם העסק"    value={form.businessName} onChange={set('businessName')} placeholder="מקלחוני ישראל בע&quot;מ" />
      <Field label="טלפון"      value={form.phone}        onChange={set('phone')}        placeholder="050-0000000" dir="ltr" />
      <Field label="עיר / אזור" value={form.city}         onChange={set('city')}         placeholder="תל אביב" />
    </div>
  )
}

// ─── Step 2 — Trade settings ──────────────────────────────────
function Step2({ form, set }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label">תחום עיסוק</label>
        <select className="input" value={form.trade} onChange={set('trade')}>
          <option value="shower">🚿 מקלחונים וזכוכית</option>
          <option value="aluminum">🪟 אלומיניום</option>
          <option value="plumbing">🔧 אינסטלציה</option>
          <option value="electrical">⚡ חשמל</option>
          <option value="other">🔨 אחר</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">מע"מ (%)</label>
          <input className="input" type="number" min={0} max={30} dir="ltr"
            value={form.defaultVAT} onChange={set('defaultVAT')} />
        </div>
        <div>
          <label className="label">מטבע</label>
          <select className="input" value={form.currency} onChange={set('currency')}>
            <option value="ILS">₪ שקל</option>
            <option value="USD">$ דולר</option>
            <option value="EUR">€ אירו</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">עלות התקנה ברירת מחדל (₪)</label>
        <input className="input max-w-xs" type="number" min={0} dir="ltr"
          value={form.installFee} onChange={set('installFee')} />
        <p className="text-xs text-ink-muted mt-1">ניתן לשנות בכל הצעה בנפרד</p>
      </div>
    </div>
  )
}

// ─── Step 3 — Ready ───────────────────────────────────────────
function Step3({ form }) {
  const tradeLabels = {
    shower: '🚿 מקלחונים וזכוכית',
    aluminum: '🪟 אלומיניום',
    plumbing: '🔧 אינסטלציה',
    electrical: '⚡ חשמל',
    other: '🔨 אחר',
  }

  const features = [
    { emoji: '👥', label: 'ניהול לקוחות ופרויקטים' },
    { emoji: '📅', label: 'יומן פגישות' },
    { emoji: '🧮', label: 'מחשבון מחיר חכם' },
    { emoji: '📋', label: 'הצעות מחיר מקצועיות' },
    { emoji: '🏭', label: 'הזמנות ספקים ופלטים' },
  ]

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-2xl bg-brand-50 border border-brand-100 p-4 space-y-2">
        {form.businessName && (
          <SummaryRow label="עסק" value={form.businessName} />
        )}
        <SummaryRow label="תחום" value={tradeLabels[form.trade]} />
        <SummaryRow label='מע"מ' value={`${form.defaultVAT}%`} />
        <SummaryRow label="מטבע" value={form.currency} />
      </div>

      {/* What's waiting */}
      <div>
        <p className="text-sm font-medium text-ink mb-3">מה מחכה לך במערכת:</p>
        <div className="space-y-2">
          {features.map(f => (
            <div key={f.label} className="flex items-center gap-3 text-sm text-ink-muted">
              <span className="text-base">{f.emoji}</span>
              {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* Trial notice */}
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-center">
        <p className="text-sm font-medium text-amber-800">🎉 14 ימי ניסיון מלא — ללא כרטיס אשראי</p>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  )
}
