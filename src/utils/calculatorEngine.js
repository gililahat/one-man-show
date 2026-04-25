// src/utils/calculatorEngine.js
// ─────────────────────────────────────────────────────────────
// ONE MAN SHOW — shower pricing engine (v3)
// Pure math. No React, no Firebase.
// ─────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// PRICING — by glass thickness (6 / 8 / 10 mm)
// ═══════════════════════════════════════════════════════════════
// Same prices across thicknesses today — kept as lookup so future updates
// can differ per thickness without code changes.
const PRICES = {
  glass:        { 'התזת חול': 110, 'שקוף': 180, 'אקסטרה קליר': 260, 'אסייד': 290, 'גלינה': 380 },
  hinge_kz:     { 'מבריק ניקל': 50, 'שחור': 60, 'ניקל מט מוברש': 60, 'זהב': 65, 'גרפיט': 70, 'רוז גולד': 70, 'לבן': 65 },
  hinge_zz:     { 'מבריק ניקל': 75, 'שחור': 80, 'ניקל מט מוברש': 80, 'זהב': 90, 'גרפיט': 100, 'רוז גולד': 100, 'לבן': 95 },
  hinge_book:   { 'מבריק ניקל': 90, 'שחור': 95, 'ניקל מט מוברש': 90, 'זהב': 100, 'גרפיט': 110, 'רוז גולד': 100, 'לבן': 110 },
  corner90:     { 'מבריק ניקל': 25, 'שחור': 28, 'ניקל מט מוברש': 28, 'זהב': 30, 'גרפיט': 30, 'רוז גולד': 30, 'לבן': 30 },
  arm:          { 'מבריק ניקל': 60, 'שחור': 75, 'ניקל מט מוברש': 75, 'זהב': 85, 'גרפיט': 85, 'רוז גולד': 85, 'לבן': 85 },
  handle_btn:   { 'מבריק ניקל': 25, 'שחור': 28, 'ניקל מט מוברש': 28, 'זהב': 30, 'גרפיט': 30, 'רוז גולד': 30, 'לבן': 30 },
  handle_towel: { 'מבריק ניקל': 75, 'שחור': 80, 'ניקל מט מוברש': 75, 'זהב': 110, 'גרפיט': 110, 'רוז גולד': 110, 'לבן': 110 },
  wiper:        { 'שקוף': 16, 'שחור': 20, 'זהב': 20, 'גרפיט': 20, 'רוז גולד': 20, 'לבן': 20 },
  magnet:       { 'שקוף': 35, 'שחור': 45, 'זהב': 50, 'גרפיט': 50, 'רוז גולד': 50, 'לבן': 50 },
}

export const PRICING_BY_THICKNESS = { 6: PRICES, 8: PRICES, 10: PRICES }

export const PRICING_FORMULA = { margin: 2.2, vat: 1.18 }

// ═══════════════════════════════════════════════════════════════
// OPTION LISTS
// ═══════════════════════════════════════════════════════════════
export const THICKNESSES = [6, 8, 10]

export const SHOWER_TYPES = [
  { val: '1fixed1door',       he: 'דופן + דלת',            en: '1 Fixed + 1 Door',   desc: '1 דופן · 1 דלת',        icon: '🚿' },
  { val: '2fixed1door',       he: '2 דופנות + דלת',        en: '2 Fixed + 1 Door',   desc: '2 דופנות · 1 דלת',      icon: '🚿' },
  { val: '2doors',            he: '2 דלתות',                en: '2 Doors',            desc: '2 דלתות · ללא דופן',    icon: '🚿' },
  { val: '2fixed2doors',      he: '2 דופנות + 2 דלתות',    en: '2 Fixed + 2 Doors',  desc: '2 דופנות · 2 דלתות',    icon: '🚿' },
  { val: '1fixed0door',       he: 'דופן בלבד',              en: 'Fixed Panel Only',   desc: '1 דופן · ללא דלת',      icon: '🪟' },
  { val: '2fixed0door',       he: '2 דופנות בלבד',          en: '2 Fixed Panels',     desc: '2 דופנות · ללא דלת',    icon: '🪟' },
  { val: '0fixed1door',       he: 'דלת בלבד',               en: 'Door Only',          desc: '1 דלת · ללא דופן',      icon: '🚪' },
  { val: '0fixed1harmonica',  he: 'דלת ארמוניקה בלבד',      en: 'Harmonica Door',     desc: '1 דלת ארמוניקה',        icon: '🪗' },
]

export const LAYOUT_OPTIONS = [
  { val: 'straight', he: 'חזית',   en: 'Straight', desc: 'מידה אחת',                icon: '📐' },
  { val: 'corner',   he: 'פינתי',  en: 'Corner',   desc: "2 מידות (צד א' + צד ב')", icon: '🔲' },
]

export const GLASS_OPTIONS = [
  { val: 'שקוף',          en: 'Clear',       price: 180 },
  { val: 'התזת חול',      en: 'Sandblast',   price: 110 },
  { val: 'אקסטרה קליר',   en: 'Extra Clear', price: 260 },
  { val: 'אסייד',          en: 'Acid Etch',   price: 290 },
  { val: 'גלינה',          en: 'Galina',      price: 380 },
]

export const HARDWARE_COLORS = [
  { val: 'מבריק ניקל',      en: 'Shiny Nickel',   dotStyle: 'linear-gradient(135deg,#e8e8e8,#c0c0c0)' },
  { val: 'ניקל מט מוברש',  en: 'Brushed Nickel', dotStyle: 'linear-gradient(135deg,#d0d0d0,#a8a8a8)' },
  { val: 'שחור',            en: 'Matte Black',    dotStyle: 'linear-gradient(135deg,#333,#111)' },
  { val: 'זהב',             en: 'Gold',           dotStyle: 'linear-gradient(135deg,#f5d060,#c9a84c)' },
  { val: 'גרפיט',           en: 'Graphite',       dotStyle: 'linear-gradient(135deg,#666,#3a3a3a)' },
  { val: 'רוז גולד',        en: 'Rose Gold',      dotStyle: 'linear-gradient(135deg,#f0b8a0,#c87060)' },
  { val: 'לבן',             en: 'White',          dotStyle: 'linear-gradient(135deg,#fff,#e0e0e0)' },
]

export const FRAME_COLORS = ['שקוף', 'שחור', 'זהב', 'גרפיט', 'רוז גולד', 'לבן']

export const ITEM_LABELS_EN = {
  'זכוכית':            'Glass',
  'זווית 90°':         '90° Bracket',
  'זרוע תמיכה':        'Support Arm',
  'ציר ק/ז':           'Wall-Glass Hinge',
  'ציר ז/ז':           'Glass-Glass Hinge',
  'ציר ספר':           'Book Hinge',
  'מגב בין זכוכיות':   'Between-Glass Wiper',
  'מגב בלון (ציר)':    'Balloon Wiper (hinge)',
  'מגב בלון (קצה)':    'Balloon Wiper (edge)',
  'מגנט':              'Magnetic Seal',
  'מגב תחתון':         'Bottom Wiper',
  'ידית כפתור':        'Button Handle',
  'ידית מגבת':         'Towel Handle',
  'מגב מסגרת':         'Frame Wiper',
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function wiperColor(c) {
  return (c === 'מבריק ניקל' || c === 'ניקל מט מוברש') ? 'שקוף' : c
}

function parseShowerType(type) {
  const map = {
    '1fixed1door':      { fixed: 1, doors: 1 },
    '2fixed1door':      { fixed: 2, doors: 1 },
    '2doors':           { fixed: 0, doors: 2 },
    '0fixed2doors':     { fixed: 0, doors: 2 },  // alias used by sirtoot catalog
    '2fixed2doors':     { fixed: 2, doors: 2 },
    '1fixed0door':      { fixed: 1, doors: 0 },
    '2fixed0door':      { fixed: 2, doors: 0 },
    '0fixed1door':      { fixed: 0, doors: 1 },
    '0fixed1harmonica': { fixed: 0, doors: 1 },
  }
  return map[type] || { fixed: 0, doors: 0 }
}

function round(n) { return Math.round(n) }

// ═══════════════════════════════════════════════════════════════
// MAIN CALCULATION
// ═══════════════════════════════════════════════════════════════
/**
 * @param {object} config
 *   thickness: 6 | 8 | 10
 *   type: shower type key (from SHOWER_TYPES)
 *   layout: 'straight' | 'corner'
 *   len1, len2, height: in cm
 *   glassType: key from GLASS_OPTIONS
 *   color: hardware color (from HARDWARE_COLORS)
 *   options: { step, harmonica, zz, towel, noarm, frame, frameQty, frameColor }
 */
export function calculateShower(config) {
  const {
    thickness = 8,
    type, layout,
    len1 = 0, len2 = 0, height = 0,
    color, glassType,
    options = {},
  } = config

  const {
    step = false, harmonica = false, zz = false,
    towel = false, noarm = false,
    frame = false, frameQty = 0, frameColor = 'שקוף',
  } = options

  const PRICING = PRICING_BY_THICKNESS[thickness] || PRICING_BY_THICKNESS[8]
  const totalLen = layout === 'corner' ? Number(len1) + Number(len2) : Number(len1)
  const sqm = parseFloat(((totalLen * Number(height)) / 10000).toFixed(3))
  const { fixed, doors } = parseShowerType(type)
  const wc = wiperColor(color)
  const items = []

  // Glass
  items.push({ he: 'זכוכית', qty: parseFloat(sqm.toFixed(2)), unit: 'sqm', price: PRICING.glass[glassType] })

  // Per fixed panel: corner brackets + support arm
  for (let i = 0; i < fixed; i++) {
    items.push({ he: 'זווית 90°',   qty: step ? 3 : 2, unit: 'pcs', price: PRICING.corner90[color] })
    if (!noarm) items.push({ he: 'זרוע תמיכה', qty: 1, unit: 'pcs', price: PRICING.arm[color] })
  }

  // Per door: hinges, wipers, magnet/edge-wiper, bottom wiper, handle
  const isHarmonica = harmonica || type === '0fixed1harmonica'
  for (let i = 0; i < doors; i++) {
    items.push({
      he:    zz ? 'ציר ז/ז' : 'ציר ק/ז',
      qty:   2, unit: 'pcs',
      price: zz ? PRICING.hinge_zz[color] : PRICING.hinge_kz[color],
    })
    if (isHarmonica) {
      items.push({ he: 'ציר ספר',          qty: 2, unit: 'pcs', price: PRICING.hinge_book[color] })
      items.push({ he: 'מגב בין זכוכיות',  qty: 1, unit: 'pcs', price: PRICING.wiper[wc] })
    } else {
      items.push({ he: 'מגב בלון (ציר)',   qty: 1, unit: 'pcs', price: PRICING.wiper[wc] })
    }
    const useMagnet = fixed > 0 || doors === 2
    items.push(useMagnet
      ? { he: 'מגנט',            qty: 1, unit: 'pcs', price: PRICING.magnet[wc] }
      : { he: 'מגב בלון (קצה)', qty: 1, unit: 'pcs', price: PRICING.wiper[wc] }
    )
    items.push({ he: 'מגב תחתון', qty: 1, unit: 'pcs', price: PRICING.wiper[wc] })
    items.push(towel
      ? { he: 'ידית מגבת',  qty: 1, unit: 'pcs', price: PRICING.handle_towel[color] }
      : { he: 'ידית כפתור', qty: 1, unit: 'pcs', price: PRICING.handle_btn[color] }
    )
  }

  // Frame wiper (optional)
  if (frame && frameQty > 0) {
    items.push({ he: 'מגב מסגרת', qty: Number(frameQty), unit: 'pcs', price: PRICING.wiper[wiperColor(frameColor)] })
  }

  // Attach per-item total
  const itemsWithTotal = items.map(it => ({ ...it, total: round(it.qty * it.price) }))

  const subtotal = itemsWithTotal.reduce((s, i) => s + i.qty * i.price, 0)
  const preTax   = subtotal * PRICING_FORMULA.margin
  const total    = preTax   * PRICING_FORMULA.vat

  return {
    sqm, items: itemsWithTotal,
    subtotal: round(subtotal),
    preTax:   round(preTax),
    total:    round(total),
  }
}

// ═══════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════
export function formatCurrency(amount, currency = 'ILS') {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatArea(m2) {
  return `${(Number(m2) || 0).toFixed(2)} מ"ר`
}

// ═══════════════════════════════════════════════════════════════
// LEGACY / COMPATIBILITY — kept so older code keeps compiling.
// These aren't used by the new shower calculator but are referenced
// by usePricing / settings — no-op defaults.
// ═══════════════════════════════════════════════════════════════
export const GLASS_TYPES    = GLASS_OPTIONS.map(g => ({ key: g.val, label: g.val, pricePerM2: g.price }))
export const PROFILE_TYPES  = []
export const HARDWARE_SETS  = []
export const OPENING_TYPES  = []
