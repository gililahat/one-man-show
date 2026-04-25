// src/utils/sirtoot/rules.js
// "מוח מקלחון" — shower reduction rules. Given model + user inputs,
// produces gross (what's seen) and net (what's cut) for each panel.

export const RULES = {
  DOOR_VS_FIXED_H: 15,   // door is 15mm shorter than the reference fixed
  HINGE_REDUCTION: 10,   // 10mm off door width for the hinge
  MAGNET_REDUCTION: 12.5, // 12.5mm off for each magnet seam (both sides)
  SINGLE_DOOR_W: 20,     // standalone door: -20mm width
  SINGLE_DOOR_H: 25,     // standalone door: -25mm height
}

// Find a nearby non-door panel to take the reference height from.
function referenceHeight(panels, i) {
  for (let offset = 1; offset < panels.length; offset++) {
    const left  = panels[i - offset]
    const right = panels[i + offset]
    const cand  = (left  && left.kind  !== 'door') ? left
                : (right && right.kind !== 'door') ? right
                : null
    if (cand) return cand._grossH || cand._userH
  }
  return null
}

/**
 * @param {object} state
 *   model: catalog entry
 *   thickness: 6 | 8 | 10
 *   opening: { height } in mm
 *   panelInputs: [{ userW, userH, step, slopes, angleBefore }] — per panel user edits
 * @returns array of computed panels with gross/net, deductions, warnings.
 */
export function computeShower(state) {
  const src = state.model.panels
  const inputs = state.panelInputs || src.map(() => ({}))

  const panels = src.map((p, i) => ({
    ...p,
    _userW: Number(inputs[i]?.userW != null ? inputs[i].userW : (p.defaultW || 0)),
    _userH: Number(inputs[i]?.userH != null ? inputs[i].userH : (state.opening?.height ?? 1900)),
    _step:   inputs[i]?.step   || null,
    _slopes: inputs[i]?.slopes || { F: 0, C: 0, D: 0, E: 0 },
    _angleBefore: i === 0 ? null : Number(inputs[i]?.angleBefore || 180),
  }))

  // Gross: fixed/wall-ext use user values directly; door height inherits from neighbor.
  panels.forEach(p => {
    if (p.kind !== 'door') { p._grossW = p._userW; p._grossH = p._userH }
  })
  panels.forEach((p, i) => {
    if (p.kind === 'door') {
      const ref = referenceHeight(panels, i)
      p._grossH = ref != null ? ref : p._userH
      p._grossW = p._userW
    }
  })

  // Net: apply reductions.
  return panels.map((p, i) => {
    const deductions = []
    const warnings   = []
    let nW = p._grossW, nH = p._grossH

    if (p.kind === 'door') {
      if (p.singleDoor) {
        nW = p._grossW - RULES.SINGLE_DOOR_W
        nH = p._grossH - RULES.SINGLE_DOOR_H
        deductions.push({ axis: 'w', by: RULES.SINGLE_DOOR_W, reason: 'דלת בודדת' })
        deductions.push({ axis: 'h', by: RULES.SINGLE_DOOR_H, reason: 'דלת בודדת' })
        warnings.push({ level: 'red', text: '⚠️ דלת בודדת — -2ס״מ רוחב, -2.5ס״מ גובה' })
      } else {
        nH = p._grossH - RULES.DOOR_VS_FIXED_H
        deductions.push({ axis: 'h', by: RULES.DOOR_VS_FIXED_H, reason: 'דלת נמוכה מקבוע' })
        nW -= RULES.HINGE_REDUCTION
        deductions.push({ axis: 'w', by: RULES.HINGE_REDUCTION, reason: 'ציר' })
        if (p.sealLeft  === 'magnet') { nW -= RULES.MAGNET_REDUCTION; deductions.push({ axis: 'w', by: RULES.MAGNET_REDUCTION, reason: 'מגנט שמאל' }) }
        if (p.sealRight === 'magnet') { nW -= RULES.MAGNET_REDUCTION; deductions.push({ axis: 'w', by: RULES.MAGNET_REDUCTION, reason: 'מגנט ימין' }) }
      }
    } else {
      nH = p._grossH
      if (p.sealLeft  === 'magnet') { nW -= RULES.MAGNET_REDUCTION; deductions.push({ axis: 'w', by: RULES.MAGNET_REDUCTION, reason: 'מגנט לדלת שמאל' }) }
      if (p.sealRight === 'magnet') { nW -= RULES.MAGNET_REDUCTION; deductions.push({ axis: 'w', by: RULES.MAGNET_REDUCTION, reason: 'מגנט לדלת ימין' }) }
    }

    if (p._step && p._step.w > 0 && p._step.h > 0) {
      warnings.push({ level: 'info', text: 'מדרגה — נדרשות 3 זוויות קיר-זכוכית' })
    }

    return {
      index: i, kind: p.kind, role: p.role, hingeSide: p.hingeSide || null,
      sealLeft: p.sealLeft, sealRight: p.sealRight,
      gross: { w: Math.round(p._grossW * 10) / 10, h: Math.round(p._grossH * 10) / 10 },
      net:   { w: Math.round(nW * 10) / 10,        h: Math.round(nH * 10) / 10 },
      step: p._step, slopes: p._slopes,
      angleBefore: p._angleBefore,
      deductions, warnings,
    }
  })
}
