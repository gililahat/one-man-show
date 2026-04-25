// src/pages/sirtoot/SirtootPage.jsx
// Shower sketcher — picks a model, renders it in 3D, lets the user edit.
// When ?clientId=X is in the URL, the primary action becomes "Save as measurement"
// which persists the sketch under the client's `measurements[]` array.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { updateClient } from '@/firebase/db'
import { SIRTOOT_CATALOG, findModel } from '@/utils/sirtoot/catalog'
import { computeShower } from '@/utils/sirtoot/rules'
import SirtootScene from '@/components/sirtoot/SirtootScene'
import PanelEditor from '@/components/sirtoot/PanelEditor'
import ProductionSheet from '@/components/sirtoot/ProductionSheet'

const THICKNESSES = [6, 8, 10]
const newMeasurementId = () =>
  'meas_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)

export default function SirtootPage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const uid        = useAuthStore(s => s.uid())
  const clientId      = params.get('clientId')
  const clientName    = params.get('clientName') || ''
  const measurementId = params.get('measurementId')

  const [modelId, setModelId]     = useState(null)
  const [thickness, setThickness] = useState(8)
  const [panelInputs, setInputs]  = useState([])
  const [mode, setMode]           = useState('gross')
  const [doorsOpen, setDoorsOpen] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [measName, setMeasName]   = useState('')  // preserved when editing
  const [editingIdx, setEditing]  = useState(null) // which panel is open in editor
  const [showProd, setShowProd]   = useState(false) // production sheet visible?
  const [seams, setSeams]         = useState([])    // [{panelIndex, x, y}] — angle bubbles on scene
  const [seamOpen, setSeamOpen]   = useState(null)  // which seam has its popover open
  const [panelMarks, setPanelMarks] = useState([])  // [{panelIndex, x, y}] — edit icons on each panel

  // Load existing measurement when ?measurementId=X is present
  useEffect(() => {
    if (!uid || !clientId || !measurementId) return
    let cancelled = false
    ;(async () => {
      const { doc, getDoc } = await import('firebase/firestore')
      const { db } = await import('@/firebase/config')
      const snap = await getDoc(doc(db, 'users', uid, 'clients', clientId))
      if (cancelled || !snap.exists()) return
      const meas = (snap.data().measurements || []).find(m => m.id === measurementId)
      if (!meas) return
      setModelId(meas.modelId)
      setThickness(meas.thickness || 8)
      setInputs(meas.panelInputs || [])
      setMeasName(meas.name || '')
    })()
    return () => { cancelled = true }
  }, [uid, clientId, measurementId])

  const model = findModel(modelId)

  // Reset inputs + selection when model changes
  const pickModel = (m) => {
    setModelId(m.id)
    setInputs(m.panels.map(p => ({ userW: p.defaultW, userH: 1900 })))
    setDoorsOpen(false)
  }

  const computed = useMemo(() => {
    if (!model) return []
    return computeShower({
      model, thickness, opening: { height: 1900 }, panelInputs,
    })
  }, [model, thickness, panelInputs])

  async function saveAsMeasurement() {
    if (!uid || !clientId || !model || saving) return
    const suggested = measName ||
      `${model.label} ${computed[0]?.gross.w || ''}×${computed[0]?.gross.h || ''}`.trim()
    const name = prompt('שם למדידה:', suggested)
    if (!name || !name.trim()) return
    setSaving(true)
    try {
      const { doc, getDoc } = await import('firebase/firestore')
      const { db } = await import('@/firebase/config')
      const ref = doc(db, 'users', uid, 'clients', clientId)
      const snap = await getDoc(ref)
      const existing = snap.exists() ? (snap.data().measurements || []) : []
      const now = new Date().toISOString()
      let next
      if (measurementId) {
        // Update existing
        next = existing.map(m => m.id === measurementId
          ? { ...m, name: name.trim(), modelId: model.id, calculatorType: model.calculatorType, thickness, panelInputs, updatedAt: now }
          : m,
        )
      } else {
        next = [...existing, {
          id: newMeasurementId(), name: name.trim(),
          modelId: model.id, calculatorType: model.calculatorType,
          thickness, panelInputs, createdAt: now,
        }]
      }
      await updateClient(uid, clientId, { measurements: next })
      navigate(`/clients/${clientId}`)
    } catch (e) {
      console.error('saveAsMeasurement failed', e)
      alert('שמירה נכשלה. נסה שוב.')
    } finally {
      setSaving(false)
    }
  }

  // ── Model picker screen ──────────────────────────────────────────
  if (!model) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="page-header">
          <h1 className="page-title">מנוע סירטוט</h1>
          <p className="text-sm text-ink-muted">בחר דגם מקלחון כדי להתחיל</p>
        </div>

        <div className="card mb-4 flex items-center gap-2">
          <span className="text-xs font-bold text-ink-muted ml-2">עובי זכוכית</span>
          {THICKNESSES.map(t => (
            <button key={t}
              onClick={() => setThickness(t)}
              className={`flex-1 py-2 rounded-lg border-2 font-bold text-sm transition ${
                thickness === t ? 'bg-ink border-ink text-white' : 'bg-white border-surface-200 text-ink'
              }`}>
              {t} מ״מ
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SIRTOOT_CATALOG.map(m => (
            <button key={m.id}
              onClick={() => pickModel(m)}
              className="card text-right hover:border-brand-400 hover:shadow-md transition cursor-pointer">
              <div className="flex items-center gap-3">
                <ModelSketch panels={m.panels} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink">{m.label}</div>
                  <div className="text-xs text-ink-muted mt-0.5">{describeModel(m)}</div>
                </div>
                <span className="text-surface-400 text-xl">‹</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Scene screen ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-4 py-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-ink">{model.label}</div>
          <div className="text-xs text-ink-muted">
            זכוכית {thickness} מ״מ
            {clientName && <span className="text-brand-600 font-semibold"> · מודד עבור {clientName}</span>}
          </div>
        </div>
        <button onClick={() => setModelId(null)}
          className="text-sm text-brand-500 font-semibold px-2 py-1">
          ‹ חזור לקטלוג
        </button>
      </div>

      {/* Mode toggle */}
      <div className="bg-white border-b border-surface-200 px-4 py-2 flex gap-2">
        <button onClick={() => setMode('gross')}
          className={`flex-1 py-1.5 rounded-lg border-2 font-bold text-xs transition ${
            mode === 'gross' ? 'bg-ink border-ink text-white' : 'bg-white border-ink text-ink'
          }`}>מידות ברוטו</button>
        <button onClick={() => setMode('net')}
          className={`flex-1 py-1.5 rounded-lg border-2 font-bold text-xs transition ${
            mode === 'net' ? 'bg-ink border-ink text-white' : 'bg-white border-ink text-ink'
          }`}>מידות נטו (ייצור)</button>
      </div>

      {/* 3D scene */}
      <div className="flex-1 relative bg-surface-100">
        <SirtootScene
          panels={computed}
          thickness={thickness}
          mode={mode}
          doorsOpen={doorsOpen}
          onPanelClick={setEditing}
          onSeamsUpdate={setSeams}
          onPanelsProject={setPanelMarks}
        />

        {/* Edit bubbles — one per panel, floating on top of it */}
        {panelMarks.map(m => (
          <button key={m.panelIndex}
            onClick={() => setEditing(m.panelIndex)}
            className="absolute z-10 pointer-events-auto rounded-full w-9 h-9 flex items-center justify-center active:scale-95 transition"
            style={{
              left: m.x, top: m.y,
              transform: 'translate(-50%, -50%)',
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(148,163,184,0.45)',
              backdropFilter: 'blur(2px)',
            }}
            title="לחץ לעריכת הפנל">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3l4 4L7 21H3v-4L17 3z"/>
            </svg>
          </button>
        ))}

        {/* Seam angle bubbles — one per pair of adjacent panels */}
        {seams.map(s => {
          const currentAngle = panelInputs[s.panelIndex]?.angleBefore || 180
          const isOpen = seamOpen === s.panelIndex
          const display = currentAngle === 180 ? '180°' : `↰ ${currentAngle}°`
          const colored = currentAngle !== 180
          return (
            <div key={s.panelIndex} className="absolute z-10 pointer-events-none"
                 style={{ left: s.x, top: s.y, transform: 'translate(-50%, -50%)' }}>
              <button
                onClick={() => setSeamOpen(isOpen ? null : s.panelIndex)}
                className="pointer-events-auto rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md border-2 transition active:scale-95"
                style={{
                  background: colored ? '#0f172a' : 'rgba(255,255,255,0.95)',
                  color: colored ? '#F5C518' : '#0f172a',
                  borderColor: '#0f172a',
                }}>
                {display}
              </button>
              {isOpen && (
                <div className="pointer-events-auto absolute top-full mt-1 left-1/2 -translate-x-1/2 flex gap-1 bg-white border-2 border-ink rounded-lg p-1 shadow-lg whitespace-nowrap">
                  {[90, 135, 180].map(a => (
                    <button key={a}
                      onClick={() => {
                        const next = panelInputs.slice()
                        next[s.panelIndex] = { ...(next[s.panelIndex] || {}), angleBefore: a }
                        setInputs(next)
                        setSeamOpen(null)
                      }}
                      style={{
                        background: currentAngle === a ? '#0f172a' : '#fff',
                        color:      currentAngle === a ? '#fff'    : '#0f172a',
                      }}
                      className="rounded px-2 py-1 text-xs font-bold border border-ink">
                      {a === 180 ? '180°' : `${a}°`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <button
          onClick={() => setDoorsOpen(v => !v)}
          style={{ color: doorsOpen ? '#fff' : '#0f172a' }}
          className={`absolute bottom-3 right-3 px-4 py-2 rounded-full border-2 border-ink font-bold text-xs shadow-lg transition ${
            doorsOpen ? 'bg-ink' : 'bg-white'
          }`}>
          🚪 {doorsOpen ? 'סגור דלתות' : 'פתח דלתות'}
        </button>
      </div>

      {/* Toolbar — tap the ✏️ bubble on a panel (above) to edit it */}
      <div className="bg-white border-t border-surface-200 px-3 py-3 flex gap-2">
        <button onClick={() => setShowProd(true)} className="btn-secondary flex-1">
          📐 לייצור
        </button>
        {clientId ? (
          <button onClick={saveAsMeasurement} disabled={saving} className="btn-primary flex-1">
            {saving ? 'שומר…' : '💾 שמור מדידה'}
          </button>
        ) : (
          <button disabled className="btn-primary flex-1 opacity-40 cursor-not-allowed">
            💾 שמור (ללא לקוח)
          </button>
        )}
      </div>

      {/* Panel editor modal */}
      {editingIdx !== null && computed[editingIdx] && (
        <PanelEditor
          panel={computed[editingIdx]}
          panelInput={panelInputs[editingIdx] || {}}
          onSave={(newInput) => {
            const next = panelInputs.slice()
            next[editingIdx] = newInput
            setInputs(next)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Production sheet modal */}
      {showProd && (
        <ProductionSheet
          panels={computed}
          modelLabel={model.label}
          thickness={thickness}
          onClose={() => setShowProd(false)}
        />
      )}
    </div>
  )
}

// ── Small model-card sketch ─────────────────────────────────────
function ModelSketch({ panels }) {
  return (
    <div className="flex items-end justify-center gap-[2px] w-[72px] h-[52px] flex-shrink-0">
      {panels.map((p, i) => (
        <div key={i}
          className={`rounded-sm border ${
            p.kind === 'door' ? 'border-surface-500 bg-surface-200' : 'border-surface-300 bg-surface-100'
          }`}
          style={{
            width: panels.length === 1 ? 48 : panels.length === 2 ? 30 : 20,
            height: 48,
          }}
        />
      ))}
    </div>
  )
}

function describeModel(m) {
  const parts = m.panels.map(p =>
    p.kind === 'door' ? `דלת ${p.hingeSide === 'R' ? 'ימין' : p.hingeSide === 'L' ? 'שמאל' : ''}`
    : p.kind === 'wall-ext' ? 'קיר המשך'
    : 'קבוע'
  )
  return parts.join(' + ')
}
