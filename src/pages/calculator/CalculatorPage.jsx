// src/pages/calculator/CalculatorPage.jsx
import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { getClients, getProjects, addQuote } from '@/firebase/db'
import {
  calcShowerQuote, formatCurrency, formatArea,
} from '@/utils/calculatorEngine'
import usePricing from '@/hooks/usePricing'

const DEFAULT_PANEL = {
  label: 'פנל 1', width: '', height: '',
  glassType: 'clear_8', openingType: 'fixed',
}

const DEFAULT_CONFIG = {
  profileType: 'frameless',
  hardwareSet: 'standard',
  installFee: 500,
  discountPct: 0,
  vatPct: 17,
}

export default function CalculatorPage() {
  const uid      = useAuthStore(s => s.uid())
  const profile  = useAuthStore(s => s.profile)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Pre-fill from URL params (coming from ProjectsPage)
  const urlContext = {
    clientId:    searchParams.get('clientId')    || '',
    clientName:  searchParams.get('clientName')  || '',
    projectId:   searchParams.get('projectId')   || '',
    projectName: searchParams.get('projectName') || '',
  }

  const [panels, setPanels] = useState([{ ...DEFAULT_PANEL }])
  const [config, setConfig] = useState({
    ...DEFAULT_CONFIG,
    vatPct: profile?.settings?.defaultVAT || 17,
  })

  // Sync vatPct when profile loads asynchronously
  useEffect(() => {
    if (profile?.settings?.defaultVAT) {
      setConfig(c => ({ ...c, vatPct: profile.settings.defaultVAT }))
    }
  }, [profile?.settings?.defaultVAT])
  const [saving, setSaving]       = useState(false)
  const [saveModal, setSaveModal] = useState(false)

  // Load custom pricing from Firebase (with code fallback)
  const pricing = usePricing()
  const { glassTypes, profileTypes, hardwareSets, openingTypes } = pricing

  const hasContext = !!urlContext.projectId

  const setConf = (k) => (e) => setConfig(c => ({ ...c, [k]: e.target.value }))

  // Live calculation
  const result = useMemo(() => calcShowerQuote({ panels, ...config }, pricing), [panels, config, pricing])

  // Panel helpers
  const addPanel = () => setPanels(ps => [
    ...ps, { ...DEFAULT_PANEL, label: `פנל ${ps.length + 1}` }
  ])
  const removePanel = (i) => setPanels(ps => ps.filter((_, idx) => idx !== i))
  const updatePanel = (i, k, v) => setPanels(ps =>
    ps.map((p, idx) => idx === i ? { ...p, [k]: v } : p)
  )

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">מחשבון מקלחון</h1>
          <p className="text-sm text-ink-muted">חשב מחיר והפק הצעת מחיר</p>
        </div>
        <button className="btn-primary" onClick={() => setSaveModal(true)}
                disabled={result.total === 0}>
          שמור כהצעת מחיר
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">

        {/* Context banner when arriving from a project */}
      {hasContext && (
        <div className="lg:col-span-2 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 flex items-center gap-3">
          <span className="text-brand-600">📁</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-800">
              {urlContext.projectName && <span>פרויקט: {urlContext.projectName}</span>}
              {urlContext.clientName  && <span className="mr-3">לקוח: {urlContext.clientName}</span>}
            </p>
            <p className="text-xs text-brand-600">הצעת המחיר תקושר אוטומטית לפרויקט זה</p>
          </div>
        </div>
      )}
      {/* ── Left: Panels + Config ────────────────────── */}
        <div className="space-y-4">

          {/* Panels */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">פנלים</h2>
              <button className="btn-secondary text-xs" onClick={addPanel}>+ הוסף פנל</button>
            </div>

            {panels.map((panel, i) => (
              <PanelRow key={i} panel={panel} index={i}
                glassTypes={glassTypes}
                openingTypes={openingTypes}
                result={result.panelResults[i]}
                onChange={(k, v) => updatePanel(i, k, v)}
                onRemove={panels.length > 1 ? () => removePanel(i) : null} />
            ))}
          </div>

          {/* Config */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-ink">הגדרות</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <SelectField label="סוג פרופיל" value={config.profileType} onChange={setConf('profileType')}>
                {profileTypes.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </SelectField>
              <SelectField label="סט פרזול" value={config.hardwareSet} onChange={setConf('hardwareSet')}>
                {hardwareSets.map(h => <option key={h.key} value={h.key}>{h.label} — {formatCurrency(h.price)}</option>)}
              </SelectField>
              <NumField label="עלות התקנה (₪)" value={config.installFee}
                onChange={setConf('installFee')} min={0} />
              <NumField label="הנחה (%)" value={config.discountPct}
                onChange={setConf('discountPct')} min={0} max={100} />
              <NumField label='מע"מ (%)' value={config.vatPct}
                onChange={setConf('vatPct')} min={0} max={30} />
            </div>
          </div>
        </div>

        {/* ── Right: Live Summary ───────────────────────── */}
        <div className="card sticky top-4 space-y-3">
          <h2 className="font-semibold text-ink mb-1">סיכום מחיר</h2>

          <SummaryRow label="שטח כולל"     value={formatArea(result.totalArea)} />
          <SummaryRow label="זכוכית"        value={formatCurrency(result.glassSubtotal)} />
          <SummaryRow label={`פרופיל (${result.profileLabel})`}
                      value={formatCurrency(result.profileCost)} />
          <SummaryRow label={`פרזול (${result.hardwareLabel})`}
                      value={formatCurrency(result.hardwareCost)} />
          <SummaryRow label="התקנה"         value={formatCurrency(result.installCost)} />

          <div className="border-t border-surface-200 pt-3 space-y-2">
            <SummaryRow label="סה"כ לפני הנחה"
                        value={formatCurrency(result.subtotalBeforeDiscount)} />
            {Number(config.discountPct) > 0 && (
              <SummaryRow label={`הנחה (${config.discountPct}%)`}
                          value={`− ${formatCurrency(result.discountAmount)}`}
                          className="text-success" />
            )}
            <SummaryRow label={`מע"מ (${config.vatPct}%)`}
                        value={formatCurrency(result.vatAmount)} />
          </div>

          <div className="border-t-2 border-brand-600 pt-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink text-base">סה"כ לתשלום</span>
              <span className="font-bold text-brand-600 text-xl">
                {formatCurrency(result.total)}
              </span>
            </div>
          </div>

          <button className="btn-primary w-full mt-1" onClick={() => setSaveModal(true)}
                  disabled={result.total === 0}>
            שמור כהצעת מחיר
          </button>
        </div>
      </div>

      {saveModal && (
        <SaveQuoteModal
          result={result}
          panels={panels}
          config={config}
          uid={uid}
          prefill={urlContext}
          onClose={() => setSaveModal(false)}
          onSaved={() => { setSaveModal(false); navigate('/quotes') }}
        />
      )}
    </div>
  )
}

// ─── Panel Row ────────────────────────────────────────────────
function PanelRow({ panel, index, result, glassTypes, openingTypes, onChange, onRemove }) {
  return (
    <div className="rounded-2xl border border-surface-200 p-4 space-y-3 bg-surface-50">
      <div className="flex items-center justify-between">
        <input className="input max-w-[140px] text-sm font-medium bg-transparent border-0 p-0
                          focus:ring-0 focus:border-b focus:border-brand-500 rounded-none"
          value={panel.label} onChange={e => onChange('label', e.target.value)}
          placeholder={`פנל ${index + 1}`} />
        {onRemove && (
          <button onClick={onRemove}
                  className="text-xs text-danger hover:text-red-700 font-medium">
            הסר
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NumField label='רוחב (מ"מ)' value={panel.width}
          onChange={e => onChange('width', e.target.value)} min={100} max={2500} />
        <NumField label='גובה (מ"מ)' value={panel.height}
          onChange={e => onChange('height', e.target.value)} min={100} max={3000} />
        <SelectField label="סוג זכוכית" value={panel.glassType}
          onChange={e => onChange('glassType', e.target.value)}>
          {glassTypes.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
        </SelectField>
        <SelectField label="סוג פתיחה" value={panel.openingType}
          onChange={e => onChange('openingType', e.target.value)}>
          {openingTypes.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </SelectField>
      </div>
      {result && result.area > 0 && (
        <div className="flex items-center gap-4 text-xs text-ink-muted pt-1 border-t border-surface-200">
          <span>שטח: {formatArea(result.area)}</span>
          <span>מחיר פנל: <strong className="text-ink">{formatCurrency(result.panelPrice)}</strong></span>
        </div>
      )}
    </div>
  )
}

// ─── Save Quote Modal ─────────────────────────────────────────
function SaveQuoteModal({ result, panels, config, uid, prefill = {}, onClose, onSaved }) {
  const [clients, setClients]   = useState([])
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({
    clientId:    prefill.clientId    || '',
    clientName:  prefill.clientName  || '',
    projectId:   prefill.projectId   || '',
    projectName: prefill.projectName || '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getClients(uid).then(async c => {
      setClients(c)
      // If prefill has a client, load their projects
      if (prefill.clientId) {
        const ps = await getProjects(uid)
        setProjects(ps.filter(p => p.clientId === prefill.clientId))
      }
    })
  }, [uid])

  const handleClientChange = async (e) => {
    const c = clients.find(c => c.id === e.target.value)
    setForm(f => ({ ...f, clientId: e.target.value, clientName: c?.name || '', projectId: '', projectName: '' }))
    if (e.target.value) {
      const ps = await getProjects(uid)
      setProjects(ps.filter(p => p.clientId === e.target.value))
    }
  }

  const handleProjectChange = (e) => {
    const p = projects.find(p => p.id === e.target.value)
    setForm(f => ({ ...f, projectId: e.target.value, projectName: p?.title || '' }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await addQuote(uid, {
        // IDs — always propagated
        clientId:    form.clientId    || '',
        clientName:  form.clientName  || '',
        projectId:   form.projectId   || '',
        projectName: form.projectName || '',
        notes:       form.notes       || '',
        // Calculation data
        panels,
        config,
        result: {
          // Full result snapshot so quotes never depend on re-calculation
          ...result,
        },
        title: `הצעת מחיר — ${form.clientName || 'לקוח'}`,
      })
      onSaved()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-ink">שמור הצעת מחיר</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">✕</button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-brand-50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-brand-800">סה"כ</span>
            <span className="font-bold text-brand-700 text-lg">{formatCurrency(result.total)}</span>
          </div>

          <div>
            <label className="label">לקוח</label>
            <select className="input" value={form.clientId} onChange={handleClientChange}>
              <option value="">— בחר לקוח —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {form.clientId && (
            <div>
              <label className="label">פרויקט (אופציונלי)</label>
              <select className="input" value={form.projectId} onChange={handleProjectChange}>
                <option value="">— בחר פרויקט —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="label">הערות</label>
            <textarea className="input resize-none" rows={2}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
              {loading ? 'שומר...' : 'שמור הצעה'}
            </button>
            <button className="btn-secondary" onClick={onClose}>ביטול</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Field components ─────────────────────────────────────────
function NumField({ label, value, onChange, min, max }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" value={value} onChange={onChange}
        min={min} max={max} dir="ltr" />
    </div>
  )
}

function SelectField({ label, value, onChange, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={onChange}>{children}</select>
    </div>
  )
}

function SummaryRow({ label, value, className }) {
  return (
    <div className={`flex items-center justify-between text-sm ${className || ''}`}>
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}
