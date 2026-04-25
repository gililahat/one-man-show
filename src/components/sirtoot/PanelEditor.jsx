// src/components/sirtoot/PanelEditor.jsx
// Edit modal for a single panel: width / height, step, and wall/floor slopes
// (F, C, D, E). The step and slopes always sit on the wall side per rule.
// The angle-to-previous-panel is edited on the 3D scene via seam bubbles,
// not here.
import { useEffect, useState } from 'react'
import { panelPolygon, nominalRect } from '@/utils/sirtoot/geometry'

// Must match the Three.js scene background (SirtootScene.jsx: 0xe2e8f0)
const SCENE_BG = '#e2e8f0'

export default function PanelEditor({
  panel,           // computed panel from rules.js { kind, role, hingeSide, gross, net, step, slopes, angleBefore }
  panelInput,      // current raw input { userW, userH, step, slopes, angleBefore }
  onSave,          // (newInput) => void
  onClose,         // () => void
}) {
  const isDoor = panel.kind === 'door'
  const kindHeb = isDoor ? 'דלת' : panel.kind === 'wall-ext' ? 'קיר המשך' : 'קבוע'

  // Fall back to gross (already resolved by rules) if panelInput doesn't carry
  // the raw field (e.g. brand-new model where no inputs are set yet).
  const [userW, setUserW]       = useState(panelInput.userW ?? panel.gross.w ?? 0)
  const [userH, setUserH]       = useState(panelInput.userH ?? panel.gross.h ?? 1900)
  const [hasStep, setHasStep]   = useState(!!panelInput.step)
  const [stepW, setStepW]       = useState(panelInput.step?.w ?? 0)
  const [stepH, setStepH]       = useState(panelInput.step?.h ?? 0)
  const [slopeF, setSlopeF]     = useState(panelInput.slopes?.F ?? 0)
  const [slopeC, setSlopeC]     = useState(panelInput.slopes?.C ?? 0)
  const [slopeD, setSlopeD]     = useState(panelInput.slopes?.D ?? 0)
  const [slopeE, setSlopeE]     = useState(panelInput.slopes?.E ?? 0)

  // Sync only when the panel itself changes (switching which panel to edit),
  // not on every parent re-render. Depending on `panelInput` object identity
  // would reset the inputs mid-edit because the parent recreates `{}` on each render.
  useEffect(() => {
    setUserW(panelInput.userW ?? panel.gross.w ?? 0)
    setUserH(panelInput.userH ?? panel.gross.h ?? 1900)
    setHasStep(!!panelInput.step)
    setStepW(panelInput.step?.w ?? 0)
    setStepH(panelInput.step?.h ?? 0)
    setSlopeF(panelInput.slopes?.F ?? 0)
    setSlopeC(panelInput.slopes?.C ?? 0)
    setSlopeD(panelInput.slopes?.D ?? 0)
    setSlopeE(panelInput.slopes?.E ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel.index])

  const handleSave = () => {
    onSave({
      userW: Number(userW) || 0,
      userH: Number(userH) || 0,
      step: hasStep && stepW > 0 && stepH > 0
        ? { w: Number(stepW), h: Number(stepH), side: panel.role === 'R' ? 'R' : 'L' }
        : null,
      slopes: {
        F: Number(slopeF) || 0,
        C: Number(slopeC) || 0,
        D: Number(slopeD) || 0,
        E: Number(slopeE) || 0,
      },
      // angleBefore is edited directly on the scene (seam bubbles), not here.
      // Preserve whatever was set previously.
      angleBefore: panelInput.angleBefore,
    })
    onClose()
  }

  // Live preview polygons
  const W = Number(userW) || 0
  const H = Number(userH) || 0
  const stepObj = hasStep && stepW > 0 && stepH > 0
    ? { w: Number(stepW), h: Number(stepH), side: panel.role === 'R' ? 'R' : 'L' }
    : null
  const slopesObj = {
    F: Number(slopeF) || 0, C: Number(slopeC) || 0,
    D: Number(slopeD) || 0, E: Number(slopeE) || 0,
  }
  const previewPts = panelPolygon(W, H, stepObj, slopesObj, panel.role)
  const nominalPts = nominalRect(W, H, panel.role)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
          <button onClick={onClose} className="text-sm text-ink-muted px-2">ביטול</button>
          <h3 className="text-sm font-bold text-ink">עריכת {kindHeb} #{panel.index + 1}</h3>
          <button onClick={handleSave} className="text-sm text-brand-600 font-bold px-2">שמור ✓</button>
        </div>

        {/* Live preview — same background as the main 3D scene */}
        <div className="py-3 px-4 border-b border-surface-200" style={{ background: SCENE_BG }}>
          <PanelPreview pts={previewPts} nominalPts={nominalPts} w={W} h={H} step={stepObj} />
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* Dimensions */}
          <Group color="dark" title="מידות">
            <div className="grid grid-cols-2 gap-2">
              <LabeledNumber label="רוחב (מ״מ)" value={userW} onChange={setUserW} />
              <LabeledNumber
                label={isDoor ? 'גובה (ירש מקבוע)' : 'גובה (מ״מ)'}
                value={userH}
                onChange={setUserH}
                disabled={isDoor}
              />
            </div>
            {isDoor && (
              <p className="text-[10px] text-ink-muted mt-1">גובה הדלת נקבע אוטומטית מהפנל הקבוע</p>
            )}
          </Group>

          {/* Step + slopes — only for fixed/wall-ext */}
          {!isDoor && (
            <>
              <Group color="gray" title="מדרגה / פינוי (בצד הקיר)">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={hasStep} onChange={e => setHasStep(e.target.checked)}
                         className="w-5 h-5 accent-ink" />
                  <span className="text-sm">יש מדרגה</span>
                </label>
                {hasStep && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <LabeledNumber label="עומק (מ״מ)" value={stepW} onChange={setStepW} />
                    <LabeledNumber label="גובה (מ״מ)" value={stepH} onChange={setStepH} />
                  </div>
                )}
              </Group>

              <Group color="orange" title="F — שיפוע קיר">
                <LabeledNumber label="מ״מ (+ החוצה, − פנימה)" value={slopeF} onChange={setSlopeF} />
              </Group>

              <Group color="blue" title="C — שיפוע רצפה">
                <LabeledNumber label="מ״מ (+ כלפי מטה)" value={slopeC} onChange={setSlopeC} />
              </Group>

              {hasStep && (
                <>
                  <Group color="green" title="D — שיפוע מדרגה אנכי">
                    <LabeledNumber label="מ״מ (+ פנימה למדרגה)" value={slopeD} onChange={setSlopeD} />
                  </Group>
                  <Group color="purple" title="E — שיפוע מדרגה אופקי">
                    <LabeledNumber label="מ״מ (+ מעמיק את המדרגה)" value={slopeE} onChange={setSlopeE} />
                  </Group>
                </>
              )}
            </>
          )}

          {/* Computed preview */}
          <div className="bg-surface-50 rounded-lg p-3">
            <div className="flex justify-between text-xs py-1">
              <span className="text-ink-muted">ברוטו (שרואים):</span>
              <b className="font-mono text-ink">{panel.gross.w} × {panel.gross.h} מ״מ</b>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-ink-muted">נטו (ייצור):</span>
              <b className="font-mono text-green-700">{panel.net.w} × {panel.net.h} מ״מ</b>
            </div>
            {panel.warnings?.map((w, i) => (
              <p key={i} className={`text-[11px] mt-1 ${w.level === 'red' ? 'text-red-600' : 'text-amber-600'}`}>
                {w.text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Preview SVG — shows the polygon shape live, with a dashed
// reference rect at the nominal W×H so the user can see deviations.
function PanelPreview({ pts, nominalPts, w, h, step }) {
  if (!pts || pts.length < 3 || w <= 0 || h <= 0) {
    return <div className="h-32 flex items-center justify-center text-ink-muted text-xs">—</div>
  }
  // Compute bounds from ALL points (solid + nominal) so the dashed ref fits too
  const all = [...pts, ...(nominalPts || [])]
  const xs = all.map(p => p[0]), ys = all.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const boundW = maxX - minX, boundH = maxY - minY

  const pad = 16
  const svgW = 260, svgH = 180
  const scale = Math.min((svgW - 2 * pad) / boundW, (svgH - 2 * pad) / boundH)
  const ox = (svgW - boundW * scale) / 2
  const oy = (svgH - boundH * scale) / 2
  // Local (origin-center, Y up) → SVG (origin-top-left, Y down)
  const toSvg = ([x, y]) => [
    ox + (x - minX) * scale,
    oy + (maxY - y) * scale,
  ]
  const path = (points) => 'M ' + points.map(p => toSvg(p).join(',')).join(' L ') + ' Z'

  return (
    <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto">
      {/* Actual shape (with slopes + step) drawn FIRST — */}
      <path d={path(pts)} fill="rgba(199,221,233,0.35)" stroke="#0f172a" strokeWidth="1.5" />
      {/* Dashed nominal rect drawn ON TOP so it's always visible */}
      {nominalPts && nominalPts.length >= 3 && (
        <path d={path(nominalPts)} fill="none" stroke="#475569" strokeWidth="1.3"
              strokeDasharray="5 3" />
      )}
      <text x={svgW / 2} y={svgH - 4} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#64748b">
        {w} × {h} מ״מ (מידה מקורית){step ? ` · מדרגה ${step.w}×${step.h}` : ''}
      </text>
    </svg>
  )
}

// ── Small layout helpers ───────────────────────────────────────
function Group({ color = 'gray', title, children }) {
  const borderColor = {
    gray:   '#94a3b8',
    dark:   '#0f172a',
    orange: '#f97316',
    blue:   '#3b82f6',
    green:  '#22c55e',
    purple: '#a855f7',
  }[color] || '#94a3b8'
  return (
    <div className="bg-white rounded-lg p-3" style={{ borderInline: `3px solid ${borderColor}`, border: '1px solid #f1f5f9' }}>
      <div className="text-[11px] font-bold text-ink-muted mb-2">{title}</div>
      {children}
    </div>
  )
}

function LabeledNumber({ label, value, onChange, disabled }) {
  // type="text" + inputMode="numeric" behaves consistently across RTL pages;
  // type="number" sometimes mis-renders or loses the value in Hebrew contexts.
  const safe = value === undefined || value === null ? '' : String(value)
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold text-ink-muted mb-1">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={safe}
        disabled={disabled}
        onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        style={{ color: disabled ? '#64748b' : '#0f172a', caretColor: '#0f172a' }}
        className="w-full border-2 border-ink focus:border-brand-500 rounded-lg px-2 py-2 text-center font-mono font-bold text-base outline-none bg-white disabled:bg-surface-100 disabled:border-surface-300"
      />
    </label>
  )
}
