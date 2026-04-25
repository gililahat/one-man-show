// src/pages/settings/SettingsPage.jsx
import { useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import useAuthStore from '@/store/authStore'
import { getGlobalSettings, getBookingSettings, saveBookingSettings,
         uploadUserLogo, deleteUserLogo, wipeWorkData } from '@/firebase/db'
import useToastStore from '@/store/toastStore'
import useGlobalSettingsStore, { DEFAULT_SETTINGS } from '@/store/globalSettingsStore'
import {
  loadAccountingConfig, saveAccountingConfig, testConnection,
  PROVIDER, PROVIDER_LABELS, PROVIDER_INFOS, SUPPORTED_PROVIDERS,
} from '@/integrations/accounting'

const SECTIONS = ['פרופיל עסקי', 'הגדרות מערכת', 'תמחור', '🏗️ פרויקטים', '🚚 ספקים', '👥 לקוחות', '📅 תיאום התקנה', '💼 חשבונאות', '✨ חוויה', 'מנוי']

export default function SettingsPage() {
  const [section, setSection] = useState('פרופיל עסקי')

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">הגדרות</h1>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 border-b border-surface-200 pb-0 overflow-x-auto">
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
      {section === '🏗️ פרויקטים'   && <ProjectsSettingsSection />}
      {section === '🚚 ספקים'       && <SuppliersSettingsSection />}
      {section === '👥 לקוחות'      && <ClientsSettingsSection />}
      {section === '📅 תיאום התקנה' && <BookingSettingsSection />}
      {section === '💼 חשבונאות'     && <AccountingSettingsSection />}
      {section === '✨ חוויה'       && <UxSettingsSection />}
      {section === 'מנוי'          && <SubscriptionSection />}
    </div>
  )
}

// ─── Business Profile ─────────────────────────────────────────
function BusinessProfileSection() {
  const uid     = useAuthStore(s => s.uid())
  const profile = useAuthStore(s => s.profile)
  const setProfile = useAuthStore(s => s.setProfile)
  const addToast = useToastStore(s => s.addToast)

  const [form, setForm] = useState({
    name:         profile?.profile?.name         || '',
    businessName: profile?.profile?.businessName || '',
    phone:        profile?.profile?.phone        || '',
    phone2:       profile?.profile?.phone2       || '',    // טלפון משני
    whatsapp:     profile?.profile?.whatsapp     || '',    // וואטסאפ נפרד
    email:        profile?.profile?.email        || '',
    address:      profile?.profile?.address      || '',
    website:      profile?.profile?.website      || '',
    instagram:    profile?.profile?.instagram    || '',
    facebook:     profile?.profile?.facebook     || '',
    vatId:        profile?.profile?.vatId        || '',    // ע.מ / ח.פ
    trade:        profile?.profile?.trade        || 'shower',
    logoUrl:      profile?.profile?.logoUrl      || '',
    logoPath:     profile?.profile?.logoPath     || '',
    footerText:   profile?.profile?.footerText   || '',    // תנאי תשלום / הערה כללית להצעה
  })
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [uploading, setUploading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      addToast?.('הקובץ גדול מדי (עד 2MB)', 'error')
      return
    }
    setUploading(true)
    try {
      // Remove the previous logo file if we had one
      if (form.logoPath) await deleteUserLogo(form.logoPath)
      const { url, path } = await uploadUserLogo(uid, file)
      setForm(f => ({ ...f, logoUrl: url, logoPath: path }))
      addToast?.('הלוגו הועלה — לחץ שמור', 'success')
    } catch (err) {
      console.error(err)
      addToast?.('שגיאה בהעלאת הלוגו', 'error')
    }
    setUploading(false)
  }

  const handleLogoRemove = async () => {
    if (form.logoPath) await deleteUserLogo(form.logoPath)
    setForm(f => ({ ...f, logoUrl: '', logoPath: '' }))
  }

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
    <div className="card max-w-lg space-y-5">
      <h2 className="font-semibold text-ink">פרטי העסק</h2>

      {/* Logo */}
      <div>
        <label className="label">לוגו העסק</label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-xl bg-surface-300 border border-surface-400 flex items-center justify-center overflow-hidden shrink-0">
            {form.logoUrl
              ? <img src={form.logoUrl} alt="לוגו" className="w-full h-full object-contain" />
              : <span className="text-3xl">🏢</span>
            }
          </div>
          <div className="flex-1 space-y-2">
            <label className="btn-secondary text-sm cursor-pointer inline-block">
              {uploading ? 'מעלה...' : (form.logoUrl ? 'החלף לוגו' : 'העלה לוגו')}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} disabled={uploading} />
            </label>
            {form.logoUrl && (
              <button onClick={handleLogoRemove} className="btn-ghost text-xs text-danger">
                הסר לוגו
              </button>
            )}
            <p className="text-xs text-ink-subtle">PNG / JPG עד 2MB. רקע שקוף מומלץ.</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="שם מלא"         value={form.name}         onChange={set('name')}         placeholder="ישראל ישראלי" />
        <Field label="שם העסק"        value={form.businessName} onChange={set('businessName')} placeholder="מקלחוני ישראל" />
        <Field label="טלפון"          value={form.phone}        onChange={set('phone')}        placeholder="050-0000000" dir="ltr" />
        <Field label="טלפון משני"     value={form.phone2}       onChange={set('phone2')}       placeholder="03-0000000" dir="ltr" />
        <Field label="וואטסאפ"         value={form.whatsapp}     onChange={set('whatsapp')}     placeholder="050-0000000" dir="ltr" />
        <Field label="אימייל"         value={form.email}        onChange={set('email')}        placeholder="me@business.com" dir="ltr" />
        <Field label="ע.מ / ח.פ"      value={form.vatId}        onChange={set('vatId')}        placeholder="012345678" dir="ltr" />
        <Field label="אתר אינטרנט"     value={form.website}      onChange={set('website')}      placeholder="www.business.com" dir="ltr" />
        <Field label="Instagram"      value={form.instagram}    onChange={set('instagram')}    placeholder="@business" dir="ltr" />
        <Field label="Facebook"       value={form.facebook}     onChange={set('facebook')}     placeholder="facebook.com/business" dir="ltr" />
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

      <div>
        <label className="label">טקסט תחתית להצעות</label>
        <textarea className="input resize-none text-sm" rows={3}
                  value={form.footerText} onChange={set('footerText')}
                  placeholder='תנאי תשלום / הערת אחריות / תוקף ההצעה...' />
        <p className="text-xs text-ink-subtle mt-1">יופיע בתחתית כל הצעת מחיר שתפיק.</p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'שומר...' : 'שמור שינויים'}
        </button>
        {saved && <span className="text-sm text-success font-medium">✓ נשמר בהצלחה</span>}
      </div>

      {/* Danger zone */}
      <DangerZoneBlock />
    </div>
  )
}

// ─── Danger Zone — wipe work data ─────────────────────────────
function DangerZoneBlock() {
  const uid      = useAuthStore(s => s.uid())
  const addToast = useToastStore(s => s.addToast)
  const [confirmText, setConfirmText] = useState('')
  const [working, setWorking]         = useState(false)
  const ready = confirmText.trim() === 'מחק הכל'

  const handleWipe = async () => {
    if (!ready || working) return
    const finalOk = window.confirm(
      'אישור אחרון: הפעולה תמחק את כל הלקוחות, הפרויקטים, הצעות המחיר, והזמנות הספקים שלך. ' +
      'הספקים, ההגדרות והלוגו יישארו. להמשיך?'
    )
    if (!finalOk) return
    setWorking(true)
    try {
      const counts = await wipeWorkData(uid)
      addToast?.(
        `נמחקו: ${counts.clients} לקוחות, ${counts.projects} פרויקטים, ${counts.quotes} הצעות, ${counts.supplierOrders} הזמנות.`,
        'success', 6000
      )
      setConfirmText('')
    } catch (err) {
      console.error(err)
      addToast?.('שגיאה במחיקה: ' + err.message, 'error')
    }
    setWorking(false)
  }

  return (
    <div className="border border-danger/40 rounded-xl p-4 space-y-3 mt-6 bg-danger/5">
      <div>
        <p className="font-semibold text-danger">אזור מסוכן — איפוס נתוני עבודה</p>
        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
          ימחק לצמיתות: כל הלקוחות, הפרויקטים, הצעות המחיר וההזמנות לספקים.<br />
          <b>לא יימחק:</b> ספקים, פרטי עסק, לוגו, הגדרות יומן/חשבונאות.
        </p>
      </div>
      <div>
        <label className="label">להפעלה, הקלד בדיוק: <span className="font-mono text-danger">מחק הכל</span></label>
        <input className="input text-sm" value={confirmText}
               onChange={e => setConfirmText(e.target.value)}
               placeholder='"מחק הכל"' />
      </div>
      <button
        onClick={handleWipe}
        disabled={!ready || working}
        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors
          ${ready && !working
            ? 'bg-danger text-white hover:bg-red-600'
            : 'bg-surface-300 text-ink-subtle cursor-not-allowed'}`}
      >
        {working ? 'מוחק...' : '⚠️ איפוס נתוני עבודה'}
      </button>
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

      <InfoRow label="גרסת מערכת" value="0.1.0 — Phase 1" />
      <InfoRow label="סביבה"       value="פיתוח" />

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
  const profile = useAuthStore(s => s.profile)
  const sub     = profile?.subscription

  const planLabel = { trial: 'ניסיון חינם', basic: 'Basic', pro: 'Pro' }
  const planColor = { trial: 'badge-warning', basic: 'badge-info', pro: 'badge-success' }

  return (
    <div className="card max-w-lg space-y-5">
      <h2 className="font-semibold text-ink">פרטי מנוי</h2>

      <div className="flex items-center gap-3">
        <span className="label mb-0">תוכנית נוכחית:</span>
        <span className={`badge ${planColor[sub?.plan] || 'badge-neutral'}`}>
          {planLabel[sub?.plan] || sub?.plan}
        </span>
      </div>

      {sub?.expiresAt && (
        <InfoRow label="תוקף" value={
          sub.expiresAt?.toDate
            ? sub.expiresAt.toDate().toLocaleDateString('he-IL')
            : new Date(sub.expiresAt).toLocaleDateString('he-IL')
        } />
      )}

      <div className="rounded-2xl bg-brand-50 border border-brand-100 p-4">
        <p className="font-semibold text-brand-800 mb-1">🚀 Phase 4 — ניהול מנויים</p>
        <p className="text-sm text-brand-700">
          אינטגרציית Stripe, תוכניות Basic / Pro, וניהול חיוב — יתווסף ב-Phase 4.
        </p>
      </div>
    </div>
  )
}

// ─── 🏗️ Projects Workflow Settings ───────────────────────────
function ProjectsSettingsSection() {
  const uid      = useAuthStore(s => s.uid())
  const addToast = useToastStore(s => s.addToast)
  const storeLoad = useGlobalSettingsStore(s => s.load)
  const storeSave = useGlobalSettingsStore(s => s.save)

  const [form, setForm]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!uid) return
    getGlobalSettings(uid).then(s => {
      setForm(s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS })
      setLoading(false)
    })
  }, [uid])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const toggle = (key) => setForm(f => ({ ...f, [key]: !f[key] }))

  // Stage helpers
  const updateStage  = (i, k, v) => setForm(f => ({
    ...f,
    projectStages: f.projectStages.map((s, idx) => idx === i ? { ...s, [k]: v } : s),
  }))
  const addStage = () => setForm(f => ({
    ...f,
    projectStages: [...f.projectStages, {
      key:   `stage_${Date.now()}`,
      label: 'שלב חדש',
      color: '#6B7280',
      order: f.projectStages.length,
    }],
  }))
  const removeStage = (i) => {
    if (form.projectStages.length <= 2) return
    setForm(f => ({
      ...f,
      projectStages: f.projectStages
        .filter((_, idx) => idx !== i)
        .map((s, idx) => ({ ...s, order: idx })),
    }))
  }
  const moveStage = (i, dir) => {
    const arr = [...form.projectStages]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setForm(f => ({ ...f, projectStages: arr.map((s, idx) => ({ ...s, order: idx })) }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await storeSave(uid, form)
      storeLoad(uid) // refresh cache
      addToast('✓ הגדרות פרויקטים נשמרו', 'success')
    } catch { addToast('שגיאה בשמירה', 'error') }
    finally { setSaving(false) }
  }

  if (loading || !form) return <div className="card animate-pulse h-48" />

  return (
    <div className="space-y-5 max-w-lg">

      {/* Workflow stages */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">שלבי Workflow</h2>
          <button onClick={addStage} className="btn-secondary text-xs">+ הוסף שלב</button>
        </div>
        <div className="space-y-2">
          {form.projectStages.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-2">
              <input type="color" value={stage.color}
                onChange={e => updateStage(i, 'color', e.target.value)}
                className="w-8 h-8 rounded-lg border border-surface-200 cursor-pointer p-0.5 shrink-0" />
              <input className="input flex-1 text-sm" value={stage.label}
                onChange={e => updateStage(i, 'label', e.target.value)} placeholder="שם שלב" />
              <div className="flex gap-0.5 shrink-0">
                <button onClick={() => moveStage(i, -1)} disabled={i === 0}
                  className="p-1.5 rounded text-ink-subtle hover:bg-surface-100 disabled:opacity-30 text-xs">↑</button>
                <button onClick={() => moveStage(i, 1)} disabled={i === form.projectStages.length - 1}
                  className="p-1.5 rounded text-ink-subtle hover:bg-surface-100 disabled:opacity-30 text-xs">↓</button>
                <button onClick={() => removeStage(i)} disabled={form.projectStages.length <= 2}
                  className="p-1.5 rounded text-ink-subtle hover:text-danger hover:bg-red-50 disabled:opacity-30 transition-colors text-xs">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trigger-stage selectors */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-ink">שלבים מיוחדים</h2>
        <p className="text-xs text-ink-subtle -mt-2">בחר איזה שלב מפעיל כל אירוע — לא hardcoded</p>

        {[
          { key: 'completionStageKey',       label: '🎉 שלב סיום', desc: 'מפעיל אנימציית הושלם' },
          { key: 'installReadyStageKey',     label: '🔧 שלב מוכן להתקנה', desc: 'מפעיל התראת WhatsApp' },
          { key: 'depositTriggerStageKey',   label: '💰 שלב שמחייב מקדמה', desc: 'מהשלב הזה ואילך — דרוש תשלום' },
          { key: 'materialsTriggerStageKey', label: '📦 שלב שמחייב חומרים', desc: 'מהשלב הזה ואילך — דרושה הזמנת ספק' },
        ].map(({ key, label, desc }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <p className="text-xs text-ink-subtle mb-1">{desc}</p>
            <select className="input max-w-xs" value={form[key] || ''}
              onChange={e => set(key, e.target.value)}>
              <option value="">— ללא —</option>
              {form.projectStages.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Financial rules */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-ink">כללים פיננסיים</h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">דרוש מקדמה לפני שלב הטריגר</p>
            <p className="text-xs text-ink-subtle mt-0.5">חסום מעבר לשלב המחייב ללא מקדמה</p>
          </div>
          <Toggle checked={form.requireDeposit} onChange={() => toggle('requireDeposit')} />
        </div>

        {form.requireDeposit && (
          <div>
            <label className="label">אחוז מקדמה (%)</label>
            <input className="input max-w-[100px]" type="number" min={1} max={100} dir="ltr"
              value={form.depositPercent}
              onChange={e => set('depositPercent', Number(e.target.value))} />
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">דרוש הזמנת חומרים לפני שלב הטריגר</p>
            <p className="text-xs text-ink-subtle mt-0.5">חסום מעבר לשלב המחייב ללא הזמנת ספק</p>
          </div>
          <Toggle checked={form.requireMaterials} onChange={() => toggle('requireMaterials')} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? 'שומר...' : 'שמור הגדרות פרויקטים'}
      </button>
    </div>
  )
}

// ─── 🚚 Suppliers Settings ────────────────────────────────────
function SuppliersSettingsSection() {
  const uid      = useAuthStore(s => s.uid())
  const addToast = useToastStore(s => s.addToast)
  const storeSave = useGlobalSettingsStore(s => s.save)

  const [form,    setForm]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!uid) return
    getGlobalSettings(uid).then(s => {
      setForm(s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS })
      setLoading(false)
    })
  }, [uid])

  const addType    = () => setForm(f => ({ ...f, supplierTypes: [...f.supplierTypes, 'סוג חדש'] }))
  const updateType = (i, v) => setForm(f => ({ ...f, supplierTypes: f.supplierTypes.map((t, idx) => idx === i ? v : t) }))
  const removeType = (i) => {
    if (form.supplierTypes.length <= 1) return
    setForm(f => ({ ...f, supplierTypes: f.supplierTypes.filter((_, idx) => idx !== i) }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await storeSave(uid, form)
      addToast('✓ הגדרות ספקים נשמרו', 'success')
    } catch { addToast('שגיאה בשמירה', 'error') }
    finally { setSaving(false) }
  }

  if (loading || !form) return <div className="card animate-pulse h-48" />

  return (
    <div className="space-y-5 max-w-lg">

      {/* Supplier types */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">סוגי ספקים</h2>
          <button onClick={addType} className="btn-secondary text-xs">+ הוסף</button>
        </div>
        <div className="space-y-2">
          {form.supplierTypes.map((type, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="input flex-1 text-sm" value={type}
                onChange={e => updateType(i, e.target.value)} placeholder="שם סוג ספק" />
              {form.supplierTypes.length > 1 && (
                <button onClick={() => removeType(i)}
                  className="p-1.5 rounded-lg text-ink-subtle hover:text-danger hover:bg-red-50 transition-colors shrink-0 text-xs">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delivery default */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">זמני אספקה</h2>
        <div>
          <label className="label">זמן אספקה ברירת מחדל (ימים)</label>
          <input className="input max-w-[120px]" type="number" min={1} dir="ltr"
            value={form.defaultDeliveryDays}
            onChange={e => setForm(f => ({ ...f, defaultDeliveryDays: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="label">ימי עבודה בשבוע</label>
          <input className="input max-w-[120px]" type="number" min={1} max={7} dir="ltr"
            value={form.workingDaysPerWeek}
            onChange={e => setForm(f => ({ ...f, workingDaysPerWeek: Number(e.target.value) }))} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? 'שומר...' : 'שמור הגדרות ספקים'}
      </button>
    </div>
  )
}

// ─── 👥 Clients / Notifications Settings ─────────────────────
function ClientsSettingsSection() {
  const uid      = useAuthStore(s => s.uid())
  const addToast = useToastStore(s => s.addToast)
  const storeSave = useGlobalSettingsStore(s => s.save)

  const [form,    setForm]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!uid) return
    getGlobalSettings(uid).then(s => {
      setForm(s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS })
      setLoading(false)
    })
  }, [uid])

  const toggle = (key) => setForm(f => ({ ...f, [key]: !f[key] }))
  const setVal = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await storeSave(uid, form)
      addToast('✓ הגדרות לקוחות נשמרו', 'success')
    } catch { addToast('שגיאה בשמירה', 'error') }
    finally { setSaving(false) }
  }

  if (loading || !form) return <div className="card animate-pulse h-48" />

  return (
    <div className="space-y-5 max-w-lg">

      {/* Notifications toggles */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-ink">התראות אוטומטיות</h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">שלח התראות WhatsApp</p>
            <p className="text-xs text-ink-subtle mt-0.5">הצע שליחת הודעה בכל מעבר שלב רלוונטי</p>
          </div>
          <Toggle checked={form.autoNotifications} onChange={() => toggle('autoNotifications')} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">תזמון התקנות</p>
            <p className="text-xs text-ink-subtle mt-0.5">הצע תיאום מועד התקנה דרך יומן</p>
          </div>
          <Toggle checked={form.installationScheduling} onChange={() => toggle('installationScheduling')} />
        </div>
      </div>

      {/* WhatsApp templates */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-ink">תבניות WhatsApp</h2>
        <p className="text-xs text-ink-subtle">
          השתמש ב-<code className="bg-surface-100 px-1 rounded">{'{client}'}</code> ו-<code className="bg-surface-100 px-1 rounded">{'{project}'}</code>
        </p>

        {[
          { key: 'whatsappInstallReady',    label: '🔧 מוכן להתקנה' },
          { key: 'whatsappQuoteSent',       label: '📋 הצעת מחיר נשלחה' },
          { key: 'whatsappPaymentReminder', label: '💰 תזכורת תשלום' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <textarea className="input resize-none text-sm font-mono" rows={3}
              value={form[key] || ''} onChange={setVal(key)} dir="auto" />
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? 'שומר...' : 'שמור הגדרות לקוחות'}
      </button>
    </div>
  )
}

// ─── Shared Toggle ────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0
        ${checked ? 'bg-brand-600' : 'bg-surface-200'}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all
        ${checked ? 'right-1' : 'left-1'}`} />
    </button>
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

// ─── Booking / Installation Scheduling ───────────────────────

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY_LABELS = { sun: 'א׳', mon: 'ב׳', tue: 'ג׳', wed: 'ד׳', thu: 'ה׳', fri: 'ו׳', sat: 'ש׳' }
const REGION_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

const DEFAULT_BOOKING = {
  workingDays: { sun: true, mon: true, tue: true, wed: true, thu: true, fri: false, sat: false },
  windows: [
    { start: '08:00', end: '12:00' },
    { start: '12:00', end: '16:00' },
  ],
  maxPerWindow: 4,
  maxPerDay:    6,
  regions:      [],
  blockedDates: [],
}

function BookingSettingsSection() {
  const uid = useAuthStore(s => s.uid())
  const [cfg, setCfg]         = useState(DEFAULT_BOOKING)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    if (!uid) return
    getBookingSettings(uid).then(data => {
      if (data) setCfg({ ...DEFAULT_BOOKING, ...data })
      setLoading(false)
    })
  }, [uid])

  const toggleDay = (k) => setCfg(c => ({ ...c, workingDays: { ...c.workingDays, [k]: !c.workingDays[k] } }))

  const updateWindow = (i, field, value) =>
    setCfg(c => ({ ...c, windows: c.windows.map((w, idx) => idx === i ? { ...w, [field]: value } : w) }))

  const addWindow    = () => setCfg(c => c.windows.length >= 3 ? c : ({ ...c, windows: [...c.windows, { start: '09:00', end: '12:00' }] }))
  const removeWindow = (i) => setCfg(c => ({ ...c, windows: c.windows.filter((_, idx) => idx !== i) }))

  const addRegion = () =>
    setCfg(c => ({
      ...c,
      regions: [...c.regions, {
        id:    Math.random().toString(36).slice(2, 10),
        name:  '',
        color: REGION_COLORS[c.regions.length % REGION_COLORS.length],
        days:  [],
      }],
    }))
  const updateRegion = (id, field, value) =>
    setCfg(c => ({ ...c, regions: c.regions.map(r => r.id === id ? { ...r, [field]: value } : r) }))
  const removeRegion = (id) =>
    setCfg(c => ({ ...c, regions: c.regions.filter(r => r.id !== id) }))
  const toggleRegionDay = (id, day) =>
    setCfg(c => ({
      ...c,
      regions: c.regions.map(r => r.id === id
        ? { ...r, days: r.days.includes(day) ? r.days.filter(d => d !== day) : [...r.days, day] }
        : r
      ),
    }))

  const addBlockedDate = () => {
    if (!newDate || cfg.blockedDates.includes(newDate)) return
    setCfg(c => ({ ...c, blockedDates: [...c.blockedDates, newDate].sort() }))
    setNewDate('')
  }
  const removeBlockedDate = (d) =>
    setCfg(c => ({ ...c, blockedDates: c.blockedDates.filter(x => x !== d) }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveBookingSettings(uid, cfg)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="card animate-pulse h-40" />

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Working days */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">ימי עבודה</h2>
        <p className="text-sm text-ink-muted">שבת וימי חג חסומים אוטומטית. שישי — לפי בחירתך.</p>
        <div className="flex flex-wrap gap-2">
          {DAY_KEYS.map(k => (
            <button
              key={k}
              type="button"
              onClick={() => toggleDay(k)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                cfg.workingDays[k]
                  ? 'bg-brand-400 text-black'
                  : 'bg-surface-300 text-ink-muted'
              }`}
            >
              {DAY_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Time windows */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">חלונות שעות</h2>
        <p className="text-sm text-ink-muted">עד 3 חלונות ביום. לדוגמה: 08:00–12:00 (בוקר), 12:00–16:00 (צהריים).</p>
        <div className="space-y-2">
          {cfg.windows.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="time" className="input flex-1 text-sm" value={w.start}
                     onChange={e => updateWindow(i, 'start', e.target.value)} />
              <span className="text-ink-muted">—</span>
              <input type="time" className="input flex-1 text-sm" value={w.end}
                     onChange={e => updateWindow(i, 'end', e.target.value)} />
              <button className="btn-ghost text-xs text-danger" onClick={() => removeWindow(i)}>הסר</button>
            </div>
          ))}
        </div>
        {cfg.windows.length < 3 && (
          <button className="btn-secondary text-sm" onClick={addWindow}>+ הוסף חלון</button>
        )}
      </div>

      {/* Limits */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">מגבלות</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">מקס׳ בחלון</label>
            <input type="number" min={1} max={10} className="input text-sm"
                   value={cfg.maxPerWindow}
                   onChange={e => setCfg(c => ({ ...c, maxPerWindow: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">מקס׳ ביום</label>
            <input type="number" min={1} max={20} className="input text-sm"
                   value={cfg.maxPerDay}
                   onChange={e => setCfg(c => ({ ...c, maxPerDay: Number(e.target.value) }))} />
          </div>
        </div>
      </div>

      {/* Regions */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">אזורים</h2>
        <p className="text-sm text-ink-muted">כל אזור צבוע בצבע משלו ביומן. בחר לאיזה ימים הוא פעיל.</p>
        <div className="space-y-3">
          {cfg.regions.map(r => (
            <div key={r.id} className="bg-surface-300 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-10 rounded-lg border-0 bg-transparent cursor-pointer"
                       value={r.color} onChange={e => updateRegion(r.id, 'color', e.target.value)} />
                <input className="input flex-1 text-sm" placeholder="שם האזור (חיפה, קריות...)"
                       value={r.name} onChange={e => updateRegion(r.id, 'name', e.target.value)} />
                <button className="btn-ghost text-xs text-danger" onClick={() => removeRegion(r.id)}>הסר</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAY_KEYS.filter(k => cfg.workingDays[k]).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleRegionDay(r.id, k)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      r.days.includes(k)
                        ? 'text-black'
                        : 'bg-surface-400 text-ink-muted'
                    }`}
                    style={r.days.includes(k) ? { backgroundColor: r.color } : {}}
                  >
                    {DAY_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="btn-secondary text-sm" onClick={addRegion}>+ הוסף אזור</button>
      </div>

      {/* Blocked dates */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">תאריכים חסומים ידנית</h2>
        <p className="text-sm text-ink-muted">חגים, ערבי חג, חופשות — לא ניתן לתאם בתאריכים אלה.</p>
        <div className="flex gap-2">
          <input type="date" className="input flex-1 text-sm"
                 value={newDate} onChange={e => setNewDate(e.target.value)} />
          <button className="btn-secondary text-sm" onClick={addBlockedDate}>+ חסום</button>
        </div>
        {cfg.blockedDates.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {cfg.blockedDates.map(d => (
              <span key={d} className="inline-flex items-center gap-1.5 bg-surface-300 rounded-lg px-3 py-1.5 text-sm">
                {d}
                <button className="text-danger text-xs" onClick={() => removeBlockedDate(d)}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'שומר...' : 'שמור הגדרות יומן'}
        </button>
        {saved && <span className="text-sm text-success font-medium">✓ נשמר</span>}
      </div>
    </div>
  )
}

// ─── UX / Experience Settings ────────────────────────────────

function UxSettingsSection() {
  const uid            = useAuthStore(s => s.uid())
  const addToast       = useToastStore(s => s.addToast)
  const setDefaultDur  = useToastStore(s => s.setDefaultDuration)
  const storeSave      = useGlobalSettingsStore(s => s.save)

  const [form,    setForm]    = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    getGlobalSettings(uid).then(s => {
      setForm(s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS })
      setLoading(false)
    })
  }, [uid])

  const toggle = (key) => setForm(f => ({ ...f, [key]: !f[key] }))

  const updateCat = (i, k, v) => setForm(f => ({
    ...f,
    expenseCategories: f.expenseCategories.map((c, idx) => idx === i ? { ...c, [k]: v } : c),
  }))
  const addCat = () => setForm(f => ({
    ...f,
    expenseCategories: [...f.expenseCategories, { key: `cat_${Date.now()}`, label: 'קטגוריה חדשה', color: '#6B7280' }],
  }))
  const removeCat = (i) => setForm(f => ({
    ...f,
    expenseCategories: f.expenseCategories.filter((_, idx) => idx !== i),
  }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = { ...form, toastDuration: Number(form.toastDuration) }
      await storeSave(uid, data)
      setDefaultDur(data.toastDuration)
      addToast('✓ הגדרות חוויה נשמרו', 'success')
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (loading || !form) return <div className="card animate-pulse h-48" />

  return (
    <div className="space-y-5 max-w-lg">

      {/* Completion moment */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">🎉 רגע סיום</h2>
        <p className="text-xs text-ink-subtle">מה יקרה כשפרויקט עובר לשלב הסיום</p>
        <ToggleRow label="אנימציית סיום" description="מציג כרטיסיית 🎉"
          checked={form.completionAnimation} onChange={() => toggle('completionAnimation')} />
        <ToggleRow label="צליל הצלחה" description="מנגן צליל קצר (Web Audio)"
          checked={form.completionSound} onChange={() => toggle('completionSound')} />
      </div>

      {/* WhatsApp toggle — template עצמה ב-👥 לקוחות */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">📱 התראת WhatsApp</h2>
        <p className="text-xs text-ink-subtle">
          התבנית עצמה נמצאת בטאב <strong>👥 לקוחות</strong>
        </p>
        <ToggleRow label="הצג התראת WhatsApp" description="מציג הצעה לשלוח הודעה ללקוח"
          checked={form.whatsappNotification} onChange={() => toggle('whatsappNotification')} />
      </div>

      {/* Toast duration */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">💬 Toast הודעות</h2>
        <div>
          <label className="label">משך הצגה (שניות)</label>
          <input className="input max-w-[120px]" type="number" min={1} max={10} dir="ltr"
            value={Math.round(Number(form.toastDuration) / 1000)}
            onChange={e => setForm(f => ({ ...f, toastDuration: Number(e.target.value) * 1000 }))} />
        </div>
      </div>

      {/* Expense categories */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">💸 קטגוריות הוצאות</h2>
          <button className="btn-secondary text-xs" onClick={addCat}>+ הוסף</button>
        </div>
        <div className="space-y-2">
          {(form.expenseCategories || []).map((cat, i) => (
            <div key={cat.key} className="flex items-center gap-2">
              <input type="color" value={cat.color} onChange={e => updateCat(i, 'color', e.target.value)}
                className="w-8 h-8 rounded-lg border border-surface-200 cursor-pointer p-0.5" />
              <input className="input flex-1 text-sm" value={cat.label} placeholder="שם קטגוריה"
                onChange={e => updateCat(i, 'label', e.target.value)} />
              {form.expenseCategories.length > 1 && (
                <button onClick={() => removeCat(i)}
                  className="p-1.5 rounded-lg text-ink-subtle hover:text-danger hover:bg-red-50 transition-colors shrink-0">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? 'שומר...' : 'שמור הגדרות חוויה'}
      </button>
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="text-xs text-ink-subtle mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// ─── Pricing Settings ─────────────────────────────────────────
function PricingSettingsSection() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">מחירון מקלחונים</h2>
        <p className="text-sm text-ink-muted">
          המחשבון משתמש במחירון מובנה לפי עובי זכוכית (6/8/10 מ״מ), סוג זכוכית וצבע פרזול.
        </p>
        <p className="text-sm text-ink-muted">
          לשינוי מחירים — יש לעדכן את הקובץ <span className="font-mono text-brand-400">src/utils/calculatorEngine.js</span>.
        </p>
        <p className="text-xs text-ink-subtle mt-2">
          עריכה מהמערכת תתווסף בעתיד.
        </p>
      </div>
    </div>
  )
}

// ─── Accounting Settings ─────────────────────────────────────
function AccountingSettingsSection() {
  const uid      = useAuthStore(s => s.uid())
  const addToast = useToastStore(s => s.addToast)

  const [provider,    setProvider]    = useState(PROVIDER.EZCOUNT)
  const [credentials, setCredentials] = useState({})
  const [enabled,     setEnabled]     = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [testing,     setTesting]     = useState(false)
  const [testResult,  setTestResult]  = useState(null) // 'ok' | 'fail' | null

  useEffect(() => {
    if (!uid) return
    loadAccountingConfig(uid).then(cfg => {
      if (cfg.provider)    setProvider(cfg.provider)
      if (cfg.credentials) setCredentials(cfg.credentials)
      setEnabled(cfg.enabled)
      setLoading(false)
    })
  }, [uid])

  const info = PROVIDER_INFOS[provider]

  const handleField = (name, value) =>
    setCredentials(c => ({ ...c, [name]: value }))

  const handleTest = async () => {
    setTesting(true); setTestResult(null)
    try {
      await testConnection(uid, provider, credentials)
      setTestResult('ok')
      addToast?.('✓ החיבור תקין', 'success')
    } catch (err) {
      console.error(err)
      setTestResult('fail')
      addToast?.(`כשל בחיבור: ${err.message}`, 'error')
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveAccountingConfig(uid, { provider, credentials, enabled })
      addToast?.('נשמר', 'success')
    } catch (err) {
      console.error(err)
      addToast?.('שגיאה בשמירה', 'error')
    }
    setSaving(false)
  }

  if (loading) return <div className="card animate-pulse h-48" />

  return (
    <div className="space-y-5 max-w-2xl">

      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold text-ink">ספק חשבונאי</h2>
          <p className="text-sm text-ink-muted mt-1">
            המערכת תיצור אוטומטית לקוחות ומסמכים (קבלה / חשבונית מס-קבלה) במערכת שתבחר.
          </p>
        </div>

        {/* Provider picker */}
        <div>
          <label className="label">ספק</label>
          <select className="input text-sm" value={provider} onChange={e => setProvider(e.target.value)}>
            {SUPPORTED_PROVIDERS.map(p => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </div>

        {/* Credential fields (per provider) */}
        {info?.credentialsHint && (
          <p className="text-xs text-ink-subtle">{info.credentialsHint}</p>
        )}
        <div className="space-y-3">
          {(info?.credentialFields || []).map(f => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input
                type={f.type}
                className="input text-sm"
                dir="ltr"
                value={credentials[f.name] || ''}
                onChange={e => handleField(f.name, e.target.value)}
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        {/* Enable toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-brand-400"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
          />
          <span className="text-sm text-ink">הפעל חיבור לחשבונאות</span>
        </label>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'שומר...' : 'שמור'}
          </button>
          <button onClick={handleTest} disabled={testing} className="btn-secondary">
            {testing ? 'בודק...' : 'בדוק חיבור'}
          </button>
          {testResult === 'ok'   && <span className="text-sm text-success font-medium">✓ חיבור תקין</span>}
          {testResult === 'fail' && <span className="text-sm text-danger  font-medium">✗ כשל בחיבור</span>}
        </div>
      </div>

      {/* Info box */}
      <div className="card">
        <h3 className="font-semibold text-ink mb-2">מה מופעל אוטומטית?</h3>
        <ul className="text-sm text-ink-muted space-y-1.5">
          <li>• לקוח חדש באפליקציה → נוצר אוטומטית במערכת החשבונאית</li>
          <li>• רישום תשלום בפרויקט → ניתן להנפיק קבלה או חשבונית מס-קבלה</li>
          <li>• שליחת המסמך ללקוח במייל/וואטסאפ</li>
        </ul>
        <p className="text-xs text-ink-subtle mt-3">
          הצעות מחיר נשארות באפליקציה ולא נשלחות לחשבונאות.
        </p>
      </div>
    </div>
  )
}

