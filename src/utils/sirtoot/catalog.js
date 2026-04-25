// src/utils/sirtoot/catalog.js
// Shower-model catalog. Each model is a chain of panels (right → left in RTL).
// `role` = which end the wall is on; 'C' = center (no wall on either side).
// `calculatorType` maps to the pricing engine's shower-type key.

export const SIRTOOT_CATALOG = [
  { id: 'fixed-r', label: 'קבוע ימין', calculatorType: '1fixed0door',
    panels: [{ kind: 'fixed', role: 'R', defaultW: 750, sealLeft: null, sealRight: null }] },

  { id: 'fixed-l', label: 'קבוע שמאל', calculatorType: '1fixed0door',
    panels: [{ kind: 'fixed', role: 'L', defaultW: 750, sealLeft: null, sealRight: null }] },

  { id: 'door-r', label: 'דלת ימין', calculatorType: '0fixed1door',
    panels: [{ kind: 'door', role: 'R', hingeSide: 'R', defaultW: 700, sealLeft: null, sealRight: null, singleDoor: true }] },

  { id: 'door-l', label: 'דלת שמאל', calculatorType: '0fixed1door',
    panels: [{ kind: 'door', role: 'L', hingeSide: 'L', defaultW: 700, sealLeft: null, sealRight: null, singleDoor: true }] },

  { id: 'door-r-door-l', label: 'זוג דלתות (ימין + שמאל)', calculatorType: '0fixed2doors',
    panels: [
      { kind: 'door', role: 'R', hingeSide: 'R', defaultW: 500, sealLeft: 'magnet', sealRight: null },
      { kind: 'door', role: 'L', hingeSide: 'L', defaultW: 500, sealLeft: null, sealRight: 'magnet' },
    ] },

  { id: 'fixed-r-door-l', label: 'קבוע + כנף שמאל', calculatorType: '1fixed1door',
    panels: [
      { kind: 'fixed', role: 'R', defaultW: 450, sealLeft: 'magnet', sealRight: null },
      { kind: 'door',  role: 'L', hingeSide: 'L', defaultW: 700, sealLeft: null, sealRight: 'magnet' },
    ] },

  { id: 'door-r-fixed-l', label: 'כנף ימין + קבוע', calculatorType: '1fixed1door',
    panels: [
      { kind: 'door',  role: 'R', hingeSide: 'R', defaultW: 700, sealLeft: 'magnet', sealRight: null },
      { kind: 'fixed', role: 'L', defaultW: 450, sealLeft: null, sealRight: 'magnet' },
    ] },

  { id: 'wall-door-fixed', label: 'קיר המשך + דלת + קבוע', calculatorType: '2fixed1door',
    panels: [
      { kind: 'wall-ext', role: 'R', defaultW: 450, sealLeft: 'hinge-holes', sealRight: null },
      { kind: 'door',     role: 'C', hingeSide: 'R', defaultW: 700, sealLeft: 'magnet', sealRight: 'hinge-holes' },
      { kind: 'fixed',    role: 'L', defaultW: 450, sealLeft: null, sealRight: 'magnet' },
    ] },

  { id: 'fixed-door-wall', label: 'קבוע + דלת + קיר המשך', calculatorType: '2fixed1door',
    panels: [
      { kind: 'fixed',    role: 'R', defaultW: 450, sealLeft: 'magnet', sealRight: null },
      { kind: 'door',     role: 'C', hingeSide: 'L', defaultW: 700, sealLeft: 'hinge-holes', sealRight: 'magnet' },
      { kind: 'wall-ext', role: 'L', defaultW: 450, sealLeft: null, sealRight: 'hinge-holes' },
    ] },

  { id: 'wall-doors-wall', label: 'קיר + דלת + דלת + קיר', calculatorType: '2fixed2doors',
    panels: [
      { kind: 'wall-ext', role: 'R', defaultW: 350, sealLeft: 'hinge-holes', sealRight: null },
      { kind: 'door',     role: 'C', hingeSide: 'R', defaultW: 500, sealLeft: 'magnet', sealRight: 'hinge-holes' },
      { kind: 'door',     role: 'C', hingeSide: 'L', defaultW: 500, sealLeft: 'hinge-holes', sealRight: 'magnet' },
      { kind: 'wall-ext', role: 'L', defaultW: 350, sealLeft: null, sealRight: 'hinge-holes' },
    ] },
]

export function findModel(id) {
  return SIRTOOT_CATALOG.find(m => m.id === id) || null
}
