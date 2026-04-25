// src/utils/sirtoot/geometry.js
// Shared polygon helpers used by both the 3D scene (extrude) and the production SVG.

// Panel polygon in local mesh coords (origin at center, +X right, +Y up).
// Slopes (F, C) and step cut are always on the wall side, determined by `role`:
// 'R' = wall on right; anything else = wall on left. Never on the seam side.
//
// Slope semantics (all in mm, positive = outward from nominal rectangle):
//   F — wall slope, shifts top-left X outward
//   C — floor slope, shifts bottom-left Y downward (no step) OR the outer step corner
//   D — step vertical slope, shifts the step's inner top X inward
//   E — step horizontal slope, shifts the outer step corner Y downward
export function panelPolygon(w, h, step, slopes, role) {
  const F = slopes?.F || 0
  const C = slopes?.C || 0
  const D = slopes?.D || 0
  const E = slopes?.E || 0
  const hasStep = step && step.w > 0 && step.h > 0
  const Sw = hasStep ? step.w : 0
  const Sh = hasStep ? step.h : 0

  // Build assuming wall on LEFT; then mirror for role='R'.
  const TL = [-w/2 - F, +h/2]
  const TR = [+w/2, +h/2]
  const BR = [+w/2, -h/2]
  const BL = [-w/2, -h/2 - C]

  const corners = hasStep
    ? [TL, TR, BR,
       [-w/2 + Sw, -h/2],                  // step corner (bottom)
       [-w/2 + Sw - D, -h/2 + Sh],          // step inner top (D inward)
       [-w/2, -h/2 + Sh - E]]               // step outer (E outward/down)
    : [TL, TR, BR, BL]

  return role === 'R' ? corners.map(([x, y]) => [-x, y]).reverse() : corners
}

// Nominal rectangle corners (ignoring slopes + step) — for "reference line" display.
export function nominalRect(w, h, role) {
  const pts = [
    [-w/2, +h/2], [+w/2, +h/2], [+w/2, -h/2], [-w/2, -h/2],
  ]
  return role === 'R' ? pts.map(([x, y]) => [-x, y]).reverse() : pts
}

// Chain layout: given computed panels, returns an array of
// { startX, startZ, endX, endZ, heading, centerX, centerZ, baseRotY } per panel.
// `widthKey` picks which measurement drives the chain (gross or net).
export function layoutChain(panels, widthKey = 'gross') {
  const widths = panels.map(p => p[widthKey].w)
  const totalW = widths.reduce((s, w) => s + w, 0)

  let cursorX = totalW / 2, cursorZ = 0
  let heading = 180  // start going -X (leftward in world)
  const out = []

  panels.forEach((p, i) => {
    const w = p[widthKey].w
    if (i > 0) heading -= (180 - (p.angleBefore || 180))
    const rad = heading * Math.PI / 180
    const dx = Math.cos(rad) * w
    const dz = -Math.sin(rad) * w
    const startX = cursorX, startZ = cursorZ
    const endX   = cursorX + dx, endZ = cursorZ + dz
    out.push({
      startX, startZ, endX, endZ,
      centerX: (startX + endX) / 2,
      centerZ: (startZ + endZ) / 2,
      heading,
      baseRotY: (heading - 180) * Math.PI / 180,
      w, h: p[widthKey].h,
    })
    cursorX = endX; cursorZ = endZ
  })

  return out
}
