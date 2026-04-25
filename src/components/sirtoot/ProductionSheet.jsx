// src/components/sirtoot/ProductionSheet.jsx
// Flat panel-by-panel view for the glass manufacturer. No corner angles —
// each panel shown with its net dimensions, cuts (step/slopes), and hole
// positions. Download button emits a single combined SVG file.
import { panelPolygon, nominalRect } from '@/utils/sirtoot/geometry'

export default function ProductionSheet({
  panels,          // computed panels from rules.js
  modelLabel,      // e.g. "קבוע + כנף שמאל"
  thickness,       // mm
  onClose,         // () => void
}) {
  if (!panels || !panels.length) return null

  const handleDownload = () => downloadCombinedSVG(panels, modelLabel, thickness)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-5xl max-h-[92dvh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
          <button onClick={onClose} className="text-sm text-ink-muted px-2">סגור</button>
          <h3 className="text-sm font-bold text-ink">קובץ לייצור</h3>
          <button onClick={handleDownload} className="text-sm text-brand-600 font-bold px-2">
            📥 הורד SVG
          </button>
        </div>

        {/* Sub-header */}
        <div className="px-4 py-2 text-center text-xs text-ink-muted border-b border-surface-200">
          {modelLabel} · זכוכית {thickness} מ״מ · {panels.length} פנלים · מידות נטו
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-wrap gap-4 justify-center">
          {panels.map((p, i) => (
            <PanelCard key={i} panel={p} index={i} allPanels={panels} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Single panel card ────────────────────────────────────────
function PanelCard({ panel, index, allPanels }) {
  return (
    <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 text-center min-w-[180px]">
      <div className="font-bold text-xs text-ink mb-1">#{index + 1} · {kindLabel(panel)}</div>
      <div className="text-[10px] text-ink-muted mb-2 min-h-[14px]">
        {productionNotes(panel)}
      </div>
      <PanelSvg panel={panel} allPanels={allPanels} />
    </div>
  )
}

function PanelSvg({ panel, allPanels }) {
  const layout = computePanelLayout(panel, allPanels)
  if (!layout) return <div className="text-ink-muted text-xs">—</div>
  const { svgW, svgH, pathD, nominalPathD, holes, openings, slopeLabels, dims } = layout
  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
         className="bg-white border border-surface-200 rounded-md mx-auto">
      {/* Actual shape (with slopes + step) — drawn first so the dashed line stays on top */}
      <path d={pathD} stroke="#0f172a" strokeWidth="1.5" fill="rgba(199,221,233,0.3)" />
      {/* Dashed reference rectangle — nominal W×H before slopes/step */}
      {nominalPathD && (
        <path d={nominalPathD} stroke="#475569" strokeWidth="1.2" fill="none"
              strokeDasharray="5 3" />
      )}
      {/* Hinge opening rectangles (40×65 mm for kz/zz, 27×40 for butterfly) */}
      {openings.map((o, i) => (
        <path key={'op' + i} d={o.pathD} fill="none" stroke={o.color || '#1e40af'} strokeWidth="1" />
      ))}
      {/* Holes — drilled on top of rectangles or standalone (handle) */}
      {holes.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r={h.r} fill="none" stroke={h.color || '#1e40af'} strokeWidth="1" />
      ))}
      {/* Slope letter tags (F=, C=, D=, E=) */}
      {slopeLabels.map((l, i) => (
        <text key={'sl' + i} x={l.x} y={l.y} textAnchor="middle" fontSize="9"
              fontFamily="monospace" fontWeight="700" fill={l.color}>
          {l.text}
        </text>
      ))}
      {/* Engineering-style dimension lines (extensions + arrows + label) */}
      {dims.map((d, i) => <Dimension key={'d' + i} d={d} />)}
    </svg>
  )
}

// Single dimension descriptor renderer (horizontal or vertical).
function Dimension({ d }) {
  const { orient, a, b, off, label, color = '#0f172a' } = d
  // `a`, `b` are the two endpoints on the measured edge (panel-space → already-projected SVG coords).
  // `off` is the offset direction for the dim line (perpendicular to edge, in SVG pixels — positive = outward).
  if (orient === 'h') {
    const y = a.y + off  // dimension line Y (off > 0 below, < 0 above)
    const arrowSize = 4
    return (
      <g stroke={color} strokeWidth="0.6" fill="none">
        {/* Extension lines */}
        <line x1={a.x} y1={a.y + Math.sign(off) * 2} x2={a.x} y2={y + Math.sign(off) * 2} />
        <line x1={b.x} y1={b.y + Math.sign(off) * 2} x2={b.x} y2={y + Math.sign(off) * 2} />
        {/* Dim line */}
        <line x1={a.x} y1={y} x2={b.x} y2={y} />
        {/* Arrows */}
        <path fill={color} stroke="none"
              d={`M ${a.x} ${y} l ${arrowSize} ${-arrowSize/2} l 0 ${arrowSize} Z`} />
        <path fill={color} stroke="none"
              d={`M ${b.x} ${y} l ${-arrowSize} ${-arrowSize/2} l 0 ${arrowSize} Z`} />
        {/* Label */}
        <text x={(a.x + b.x) / 2} y={y + (off > 0 ? 11 : -3)} textAnchor="middle"
              fontSize="10" fontFamily="monospace" fontWeight="700" fill={color} stroke="none">
          {label}
        </text>
      </g>
    )
  }
  // vertical
  const x = a.x + off
  const arrowSize = 4
  return (
    <g stroke={color} strokeWidth="0.6" fill="none">
      <line x1={a.x + Math.sign(off) * 2} y1={a.y} x2={x + Math.sign(off) * 2} y2={a.y} />
      <line x1={b.x + Math.sign(off) * 2} y1={b.y} x2={x + Math.sign(off) * 2} y2={b.y} />
      <line x1={x} y1={a.y} x2={x} y2={b.y} />
      <path fill={color} stroke="none"
            d={`M ${x} ${a.y} l ${-arrowSize/2} ${arrowSize} l ${arrowSize} 0 Z`} />
      <path fill={color} stroke="none"
            d={`M ${x} ${b.y} l ${-arrowSize/2} ${-arrowSize} l ${arrowSize} 0 Z`} />
      <text x={x + (off > 0 ? 11 : -3)} y={(a.y + b.y) / 2} textAnchor="middle"
            fontSize="10" fontFamily="monospace" fontWeight="700" fill={color} stroke="none"
            transform={`rotate(-90 ${x + (off > 0 ? 11 : -3)} ${(a.y + b.y) / 2})`}>
        {label}
      </text>
    </g>
  )
}

// Determine hinge type for a given panel.
// - If door has NO adjacent panel on its hinge side → wall mount = ק/ז
// - Otherwise (adjacent glass panel, typically wall-ext) → ז/ז
// - Fixed/wall-ext panels with `hinge-holes` always act as the mounting side (ז/ז).
function inferHingeType(panel, allPanels) {
  if (!allPanels) return 'kz'
  if (panel.kind === 'door' && panel.hingeSide) {
    const n = allPanels.length
    const idx = panel.index
    if (panel.hingeSide === 'R') return idx > 0 ? 'zz' : 'kz'
    return idx < n - 1 ? 'zz' : 'kz'
  }
  // wall-ext/fixed with hinge-holes seal — they ARE the ז/ז mounting glass
  return 'zz'
}

// ── Layout math (shared for display + download) ─────────────
function computePanelLayout(panel, allPanels) {
  const W = panel.net.w, H = panel.net.h
  if (W <= 0 || H <= 0) return null

  const scale = Math.min(260 / W, 320 / H)
  const vw = W * scale, vh = H * scale
  // Enlarged padding to fit external engineering-style dimension lines
  const pad = 58
  const svgW = vw + 2 * pad, svgH = vh + 2 * pad
  const ox = pad, oy = pad

  const toSvg = ([x, y]) => [ox + (x + W / 2) * scale, oy + (H / 2 - y) * scale]
  const pts = panelPolygon(W, H, panel.step, panel.slopes, panel.role).map(toSvg)
  const pathD = 'M ' + pts.map(p => p.join(',')).join(' L ') + ' Z'

  // Dashed nominal rectangle (pre-slope, pre-step)
  const nomPts = nominalRect(W, H, panel.role).map(toSvg)
  const nominalPathD = 'M ' + nomPts.map(p => p.join(',')).join(' L ') + ' Z'

  // Hinge openings — per spec sheet. Dimensions and bottom-position differ by
  // hinge type (ק/ז wall mount vs ז/ז glass-to-glass with wiper compensation).
  const holes = []
  const openings = []
  const hingeType = inferHingeType(panel, allPanels)  // 'kz' | 'zz'
  const HINGE_COLOR = hingeType === 'zz' ? '#1e3a5f' : '#1e40af'
  const addHingeOpening = (edgeX, inward) => {
    const DEPTH = 40, HEIGHT = 65, HOLE_R = 8
    const topFromEnd = 200
    // ז/ז gets +15mm at the bottom to clear the door's bottom wiper gap.
    const bottomFromEnd = hingeType === 'zz' ? 215 : 200
    const centers = [ +H/2 - topFromEnd, -H/2 + bottomFromEnd ]
    for (const centerY of centers) {
      const c1 = toSvg([edgeX,                  centerY + HEIGHT/2])
      const c2 = toSvg([edgeX + inward * DEPTH, centerY + HEIGHT/2])
      const c3 = toSvg([edgeX + inward * DEPTH, centerY - HEIGHT/2])
      const c4 = toSvg([edgeX,                  centerY - HEIGHT/2])
      openings.push({
        pathD: `M ${c1.join(',')} L ${c2.join(',')} L ${c3.join(',')} L ${c4.join(',')} Z`,
        color: HINGE_COLOR,
      })
      const rPx = HOLE_R * scale
      holes.push({ x: c2[0], y: c2[1], r: rPx, color: HINGE_COLOR })
      holes.push({ x: c3[0], y: c3[1], r: rPx, color: HINGE_COLOR })
    }
  }
  if (panel.kind === 'door' && panel.hingeSide) {
    addHingeOpening(panel.hingeSide === 'R' ? W/2 : -W/2,
                    panel.hingeSide === 'R' ? -1 : +1)
  }
  if (panel.sealLeft  === 'hinge-holes') addHingeOpening(-W/2, +1)
  if (panel.sealRight === 'hinge-holes') addHingeOpening(+W/2, -1)

  // Button handle (Ø12, 50mm from open edge, 1000mm from glass bottom) — doors only
  if (panel.kind === 'door' && panel.hingeSide) {
    const HANDLE_INSET = 50, HEIGHT_FROM_FLOOR = 1000, HANDLE_R = 6
    const openEdgeX = panel.hingeSide === 'R' ? -W/2 : +W/2
    const inward = panel.hingeSide === 'R' ? +1 : -1
    const handlePt = toSvg([openEdgeX + inward * HANDLE_INSET, -H/2 + HEIGHT_FROM_FLOOR])
    holes.push({ x: handlePt[0], y: handlePt[1], r: HANDLE_R * scale, color: '#16a34a' })
  }

  // Wall-glass corner brackets (זוויות תפיסה) — fixed + wall-ext panels.
  // Spec: 1 hole Ø16 per bracket, 19mm from wall edge, 200mm from glass top/bottom.
  // 2 brackets standard; +1 above the step if the panel has a step.
  if (panel.kind !== 'door') {
    const HORIZ = 19, VERT = 200, BRACKET_R = 8
    const wallEdgeX = panel.role === 'R' ? +W/2 : -W/2
    const inward    = panel.role === 'R' ? -1 : +1
    const xLocal    = wallEdgeX + inward * HORIZ
    const positions = [+H/2 - VERT, -H/2 + VERT]
    if (panel.step && panel.step.w > 0 && panel.step.h > 0) {
      positions.push(-H/2 + panel.step.h + VERT)
    }
    for (const yLocal of positions) {
      const p = toSvg([xLocal, yLocal])
      holes.push({ x: p[0], y: p[1], r: BRACKET_R * scale, color: '#dc2626' })
    }
  }

  // Engineering-style dimension lines (external) — bottom + right always,
  // top + left if the respective slope is nonzero; step gets its own dims too.
  const dims = []
  const isR = panel.role === 'R'
  const fmt = (n) => Math.round(n * 10) / 10
  const pt  = ([lx, ly]) => { const [x, y] = toSvg([lx, ly]); return { x, y } }
  const topLeft     = pt([-W/2, +H/2])
  const topRight    = pt([+W/2, +H/2])
  const bottomLeft  = pt([-W/2, -H/2])
  const bottomRight = pt([+W/2, -H/2])
  // Bottom — always W
  dims.push({ orient: 'h', a: bottomLeft, b: bottomRight, off: 22, label: `${W} מ״מ` })
  // Right — always H
  dims.push({ orient: 'v', a: topRight, b: bottomRight, off: 22, label: `${H} מ״מ` })
  // Top — if F makes top edge different
  if (panel.slopes?.F) {
    const topActualW = fmt(W + Number(panel.slopes.F))
    const tL = pt([-W/2 - Number(panel.slopes.F), +H/2])
    dims.push({ orient: 'h', a: tL, b: topRight, off: -22, label: `${topActualW} מ״מ`, color: '#f97316' })
  }
  // Left — if C makes left edge different (no step)
  if (panel.slopes?.C && !(panel.step && panel.step.w > 0)) {
    const leftActualH = fmt(H + Number(panel.slopes.C))
    const bL = pt([-W/2, -H/2 - Number(panel.slopes.C)])
    dims.push({ orient: 'v', a: topLeft, b: bL, off: -22, label: `${leftActualH} מ״מ`, color: '#3b82f6' })
  }
  // Step dimensions — Sw (horizontal, inside step cut) + Sh (vertical, inside step cut)
  if (panel.step && panel.step.w > 0 && panel.step.h > 0) {
    const Sw = panel.step.w, Sh = panel.step.h
    const sCorner = pt([isR ? (W/2 - Sw) : (-W/2 + Sw), -H/2 + Sh])
    const sBottom = pt([isR ? (W/2 - Sw) : (-W/2 + Sw), -H/2])
    const sOuter  = pt([isR ? (W/2)       : (-W/2),       -H/2 + Sh])
    // Step width (horizontal, drawn above the cut area — inside the panel)
    dims.push({ orient: 'h', a: sCorner, b: sOuter, off: -14, label: `${Sw} מ״מ`, color: '#16a34a' })
    // Step height (vertical, drawn to the wall-side — inside the panel)
    dims.push({ orient: 'v', a: sCorner, b: sBottom, off: isR ? 14 : -14, label: `${Sh} מ״מ`, color: '#16a34a' })
  }

  // Small "letter tags" (F, C, D, E) — short identifiers next to the dim lines
  // so the reader can cross-reference which slope each engraved edge relates to.
  const slopeLabels = []
  const sl = panel.slopes || {}
  if (sl.F) {
    const p = toSvg([isR ? (-W/2 + 6) : (W/2 - 6), H/2 - 10])
    slopeLabels.push({ x: p[0], y: p[1], text: `F=${sl.F}`, color: '#f97316' })
  }
  if (sl.C && !(panel.step && panel.step.w > 0)) {
    const p = toSvg([isR ? (W/2 - 6) : (-W/2 + 6), -H/2 + 10])
    slopeLabels.push({ x: p[0], y: p[1], text: `C=${sl.C}`, color: '#3b82f6' })
  }
  if (sl.D && panel.step) {
    const p = toSvg([isR ? (W/2 - panel.step.w + 8) : (-W/2 + panel.step.w - 8),
                     -H/2 + panel.step.h + 6])
    slopeLabels.push({ x: p[0], y: p[1], text: `D=${sl.D}`, color: '#22c55e' })
  }
  if (sl.E && panel.step) {
    const p = toSvg([isR ? (W/2 - 8) : (-W/2 + 8),
                     -H/2 + panel.step.h - 6])
    slopeLabels.push({ x: p[0], y: p[1], text: `E=${sl.E}`, color: '#a855f7' })
  }

  return { svgW, svgH, pathD, nominalPathD, holes, openings, slopeLabels, dims }
}

// Serialize a dimension descriptor to SVG string (for the downloadable file)
function dimToSvg(d) {
  const { orient, a, b, off, label, color = '#0f172a' } = d
  const arrow = 4
  if (orient === 'h') {
    const y = a.y + off
    const ext1 = `<line x1="${a.x}" y1="${a.y + Math.sign(off) * 2}" x2="${a.x}" y2="${y + Math.sign(off) * 2}" stroke="${color}" stroke-width="0.6"/>`
    const ext2 = `<line x1="${b.x}" y1="${b.y + Math.sign(off) * 2}" x2="${b.x}" y2="${y + Math.sign(off) * 2}" stroke="${color}" stroke-width="0.6"/>`
    const line = `<line x1="${a.x}" y1="${y}" x2="${b.x}" y2="${y}" stroke="${color}" stroke-width="0.6"/>`
    const ar1  = `<path fill="${color}" d="M ${a.x} ${y} l ${arrow} ${-arrow/2} l 0 ${arrow} Z"/>`
    const ar2  = `<path fill="${color}" d="M ${b.x} ${y} l ${-arrow} ${-arrow/2} l 0 ${arrow} Z"/>`
    const tx   = `<text x="${(a.x + b.x) / 2}" y="${y + (off > 0 ? 11 : -3)}" text-anchor="middle" font-size="10" font-family="monospace" font-weight="700" fill="${color}">${label}</text>`
    return ext1 + ext2 + line + ar1 + ar2 + tx
  }
  const x = a.x + off
  const ext1 = `<line x1="${a.x + Math.sign(off) * 2}" y1="${a.y}" x2="${x + Math.sign(off) * 2}" y2="${a.y}" stroke="${color}" stroke-width="0.6"/>`
  const ext2 = `<line x1="${b.x + Math.sign(off) * 2}" y1="${b.y}" x2="${x + Math.sign(off) * 2}" y2="${b.y}" stroke="${color}" stroke-width="0.6"/>`
  const line = `<line x1="${x}" y1="${a.y}" x2="${x}" y2="${b.y}" stroke="${color}" stroke-width="0.6"/>`
  const ar1  = `<path fill="${color}" d="M ${x} ${a.y} l ${-arrow/2} ${arrow} l ${arrow} 0 Z"/>`
  const ar2  = `<path fill="${color}" d="M ${x} ${b.y} l ${-arrow/2} ${-arrow} l ${arrow} 0 Z"/>`
  const tx = `<text x="${x + (off > 0 ? 11 : -3)}" y="${(a.y + b.y) / 2}" text-anchor="middle" font-size="10" font-family="monospace" font-weight="700" fill="${color}" transform="rotate(-90 ${x + (off > 0 ? 11 : -3)} ${(a.y + b.y) / 2})">${label}</text>`
  return ext1 + ext2 + line + ar1 + ar2 + tx
}

function kindLabel(p) {
  if (p.kind === 'door')     return 'דלת' + (p.hingeSide ? ` (ציר ${p.hingeSide === 'R' ? 'ימין' : 'שמאל'})` : '')
  if (p.kind === 'wall-ext') return 'קיר המשך'
  return 'קבוע'
}

function productionNotes(p) {
  const notes = []
  if (p.step) notes.push(`מדרגה ${p.step.w}×${p.step.h}`)
  if (p.slopes) {
    const s = []
    if (p.slopes.F) s.push('F=' + p.slopes.F)
    if (p.slopes.C) s.push('C=' + p.slopes.C)
    if (s.length) notes.push('שיפוע ' + s.join(' '))
  }
  if (p.sealLeft === 'magnet' || p.sealRight === 'magnet') notes.push('מגנט')
  if (p.sealLeft === 'hinge-holes' || p.sealRight === 'hinge-holes') notes.push('חורי ציר')
  return notes.length ? notes.join(' · ') : 'ללא חיתוכים'
}

// ── Download one combined SVG for all panels ──────────────────
function downloadCombinedSVG(panels, modelLabel, thickness) {
  let xOffset = 20, maxH = 0
  const groups = []

  panels.forEach((p, i) => {
    const lay = computePanelLayout(p, panels)
    if (!lay) return
    const { svgW, svgH, pathD, nominalPathD, holes, openings, slopeLabels, dims } = lay

    const openingsXml = openings.map(o =>
      `<path d="${o.pathD}" fill="none" stroke="${o.color || '#1e40af'}" stroke-width="1"/>`,
    ).join('')
    const holesXml = holes.map(h =>
      `<circle cx="${h.x}" cy="${h.y}" r="${h.r}" fill="none" stroke="${h.color || '#1e40af'}" stroke-width="1"/>`,
    ).join('')
    const slopeXml = slopeLabels.map(l =>
      `<text x="${l.x}" y="${l.y}" text-anchor="middle" font-size="9" font-family="monospace" font-weight="700" fill="${l.color}">${l.text}</text>`,
    ).join('')
    const dimsXml = dims.map(d => dimToSvg(d)).join('')

    const title = `#${i+1} ${kindLabel(p)}`
    const inner =
      `<path d="${pathD}" stroke="#0f172a" stroke-width="1.5" fill="rgba(199,221,233,0.3)"/>` +
      (nominalPathD ? `<path d="${nominalPathD}" stroke="#475569" stroke-width="1.2" fill="none" stroke-dasharray="5 3"/>` : '') +
      openingsXml + holesXml + slopeXml + dimsXml

    groups.push(
      `<g transform="translate(${xOffset},40)">` +
      `<text x="${svgW/2}" y="-16" text-anchor="middle" font-size="13" font-weight="700" font-family="sans-serif">${title}</text>` +
      inner +
      `</g>`,
    )
    xOffset += svgW + 30
    if (svgH > maxH) maxH = svgH
  })

  const totalW = xOffset + 20
  const totalH = maxH + 80
  const header = `<text x="${totalW/2}" y="20" text-anchor="middle" font-size="16" font-weight="800" font-family="sans-serif">${modelLabel} · זכוכית ${thickness} מ״מ · מידות נטו</text>`
  const full =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">` +
    header + groups.join('') + `</svg>`

  const blob = new Blob([full], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sirtoot-${modelLabel.replace(/\s+/g, '-')}-לייצור.svg`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
