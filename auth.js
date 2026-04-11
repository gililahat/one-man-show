// src/utils/calculatorEngine.js
// ─────────────────────────────────────────────────────────────
// Pure calculator logic for shower / glass installations.
// No React, no Firebase — just math. Easy to unit-test and port.
// ─────────────────────────────────────────────────────────────

// ─── Glass thickness pricing (₪ per m²) ──────────────────────
export const GLASS_TYPES = [
  { key: 'clear_6',    label: 'שקוף 6 מ"מ',           pricePerM2: 280 },
  { key: 'clear_8',    label: 'שקוף 8 מ"מ',           pricePerM2: 380 },
  { key: 'clear_10',   label: 'שקוף 10 מ"מ',          pricePerM2: 480 },
  { key: 'frosted_6',  label: 'מט 6 מ"מ',             pricePerM2: 320 },
  { key: 'frosted_8',  label: 'מט 8 מ"מ',             pricePerM2: 420 },
  { key: 'bronze_6',   label: 'ברונזה 6 מ"מ',         pricePerM2: 340 },
  { key: 'tempered_6', label: 'מחוסם 6 מ"מ',          pricePerM2: 360 },
  { key: 'tempered_8', label: 'מחוסם 8 מ"מ',          pricePerM2: 460 },
]

// ─── Profile / frame types ────────────────────────────────────
export const PROFILE_TYPES = [
  { key: 'frameless',       label: 'ללא מסגרת (Frameless)',  pricePerMeter: 85  },
  { key: 'semi_frameless',  label: 'חצי מסגרת',              pricePerMeter: 65  },
  { key: 'aluminum_silver', label: 'אלומיניום כסף',           pricePerMeter: 45  },
  { key: 'aluminum_black',  label: 'אלומיניום שחור',          pricePerMeter: 55  },
  { key: 'aluminum_chrome', label: 'אלומיניום כרום',          pricePerMeter: 60  },
]

// ─── Hardware sets ────────────────────────────────────────────
export const HARDWARE_SETS = [
  { key: 'basic',    label: 'סט בסיסי',    price: 180  },
  { key: 'standard', label: 'סט סטנדרט',   price: 350  },
  { key: 'premium',  label: 'סט פרמיום',   price: 650  },
  { key: 'luxury',   label: 'סט יוקרתי',   price: 1200 },
]

// ─── Opening types ────────────────────────────────────────────
export const OPENING_TYPES = [
  { key: 'fixed',    label: 'קבוע',        factor: 1.0  },
  { key: 'hinged',   label: 'צירים',       factor: 1.15 },
  { key: 'sliding',  label: 'הזזה',        factor: 1.10 },
  { key: 'pivot',    label: 'ציר מרכזי',   factor: 1.20 },
  { key: 'folding',  label: 'קיפול',       factor: 1.25 },
]

// ─── Panel calculation ────────────────────────────────────────
/**
 * Calculate a single glass panel
 * @param {object} panel - { width, height, glassType, openingType }
 * @returns {object} - { area, glassPrice, openingFactor, panelPrice }
 */
export function calcPanel(panel, customGlassTypes, customOpeningTypes) {
  const { width, height, glassType, openingType } = panel

  const w = Number(width)   || 0  // mm
  const h = Number(height)  || 0  // mm

  const area = (w / 1000) * (h / 1000)  // m²

  const glassTable   = customGlassTypes   || GLASS_TYPES
  const openingTable = customOpeningTypes || OPENING_TYPES

  const glass   = glassTable.find(g => g.key === glassType)     || glassTable[0]
  const opening = openingTable.find(o => o.key === openingType) || OPENING_TYPES[0]

  const glassPrice   = area * glass.pricePerM2
  const openingPrice = glassPrice * (opening.factor - 1)
  const panelPrice   = glassPrice + openingPrice

  return {
    area:          round2(area),
    glassPrice:    round2(glassPrice),
    openingFactor: opening.factor,
    panelPrice:    round2(panelPrice),
  }
}

// ─── Full shower quote calculation ───────────────────────────
/**
 * @param {object} input
 *   panels        — array of panel configs
 *   profileType   — key from PROFILE_TYPES
 *   hardwareSet   — key from HARDWARE_SETS
 *   installFee    — manual installation fee (₪)
 *   discountPct   — discount percentage
 *   vatPct        — VAT percentage (default 17)
 *   notes         — free text
 */
export function calcShowerQuote(input, pricing = {}) {
  const {
    panels       = [],
    profileType  = 'frameless',
    hardwareSet  = 'standard',
    installFee   = 0,
    discountPct  = 0,
    vatPct       = 17,
  } = input

  const glassTable   = pricing.glassTypes   || GLASS_TYPES
  const profileTable = pricing.profileTypes || PROFILE_TYPES
  const hardwareTable = pricing.hardwareSets || HARDWARE_SETS

  // Panels
  const panelResults = panels.map((p, i) => ({
    index: i + 1,
    label: p.label || `פנל ${i + 1}`,
    ...p,
    ...calcPanel(p, glassTable, pricing.openingTypes),
  }))

  const glassSubtotal = panelResults.reduce((s, p) => s + p.panelPrice, 0)
  const totalArea     = panelResults.reduce((s, p) => s + p.area, 0)

  // Perimeter for profile (simplified: sum of panel widths + heights)
  const perimeterMeters = panelResults.reduce((s, p) => {
    const w = (Number(p.width) || 0) / 1000
    const h = (Number(p.height) || 0) / 1000
    return s + (w * 2) + (h * 2)
  }, 0)

  const profile    = profileTable.find(pr => pr.key === profileType) || profileTable[0]
  const hardware   = hardwareTable.find(h => h.key === hardwareSet)  || hardwareTable[0]

  const profileCost  = round2(perimeterMeters * profile.pricePerMeter)
  const hardwareCost = hardware.price
  const installCost  = Number(installFee) || 0

  const subtotalBeforeDiscount = round2(glassSubtotal + profileCost + hardwareCost + installCost)
  const discountAmount         = round2(subtotalBeforeDiscount * (Number(discountPct) / 100))
  const subtotalAfterDiscount  = round2(subtotalBeforeDiscount - discountAmount)
  const vatAmount              = round2(subtotalAfterDiscount * (Number(vatPct) / 100))
  const total                  = round2(subtotalAfterDiscount + vatAmount)

  return {
    panelResults,
    totalArea:             round2(totalArea),
    perimeterMeters:       round2(perimeterMeters),
    glassSubtotal,
    profileCost,
    hardwareCost,
    installCost,
    subtotalBeforeDiscount,
    discountAmount,
    subtotalAfterDiscount,
    vatAmount,
    total,
    // meta
    profileLabel:  profile.label,
    hardwareLabel: hardware.label,
    vatPct,
    discountPct,
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function round2(n) { return Math.round(n * 100) / 100 }

export function formatCurrency(amount, currency = 'ILS') {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export function formatArea(m2) {
  return `${m2.toFixed(2)} מ"ר`
}
