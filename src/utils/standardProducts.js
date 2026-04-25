// src/utils/standardProducts.js
// Standard shower catalog — supplier: איתן סעדה, price list valid from 1.6.23.
// Prices here are COST (contractor purchase). The quote builder applies the
// usual margin + VAT on top (same formula as the custom shower calculator).
// Source: "מחירי מוצרים בתוקף.pdf" pages 1-5.

export const CATEGORIES = [
  { key: 'sliding-round',       label: 'הזזה פינתית עגולה' },
  { key: 'corner-square',       label: 'פינתי מרובע' },
  { key: 'corner-round',        label: 'פינתי עגול' },
  { key: 'corner-asym',         label: 'פינתי אסימטרי' },
  { key: 'sliding-corner',      label: 'הזזה פינתית' },
  { key: 'front',               label: 'חזית' },
  { key: 'front-corner',        label: 'חזית פינתית (רחבה)' },
  { key: 'front-sliding-1',     label: 'חזית הזזה — קבוע + דלת' },
  { key: 'front-sliding-2',     label: 'חזית הזזה — 2 קבועים + 2 דלתות' },
  { key: 'harmonica',           label: 'הרמוניקה' },
  { key: 'bathtub',             label: 'אמבטיון' },
]

// Short glass & hardware codes for compact rows
const G = {
  C: 'שקוף', F: 'צרוב', GR: 'גרניט', S: 'פסים', D: 'כהה',
}
const HW = {
  STD: 'כרום',           // supplier default (chrome/nickel)
  B:   'שחור',           // black hardware + clear glass
  BS:  'שחור קוביות',   // black cubic hardware
}

export const STANDARD_PRODUCTS = [
  // ═══ 402 — round sliding (מקלחון הזזה עגול) ═══ ₪430
  { sku: '402802PR', cat: 'sliding-round', size: '77-80', glass: G.F,  hw: HW.STD, price: 430 },
  { sku: '402804PR', cat: 'sliding-round', size: '77-80', glass: G.GR, hw: HW.STD, price: 430 },
  { sku: '402806PR', cat: 'sliding-round', size: '77-80', glass: G.C,  hw: HW.STD, price: 430 },
  { sku: '402902PR', cat: 'sliding-round', size: '87-90', glass: G.F,  hw: HW.STD, price: 430 },
  { sku: '402904PR', cat: 'sliding-round', size: '87-90', glass: G.GR, hw: HW.STD, price: 430 },
  { sku: '402906PR', cat: 'sliding-round', size: '87-90', glass: G.C,  hw: HW.STD, price: 430 },

  // ═══ 403 — square corner (פינתי מרובע) ═══ ₪550
  { sku: '403802PR', cat: 'corner-square', size: '77-80', glass: G.F,  hw: HW.STD, price: 550, series: '403' },
  { sku: '403804PR', cat: 'corner-square', size: '77-80', glass: G.GR, hw: HW.STD, price: 550, series: '403' },
  { sku: '403806PR', cat: 'corner-square', size: '77-80', glass: G.C,  hw: HW.STD, price: 550, series: '403' },
  { sku: '403902PR', cat: 'corner-square', size: '87-90', glass: G.F,  hw: HW.STD, price: 550, series: '403' },
  { sku: '403904PR', cat: 'corner-square', size: '87-90', glass: G.GR, hw: HW.STD, price: 550, series: '403' },
  { sku: '403906PR', cat: 'corner-square', size: '87-90', glass: G.C,  hw: HW.STD, price: 550, series: '403' },

  // ═══ 404 — round corner (פינתי עגול) ═══ ₪550
  { sku: '404802PR', cat: 'corner-round', size: '77-80', glass: G.F,  hw: HW.STD, price: 550 },
  { sku: '404804PR', cat: 'corner-round', size: '77-80', glass: G.GR, hw: HW.STD, price: 550 },
  { sku: '404806PR', cat: 'corner-round', size: '77-80', glass: G.C,  hw: HW.STD, price: 550 },
  { sku: '404902PR', cat: 'corner-round', size: '87-90', glass: G.F,  hw: HW.STD, price: 550 },
  { sku: '404904PR', cat: 'corner-round', size: '87-90', glass: G.GR, hw: HW.STD, price: 550 },
  { sku: '404906PR', cat: 'corner-round', size: '87-90', glass: G.C,  hw: HW.STD, price: 550 },

  // ═══ 405 — square corner (פינתי מרובע) ═══
  // Standard sizes ₪430
  { sku: '405702PR', cat: 'corner-square', size: '67-70', glass: G.F,  hw: HW.STD, price: 430, series: '405' },
  { sku: '405704PR', cat: 'corner-square', size: '67-70', glass: G.GR, hw: HW.STD, price: 430, series: '405' },
  { sku: '405706PR', cat: 'corner-square', size: '67-70', glass: G.C,  hw: HW.STD, price: 430, series: '405' },
  { sku: '405802PR', cat: 'corner-square', size: '77-80', glass: G.F,  hw: HW.STD, price: 430, series: '405' },
  { sku: '405804PR', cat: 'corner-square', size: '77-80', glass: G.GR, hw: HW.STD, price: 430, series: '405' },
  { sku: '405806PR', cat: 'corner-square', size: '77-80', glass: G.C,  hw: HW.STD, price: 430, series: '405' },
  { sku: '405902PR', cat: 'corner-square', size: '87-90', glass: G.F,  hw: HW.STD, price: 430, series: '405' },
  { sku: '405904PR', cat: 'corner-square', size: '87-90', glass: G.GR, hw: HW.STD, price: 430, series: '405' },
  { sku: '405906PR', cat: 'corner-square', size: '87-90', glass: G.C,  hw: HW.STD, price: 430, series: '405' },
  // Asymmetric ₪480
  { sku: '4057-802PR', cat: 'corner-asym', size: '70/80', glass: G.S,  hw: HW.STD, price: 480, series: '405' },
  { sku: '4057-804PR', cat: 'corner-asym', size: '70/80', glass: G.GR, hw: HW.STD, price: 480, series: '405' },
  { sku: '4057-806PR', cat: 'corner-asym', size: '70/80', glass: G.C,  hw: HW.STD, price: 480, series: '405' },
  { sku: '4057-902PR', cat: 'corner-asym', size: '70/90', glass: G.S,  hw: HW.STD, price: 480, series: '405' },
  { sku: '4057-904PR', cat: 'corner-asym', size: '70/90', glass: G.GR, hw: HW.STD, price: 480, series: '405' },
  { sku: '4057-906PR', cat: 'corner-asym', size: '70/90', glass: G.C,  hw: HW.STD, price: 480, series: '405' },
  { sku: '4058-902PR', cat: 'corner-asym', size: '80/90', glass: G.F,  hw: HW.STD, price: 480, series: '405' },
  { sku: '4058-904PR', cat: 'corner-asym', size: '80/90', glass: G.GR, hw: HW.STD, price: 480, series: '405' },
  { sku: '4058-906PR', cat: 'corner-asym', size: '80/90', glass: G.C,  hw: HW.STD, price: 480, series: '405' },
  // Black hardware ₪480
  { sku: '405B77-80PR',  cat: 'corner-square', size: '77-80', glass: G.C, hw: HW.B,  price: 480, series: '405' },
  { sku: '405B87-90PR',  cat: 'corner-square', size: '87-90', glass: G.C, hw: HW.B,  price: 480, series: '405' },
  { sku: '405BS77-80PR', cat: 'corner-square', size: '77-80', glass: G.C, hw: HW.BS, price: 480, series: '405' },
  { sku: '405BS87-90PR', cat: 'corner-square', size: '87-90', glass: G.C, hw: HW.BS, price: 480, series: '405' },

  // ═══ 407 — front shower (מקלחון חזית) ═══ ₪420 standard, +30 for black
  // 70-75
  { sku: '407070PR', cat: 'front', size: '70-75', glass: G.F,  hw: HW.STD, price: 420 },
  { sku: '407072PR', cat: 'front', size: '70-75', glass: G.GR, hw: HW.STD, price: 420 },
  { sku: '407074PR', cat: 'front', size: '70-75', glass: G.C,  hw: HW.STD, price: 420 },
  // 75-80
  { sku: '407802PR', cat: 'front', size: '75-80', glass: G.F,  hw: HW.STD, price: 420 },
  { sku: '407804PR', cat: 'front', size: '75-80', glass: G.GR, hw: HW.STD, price: 420 },
  { sku: '407806PR', cat: 'front', size: '75-80', glass: G.C,  hw: HW.STD, price: 420 },
  // 80-85
  { sku: '407852PR',  cat: 'front', size: '80-85', glass: G.F,  hw: HW.STD, price: 420 },
  { sku: '407854PR',  cat: 'front', size: '80-85', glass: G.GR, hw: HW.STD, price: 420 },
  { sku: '407856PR',  cat: 'front', size: '80-85', glass: G.C,  hw: HW.STD, price: 420 },
  { sku: '407856BPR', cat: 'front', size: '80-85', glass: G.C,  hw: HW.B,   price: 450 },
  // 85-90
  { sku: '407902PR',  cat: 'front', size: '85-90', glass: G.F,  hw: HW.STD, price: 420 },
  { sku: '407904PR',  cat: 'front', size: '85-90', glass: G.GR, hw: HW.STD, price: 420 },
  { sku: '407906PR',  cat: 'front', size: '85-90', glass: G.C,  hw: HW.STD, price: 420 },
  { sku: '407906BPR', cat: 'front', size: '85-90', glass: G.C,  hw: HW.B,   price: 450 },
  // 90-95
  { sku: '407952PR',  cat: 'front', size: '90-95', glass: G.F,  hw: HW.STD, price: 420 },
  { sku: '407954PR',  cat: 'front', size: '90-95', glass: G.GR, hw: HW.STD, price: 420 },
  { sku: '407956PR',  cat: 'front', size: '90-95', glass: G.C,  hw: HW.STD, price: 420 },
  { sku: '407956BPR', cat: 'front', size: '90-95', glass: G.C,  hw: HW.B,   price: 450 },
  // 95-100
  { sku: '407095PR',  cat: 'front', size: '95-100', glass: G.GR, hw: HW.STD, price: 420 },
  { sku: '407097PR',  cat: 'front', size: '95-100', glass: G.F,  hw: HW.STD, price: 420 },
  { sku: '407099PR',  cat: 'front', size: '95-100', glass: G.C,  hw: HW.STD, price: 420 },
  { sku: '407099BPR', cat: 'front', size: '95-100', glass: G.C,  hw: HW.B,   price: 450 },
  // 100-105
  { sku: '407052PR',  cat: 'front', size: '100-105', glass: G.F,  hw: HW.STD, price: 420 },
  { sku: '407054PR',  cat: 'front', size: '100-105', glass: G.GR, hw: HW.STD, price: 420 },
  { sku: '407056PR',  cat: 'front', size: '100-105', glass: G.C,  hw: HW.STD, price: 420 },
  { sku: '407056BPR', cat: 'front', size: '100-105', glass: G.C,  hw: HW.B,   price: 450 },
  // 105-110 to 135-140 — all same ₪420 + ₪450 for black
  ...[ ['105-110','407110','407112','407114','407114B'],
       ['110-115','407115','407117','407119','407119B'],
       ['115-120','407120','407122','407124','407124B'],
       ['120-125','407125','407127','407129','407129B'],
       ['125-130','407130','407132','407134','407134B','S'],   // 125+ use stripes instead of frost
       ['130-135','407135','407137','407139','407139B','S'],
       ['135-140','407140','407142','407144','407144B','S'],
  ].flatMap(([size, a, b, c, d, stripes]) => {
    const first = stripes === 'S' ? G.S : G.F
    return [
      { sku: a + 'PR', cat: 'front', size, glass: first, hw: HW.STD, price: 420 },
      { sku: b + 'PR', cat: 'front', size, glass: G.GR,   hw: HW.STD, price: 420 },
      { sku: c + 'PR', cat: 'front', size, glass: G.C,    hw: HW.STD, price: 420 },
      { sku: d + 'PR', cat: 'front', size, glass: G.C,    hw: HW.B,   price: 450 },
    ]
  }),

  // ═══ 407 — front corner (חזית פינתית רחבה) ═══ ₪500 / ₪550 for 180+
  // 140-145 (corner 70-72.5)
  { sku: '407145PR',   cat: 'front-corner', size: '140-145', glass: G.S,  hw: HW.STD, price: 500, note: 'פינתי 70-72.5' },
  { sku: '407147PR',   cat: 'front-corner', size: '140-145', glass: G.GR, hw: HW.STD, price: 500, note: 'פינתי 70-72.5' },
  { sku: '407149PR',   cat: 'front-corner', size: '140-145', glass: G.C,  hw: HW.STD, price: 500, note: 'פינתי 70-72.5' },
  // 145-150 (corner 72.5-75)
  { sku: '407150PR',   cat: 'front-corner', size: '145-150', glass: G.S,  hw: HW.STD, price: 500, note: 'פינתי 72.5-75' },
  { sku: '407152PR',   cat: 'front-corner', size: '145-150', glass: G.GR, hw: HW.STD, price: 500, note: 'פינתי 75-77.5' },
  { sku: '407154PR',   cat: 'front-corner', size: '145-150', glass: G.C,  hw: HW.STD, price: 500, note: 'פינתי 75-77.5' },
  // 150-155 → 175-180 — all ₪500, corner info in note
  ...[ ['150-155','75-77.5',   '407150-5S','407150-5G','407150-5C'],
       ['155-160','77.5-80',   '407155-0S','407155-0G','407155-0C'],
       ['160-165','80-82.5',   '407160-5S','407160-5G','407160-5C'],
       ['165-170','82.5-85',   '407165-0S','407165-0G','407165-0C'],
       ['170-175','85-87.5',   '407170-5S','407170-5G','407170-5C'],
       ['175-180','87.5-90',   '407175-0S','407175-0G','407175-0C'],
  ].flatMap(([size, corner, a, b, c]) => [
    { sku: a + 'PR', cat: 'front-corner', size, glass: G.S,  hw: HW.STD, price: 500, note: `פינתי ${corner}` },
    { sku: b + 'PR', cat: 'front-corner', size, glass: G.GR, hw: HW.STD, price: 500, note: `פינתי ${corner}` },
    { sku: c + 'PR', cat: 'front-corner', size, glass: G.C,  hw: HW.STD, price: 500, note: `פינתי ${corner}` },
  ]),
  // 180-200 ₪550
  ...[ ['180-185','90-92.5',   '407180-5S','407180-5G','407180-5C'],
       ['185-190','92.5-95',   '407185-0S','407185-0G','407185-0C'],
       ['190-195','95-97.5',   '407190-5S','407190-5G','407190-5C'],
       ['195-200','97.5-100',  '407195-0S','407195-0G','407195-0C'],
  ].flatMap(([size, corner, a, b, c]) => [
    { sku: a + 'PR', cat: 'front-corner', size, glass: G.S,  hw: HW.STD, price: 550, note: `פינתי ${corner}` },
    { sku: b + 'PR', cat: 'front-corner', size, glass: G.GR, hw: HW.STD, price: 550, note: `פינתי ${corner}` },
    { sku: c + 'PR', cat: 'front-corner', size, glass: G.C,  hw: HW.STD, price: 550, note: `פינתי ${corner}` },
  ]),

  // ═══ 407S — sliding 1 fixed + 1 door (חזית הזזה קבוע + דלת) ═══ ₪400
  ...[ '100-105','105-110','110-115','115-120','120-125','125-130','130-135',
  ].flatMap(size => {
    const n = size.split('-')[1]  // 105, 110, etc.
    return [
      { sku: `407S${n}CPR`, cat: 'front-sliding-1', size, glass: G.C, hw: HW.STD, price: 400 },
      { sku: `407S${n}SPR`, cat: 'front-sliding-1', size, glass: G.F, hw: HW.STD, price: 400 },
    ]
  }),

  // ═══ 407S — sliding 2 fixed + 2 doors (חזית הזזה 2 קבועים + 2 דלתות) ═══ ₪420
  ...[ '135-140','140-145','145-150','150-155','155-160','160-165','165-170','170-175','175-180',
  ].flatMap(size => {
    const n = size.split('-')[1]
    return [
      { sku: `407S${n}CPR`, cat: 'front-sliding-2', size, glass: G.C, hw: HW.STD, price: 420 },
      { sku: `407S${n}SPR`, cat: 'front-sliding-2', size, glass: G.F, hw: HW.STD, price: 420 },
    ]
  }),

  // ═══ 409 — harmonica (הרמוניקה) ═══ ₪630 / ₪680 black / ₪700 dark
  { sku: '4098-902PR', cat: 'corner-asym', size: '80/90', glass: G.S,  hw: HW.STD, price: 680, series: '409' },
  { sku: '4098-904PR', cat: 'corner-asym', size: '80/90', glass: G.GR, hw: HW.STD, price: 680, series: '409' },
  { sku: '4098-906PR', cat: 'corner-asym', size: '80/90', glass: G.C,  hw: HW.STD, price: 680, series: '409' },
  { sku: '409802PR',   cat: 'harmonica',   size: '77-80', glass: G.F,  hw: HW.STD, price: 630 },
  { sku: '409804PR',   cat: 'harmonica',   size: '77-80', glass: G.GR, hw: HW.STD, price: 630 },
  { sku: '409806PR',   cat: 'harmonica',   size: '77-80', glass: G.C,  hw: HW.STD, price: 630 },
  { sku: '409902PR',   cat: 'harmonica',   size: '87-90', glass: G.F,  hw: HW.STD, price: 630 },
  { sku: '409904PR',   cat: 'harmonica',   size: '87-90', glass: G.GR, hw: HW.STD, price: 630 },
  { sku: '409906PR',   cat: 'harmonica',   size: '87-90', glass: G.C,  hw: HW.STD, price: 630 },
  { sku: '409B77-80PR', cat: 'harmonica', size: '77-80', glass: G.C, hw: HW.B,  price: 680 },
  { sku: '409B87-90PR', cat: 'harmonica', size: '87-90', glass: G.C, hw: HW.B,  price: 680 },
  { sku: '409BS77-80PR',cat: 'harmonica', size: '77-80', glass: G.C, hw: HW.BS, price: 680 },
  { sku: '409BS87-90PR',cat: 'harmonica', size: '87-90', glass: G.C, hw: HW.BS, price: 680 },
  // 419 — dark variants of 409
  { sku: '419808PR', cat: 'harmonica', size: '77-80', glass: G.D, hw: HW.STD, price: 700 },
  { sku: '419908PR', cat: 'harmonica', size: '87-90', glass: G.D, hw: HW.STD, price: 700 },

  // ═══ 411 — corner sliding (הזזה פינתי) ═══
  // Asymmetric
  { sku: '4117-702PR', cat: 'corner-asym', size: '70/90', glass: G.F,  hw: HW.STD, price: 500, series: '411' },
  { sku: '4117-704PR', cat: 'corner-asym', size: '70/90', glass: G.GR, hw: HW.STD, price: 500, series: '411' },
  { sku: '4117-706PR', cat: 'corner-asym', size: '70/90', glass: G.C,  hw: HW.STD, price: 500, series: '411' },
  { sku: '4117-802PR', cat: 'corner-asym', size: '70/80', glass: G.S,  hw: HW.STD, price: 500, series: '411' },
  { sku: '4117-804PR', cat: 'corner-asym', size: '70/80', glass: G.GR, hw: HW.STD, price: 500, series: '411' },
  { sku: '4117-806PR', cat: 'corner-asym', size: '70/80', glass: G.C,  hw: HW.STD, price: 500, series: '411' },
  { sku: '4118-902PR', cat: 'corner-asym', size: '80/90', glass: G.F,  hw: HW.STD, price: 470, series: '411' },
  { sku: '4118-904PR', cat: 'corner-asym', size: '80/90', glass: G.GR, hw: HW.STD, price: 470, series: '411' },
  { sku: '4118-906PR', cat: 'corner-asym', size: '80/90', glass: G.C,  hw: HW.STD, price: 470, series: '411' },
  // Standard
  { sku: '411702PR', cat: 'sliding-corner', size: '67-70', glass: G.F,  hw: HW.STD, price: 430 },
  { sku: '411704PR', cat: 'sliding-corner', size: '67-70', glass: G.GR, hw: HW.STD, price: 430 },
  { sku: '411706PR', cat: 'sliding-corner', size: '67-70', glass: G.C,  hw: HW.STD, price: 430 },
  { sku: '411802PR', cat: 'sliding-corner', size: '77-80', glass: G.F,  hw: HW.STD, price: 420 },
  { sku: '411804PR', cat: 'sliding-corner', size: '77-80', glass: G.GR, hw: HW.STD, price: 420 },
  { sku: '411806PR', cat: 'sliding-corner', size: '77-80', glass: G.C,  hw: HW.STD, price: 420 },
  { sku: '411902PR', cat: 'sliding-corner', size: '87-90', glass: G.F,  hw: HW.STD, price: 420 },
  { sku: '411904PR', cat: 'sliding-corner', size: '87-90', glass: G.GR, hw: HW.STD, price: 420 },
  { sku: '411906PR', cat: 'sliding-corner', size: '87-90', glass: G.C,  hw: HW.STD, price: 420 },
  // Black
  { sku: '411B77-80PR',  cat: 'sliding-corner', size: '77-80', glass: G.C, hw: HW.B,  price: 480 },
  { sku: '411B87-90PR',  cat: 'sliding-corner', size: '87-90', glass: G.C, hw: HW.B,  price: 480 },
  { sku: '411BS77-80PR', cat: 'sliding-corner', size: '77-80', glass: G.C, hw: HW.BS, price: 480 },
  { sku: '411BS87-90PR', cat: 'sliding-corner', size: '87-90', glass: G.C, hw: HW.BS, price: 480 },

  // ═══ 415 — square corner dark ═══ ₪550
  { sku: '415808PR', cat: 'corner-square', size: '77-80', glass: G.D, hw: HW.STD, price: 550, series: '415' },
  { sku: '415908PR', cat: 'corner-square', size: '87-90', glass: G.D, hw: HW.STD, price: 550, series: '415' },

  // ═══ 416 — bathtub screen (אמבטיון) ═══
  { sku: '416070PR',  cat: 'bathtub', size: '67',         glass: G.C,  hw: HW.STD, price: 280, note: 'קיר לסגירת אמבטיה' },
  { sku: '416122PR',  cat: 'bathtub', size: 'ימין/שמאל', glass: G.F,  hw: HW.STD, price: 300 },
  { sku: '416124PR',  cat: 'bathtub', size: 'ימין/שמאל', glass: G.GR, hw: HW.STD, price: 300 },
  { sku: '416126PR',  cat: 'bathtub', size: 'ימין/שמאל', glass: G.C,  hw: HW.STD, price: 300 },
  { sku: '416126BPR', cat: 'bathtub', size: 'ימין/שמאל', glass: G.C,  hw: HW.B,   price: 360 },
]

// ── Helpers ────────────────────────────────────────────────

export function categoryLabel(key) {
  return CATEGORIES.find(c => c.key === key)?.label || key
}

export function productName(p) {
  const hw = p.hw && p.hw !== HW.STD ? ` · פרזול ${p.hw}` : ''
  const note = p.note ? ` (${p.note})` : ''
  return `${categoryLabel(p.cat)} ${p.size} · זכוכית ${p.glass}${hw}${note}`
}

export function productsByCategory(catKey) {
  return STANDARD_PRODUCTS.filter(p => p.cat === catKey)
}
