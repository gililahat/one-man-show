// src/pages/settings/SettingsPage.jsx
import { useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import useAuthStore from '@/store/authStore'
import useSubscription from '@/hooks/useSubscription'
import { getPricingSettings, savePricingSettings } from '@/firebase/db'
import { GLASS_TYPES, PROFILE_TYPES, HARDWARE_SETS } from '@/utils/calculatorEngine'

const SECTIONS = ['פרופיל עסקי', 'הגדרות מערכת', 'תמחור', 'מנוי']

export default function SettingsPage() {
  const [section, setSection] = useState('פרופיל עסקי')

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">הגדרות</h1>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 border-b border-surface-200 pb-0">
        {SECTIONS.map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${section === s
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-ink-muted hover:text-ink'}`}>
            {s}
          </button>
        ))}
      </div>

      {section === 'פרופיל עסקי'   && <BusinessProfileSection />}
      {section === 'הגדרות מערכת'  && <SystemSettingsSection />}
      {section === 'תמחור'          && <PricingSettingsSection />}
      {section === 'מנוי'          && <SubscriptionSection />}
    </div>
  )
}

// ─── Business Profile ─────────────────────────────────────────
function BusinessProfileSection() {
  const uid     = useAuthStore(s => s.uid())
  const profile = useAuthStore(s => s.profile)
  const setProfile = useAuthStore(s => s.setProfile)

  const [form, setForm] = useState({
    name:         profile?.profile?.name         || '',
    businessName: profile?.profile?.businessName || '',
    phone:        profile?.profile?.phone        || '',
    email:        profile?.profile?.email        || '',
    address:      profile?.profile?.address      || '',
    trade:        profile?.profile?.trade        || 'shower',
  })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', uid), { profile: form })
      setProfile({ ...profile, profile: form })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div className="card max-w-lg space-y-4">
      <h2 className="font-semibold text-ink">פרטי העסק</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="שם מלא"    value={form.name}         onChange={set('name')}         placeholder="ישראל ישראלי" />
        <Field label="שם העסק"   value={form.businessName} onChange={set('businessName')} placeholder="מקלחוני ישראל" />
        <Field label="טלפון"     value={form.phone}        onChange={set('phone')}        placeholder="050-0000000" dir="ltr" />
        <Field label="אימייל"    value={form.email}        onChange={set('email')}        placeholder="me@business.com" dir="ltr" />
      </div>
      <Field label="כתובת" value={form.address} onChange={set('address')} placeholder="רחוב, עיר" />

      <div>
        <label className="label">תחום עיסוק</label>
        <select className="input max-w-xs" value={form.trade} onChange={set('trade')}>
          <option value="shower">מקלחונים וזכוכית</option>
          <option value="aluminum">אלומיניום</option>
          <option value="plumbing">אינסטלציה</option>
          <option value="electrical">חשמל</option>
          <option value="other">אחר</option>
        </select>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'שומר...' : 'שמור שינויים'}
        </button>
        {saved && <span className="text-sm text-success font-medium">✓ נשמר בהצלחה</span>}
      </div>
    </div>
  )
}

// ─── System Settings ──────────────────────────────────────────
function SystemSettingsSection() {
  const uid      = useAuthStore(s => s.uid())
  const profile  = useAuthStore(s => s.profile)
  const setProfile = useAuthStore(s => s.setProfile)

  const [form, setForm] = useState({
    currency:   profile?.settings?.currency   || 'ILS',
    defaultVAT: profile?.settings?.defaultVAT || 17,
    language:   profile?.settings?.language   || 'he',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', uid), { settings: { ...form, defaultVAT: Number(form.defaultVAT) } })
      setProfile({ ...profile, settings: form })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div className="card max-w-lg space-y-4">
      <h2 className="font-semibold text-ink">הגדרות מערכת</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">מטבע</label>
          <select className="input" value={form.currency} onChange={set('currency')}>
            <option value="ILS">₪ שקל ישראלי</option>
            <option value="USD">$ דולר</option>
            <option value="EUR">€ אירו</option>
          </select>
        </div>
        <div>
          <label className="label">מע"מ ברירת מחדל (%)</label>
          <input className="input" type="number" min={0} max={30}
            value={form.defaultVAT} onChange={set('defaultVAT')} dir="ltr" />
        </div>
      </div>

      <InfoRow label="גרסת מערכת" value="0.4.0 — Workflow Connected" />
      <InfoRow label="סביבה"       value="Development" />

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'שומר...' : 'שמור הגדרות'}
        </button>
        {saved && <span className="text-sm text-success font-medium">✓ נשמר</span>}
      </div>
    </div>
  )
}

// ─── Subscription ─────────────────────────────────────────────
function SubscriptionSection() {
  const { plan, planLabel, isActive, isTrialExpired, trialDaysLeft, expiresAt } = useSubscription()

  const planColor = { trial: 'badge-warning', basic: 'badge-info', pro: 'badge-success' }
  const planFeatures = {
    trial: ['לקוחות ופרויקטים', 'יומן פגישות', 'מחשבון מחיר', 'הצעות מחיר'],
    basic: ['לקוחות ופרויקטים', 'יומן פגישות', 'מחשבון מחיר', 'הצעות מחיר'],
    pro:   ['הכל ב-Basic', 'ספקים והזמנות', 'פלטי ייצור', 'דוחות מתקדמים'],
  }

  return (
    <div className="space-y-5 max-w-lg">

      {/* Current plan card */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">תוכנית נוכחית</h2>
          <span className={`badge ${planColor[plan] || 'badge-neutral'}`}>{planLabel}</span>
        </div>

        {trialDaysLeft !== null && (
          <div className={`rounded-xl px-4 py-3 ${
            isTrialExpired ? 'bg-red-50 border border-red-200' :
            trialDaysLeft <= 3 ? 'bg-red-50 border border-red-100' :
            'bg-amber-50 border border-amber-100'}`}>
            <p className={`text-sm font-medium ${isTrialExpired ? 'text-red-700' : 'text-amber-800'}`}>
              {isTrialExpired
                ? '⚠️ תקופת הניסיון הסתיימה'
                : trialDaysLeft === 0 ? '⚠️ הניסיון מסתיים היום!'
                : `⏳ ${trialDaysLeft} ימים נותרו בניסיון`}
            </p>
          </div>
        )}

        {expiresAt && !isTrialExpired && (
          <InfoRow label="תוקף עד" value={expiresAt.toLocaleDateString('he-IL')} />
        )}

        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">כלול בתוכנית</p>
          <ul className="space-y-1.5">
            {(planFeatures[plan] || planFeatures.trial).map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-ink-muted">
                <span className="text-brand-600">✓</span>{f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Upgrade options */}
      {plan !== 'pro' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-ink">שדרג לתוכנית Pro</h2>
          <p className="text-sm text-ink-muted">
            קבל גישה לספקים, הזמנות, פלטי ייצור ודוחות.
          </p>
          <div className="rounded-xl bg-brand-50 border border-brand-100 p-4">
            <p className="font-bold text-brand-800 text-lg mb-1">₪199 / חודש</p>
            <p className="text-xs text-brand-600">ביטול בכל עת</p>
          </div>
          <div className="rounded-xl bg-surface-100 px-4 py-3">
            <p className="text-sm text-ink-muted text-center">
              💳 תשלום מאובטח עם Stripe — בקרוב
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared ───────────────────────────────────────────────────
function Field({ label, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  )
}

// ─── Pricing Settings ─────────────────────────────────────────
function PricingSettingsSection() {
  const uid = useAuthStore(s => s.uid())
  const [glassTypes,   setGlassTypes]   = useState(GLASS_TYPES)
  const [profileTypes, setProfileTypes] = useState(PROFILE_TYPES)
  const [hardwareSets, setHardwareSets] = useState(HARDWARE_SETS)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    getPricingSettings(uid).then(s => {
      if (s) {
        if (s.glassTypes)   setGlassTypes(s.glassTypes)
        if (s.profileTypes) setProfileTypes(s.profileTypes)
        if (s.hardwareSets) setHardwareSets(s.hardwareSets)
      }
      setLoading(false)
    })
  }, [uid])

  // Glass
  const updateGlass   = (i, k, v) => setGlassTypes(prev => prev.map((r, idx) => idx===i ? {...r,[k]: k==='pricePerM2'?Number(v):v} : r))
  const addGlass      = () => setGlassTypes(prev => [...prev, { key: `custom_${Date.now()}`, label: 'סוג חדש', pricePerM2: 0 }])
  const removeGlass   = (i) => setGlassTypes(prev => prev.filter((_, idx) => idx !== i))
  // Profile
  const updateProfile = (i, k, v) => setProfileTypes(prev => prev.map((r, idx) => idx===i ? {...r,[k]: k==='pricePerMeter'?Number(v):v} : r))
  const addProfile    = () => setProfileTypes(prev => [...prev, { key: `custom_${Date.now()}`, label: 'פרופיל חדש', pricePerMeter: 0 }])
  const removeProfile = (i) => setProfileTypes(prev => prev.filter((_, idx) => idx !== i))
  // Hardware
  const updateHardware = (i, k, v) => setHardwareSets(prev => prev.map((r, idx) => idx===i ? {...r,[k]: k==='price'?Number(v):v} : r))
  const addHardware    = () => setHardwareSets(prev => [...prev, { key: `custom_${Date.now()}`, label: 'סט חדש', price: 0 }])
  const removeHardware = (i) => setHardwareSets(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setSaving(true)
    try {
      await savePricingSettings(uid, { glassTypes, profileTypes, hardwareSets })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const handleReset = () => {
    if (!confirm('לאפס את כל המחירים לברירות מחדל?')) return
    setGlassTypes(GLASS_TYPES)
    setProfileTypes(PROFILE_TYPES)
    setHardwareSets(HARDWARE_SETS)
  }

  if (loading) return <div className="card animate-pulse h-48" />

  return (
    <div className="space-y-5 max-w-2xl">

      <PricingTable
        title='סוגי זכוכית' unit='מ"ר' unitLabel='pricePerM2'
        rows={glassTypes} onUpdate={updateGlass} onAdd={addGlass} onRemove={removeGlass}
        minRows={1}
      />
      <PricingTable
        title='סוגי פרופיל' unit='מ"ל' unitLabel='pricePerMeter'
        rows={profileTypes} onUpdate={updateProfile} onAdd={addProfile} onRemove={removeProfile}
        minRows={1}
      />
      <PricingTable
        title='סטי פרזול' unit='סט' unitLabel='price'
        rows={hardwareSets} onUpdate={updateHardware} onAdd={addHardware} onRemove={removeHardware}
        minRows={1}
      />

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'שומר...' : 'שמור מחירים'}
        </button>
        <button onClick={handleReset} className="btn-secondary text-sm">איפוס לברירות מחדל</button>
        {saved && <span className="text-sm text-success font-medium">✓ נשמר</span>}
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
        <p className="text-sm text-amber-800">
          <strong>שים לב:</strong> שינוי מחירים ישפיע על חישובים חדשים בלבד. הצעות קיימות לא ישתנו.
        </p>
      </div>
    </div>
  )
}

function PricingTable({ title, unit, unitLabel, rows, onUpdate, onAdd, onRemove, minRows }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink">{title} — ₪ / {unit}</h2>
        <button onClick={onAdd} className="btn-secondary text-xs">+ הוסף</button>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.key || i} className="flex items-center gap-2">
            <input className="input flex-1 text-sm" placeholder="שם"
              value={row.label} onChange={e => onUpdate(i, 'label', e.target.value)} />
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-sm text-ink-muted">₪</span>
              <input className="input w-24 text-sm" type="number" min={0} dir="ltr"
                value={row[unitLabel]} onChange={e => onUpdate(i, unitLabel, e.target.value)} />
            </div>
            {rows.length > minRows && (
              <button onClick={() => onRemove(i)}
                className="p-1.5 rounded-lg text-ink-subtle hover:text-danger hover:bg-red-50 transition-colors shrink-0">
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
