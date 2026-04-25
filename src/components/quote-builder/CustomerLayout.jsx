// src/components/quote-builder/CustomerLayout.jsx
// Shared customer-facing layout for quotes — used by both QuoteViewPage
// (contractor's saved view) and PublicQuotePage (public link to client).
//
// Single source of truth: shower cards (description + sketch + price),
// regular items table, installation lines (final price), and totals.

import { formatCurrency, PRICING_FORMULA } from '@/utils/calculatorEngine'
import { findModel } from '@/utils/sirtoot/catalog'
import { computeShower } from '@/utils/sirtoot/rules'

const MARGIN = PRICING_FORMULA.margin || 2.2

// ── Build the layout data from a quote document ───────────────
export function buildCustomerLayout(quote) {
  const r = quote?.result || {}
  const items = quote?.items || []
  const snapshots = quote?.measurementSnapshots || []

  const measGroups = new Map()
  const installItems = []
  const otherItems = []
  for (const item of items) {
    if (item.source === 'installation') {
      installItems.push(item)
    } else if (item.source === 'measurement' && item.measurementId) {
      if (!measGroups.has(item.measurementId)) measGroups.set(item.measurementId, [])
      measGroups.get(item.measurementId).push(item)
    } else {
      otherItems.push(item)
    }
  }

  const showerCards = []
  for (const [measId, groupItems] of measGroups) {
    const snap = snapshots.find(s => s.id === measId)
    const groupCost = groupItems.reduce((s, i) => s + (Number(i.total) || 0), 0)
    showerCards.push({
      key:    measId,
      title:  showerTitle(snap),
      details: showerDetails(snap),
      sketch: snap,
      price:  Math.round(groupCost * MARGIN),
    })
  }

  const regularLines = otherItems.map(item => {
    const totalCost = Number(item.total) || (Number(item.price) * (Number(item.qty) || 1)) || 0
    return {
      name: item.name,
      qty:  item.qty || 1,
      unit: Math.round((Number(item.price) || 0) * MARGIN),
      total: Math.round(totalCost * MARGIN),
    }
  })
  if (quote?.panels?.length > 0) {
    quote.panels.forEach((p, i) => regularLines.push({
      name:  `${p.label || `פנל ${i + 1}`} (${p.width}×${p.height} מ"מ)`,
      qty:   1,
      unit:  r.panelResults?.[i]?.panelPrice || 0,
      total: r.panelResults?.[i]?.panelPrice || 0,
    }))
  }

  const installLines = installItems.map(item => ({
    name:  item.name,
    qty:   item.qty || 1,
    unit:  Number(item.price) || 0,
    total: Number(item.total) || (Number(item.price) * (Number(item.qty) || 1)) || 0,
  }))

  const showersSubtotal  = showerCards.reduce((s, c) => s + c.price, 0)
  const regularExtras    = regularLines.reduce((s, x) => s + x.total, 0)
  const preVatSubtotal   = showersSubtotal + regularExtras
  const vatAmount        = Math.round(preVatSubtotal * 0.18)
  const installsSubtotal = installLines.reduce((s, x) => s + x.total, 0)
  const grandTotal       = preVatSubtotal + vatAmount + installsSubtotal

  return {
    showerCards, regularLines, installLines,
    preVatSubtotal, vatAmount, installsSubtotal, grandTotal,
  }
}

// ── Card / table renderers ───────────────────────────────────
export function ShowerCard({ card }) {
  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#fff',
    }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            {card.title}
          </p>
          {card.details.map((d, idx) => (
            <p key={idx} style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{d}</p>
          ))}
        </div>
        {card.sketch && <ShowerThumbnail snapshot={card.sketch} size="lg" />}
      </div>
      <div style={{
        marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>מחיר לפני מע״מ</span>
        <span style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', direction: 'ltr' }}>
          {formatCurrency(card.price)}
        </span>
      </div>
    </div>
  )
}

export function RegularItemsTable({ rows }) {
  if (!rows.length) return null
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
          <Th align="right">פריט / תיאור</Th>
          <Th align="center" width={48}>כמות</Th>
          <Th align="left"   width={110}>מחיר יחידה</Th>
          <Th align="left"   width={110}>סכום</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '11px 0', color: '#0f172a', fontWeight: 500 }}>{item.name}</td>
            <td style={{ padding: '11px 0', textAlign: 'center', color: '#64748b' }}>{item.qty}</td>
            <td style={{ padding: '11px 0', textAlign: 'left', color: '#64748b', direction: 'ltr' }}>{formatCurrency(item.unit)}</td>
            <td style={{ padding: '11px 0', textAlign: 'left', fontWeight: 600, color: '#0f172a', direction: 'ltr' }}>{formatCurrency(item.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function InstallationLines({ lines }) {
  if (!lines.length) return null
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>
        התקנה
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {lines.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '11px 0', color: '#0f172a', fontWeight: 500 }}>
                🔧 {item.name}
                <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 6 }}>(כולל מע״מ)</span>
              </td>
              <td style={{ padding: '11px 0', textAlign: 'left', fontWeight: 600, color: '#0f172a', direction: 'ltr', whiteSpace: 'nowrap' }}>
                {formatCurrency(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TotalsBlock({ layout }) {
  const { preVatSubtotal, vatAmount, installsSubtotal, grandTotal } = layout
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ minWidth: 260, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
        {preVatSubtotal > 0 && <SumRow label="סכום ביניים"        value={formatCurrency(preVatSubtotal)} />}
        {vatAmount      > 0 && <SumRow label='מע"מ 18%'           value={formatCurrency(vatAmount)} />}
        {installsSubtotal > 0 && <SumRow label="התקנה (מחיר סופי)" value={formatCurrency(installsSubtotal)} />}
        <div style={{
          borderTop: '2px solid #0f2744', marginTop: 10, paddingTop: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>סה"כ לתשלום</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: '#0f2744', direction: 'ltr' }}>
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────
function showerTitle(snapshot) {
  if (!snapshot) return 'מקלחון בייצור אישי'
  return snapshot.modelLabel || snapshot.name || 'מקלחון בייצור אישי'
}

function showerDetails(snapshot) {
  if (!snapshot) return []
  const out = []
  const model = findModel(snapshot.modelId)
  if (model) {
    const config = describePanels(model.panels)
    if (config) out.push(config)
  }
  const tech = []
  if (snapshot.thickness) tech.push(`זכוכית ${snapshot.thickness} מ״מ`)
  if (snapshot.glassType) tech.push(snapshot.glassType)
  if (snapshot.color)     tech.push(`פרזול ${snapshot.color}`)
  if (tech.length) out.push(tech.join(' · '))
  return out
}

function describePanels(panels) {
  return panels.map(p =>
    p.kind === 'door' ? `דלת ציר ${p.hingeSide === 'R' ? 'ימין' : p.hingeSide === 'L' ? 'שמאל' : ''}`.trim()
    : p.kind === 'wall-ext' ? 'קיר המשך'
    : 'קבוע',
  ).join(' · ')
}

// Front-elevation thumbnail: panels rendered as filled rectangles side by side.
// Doors light-blue with a handle dot, fixed/wall-ext mid-grey.
export function ShowerThumbnail({ snapshot, size = 'md' }) {
  const dims = size === 'lg' ? { W: 130, H: 88, pad: 8 } : { W: 96, H: 64, pad: 6 }
  if (!snapshot) return null
  const model = findModel(snapshot.modelId)
  if (!model) return null
  let computed
  try {
    computed = computeShower({
      model,
      thickness: snapshot.thickness || 8,
      opening: { height: 1900 },
      panelInputs: snapshot.panelInputs || [],
    })
  } catch { return null }
  if (!computed.length) return null

  const { W, H, pad } = dims
  const totalW   = computed.reduce((s, p) => s + (p.gross?.w || 0), 0) || 1
  const totalH   = computed[0]?.gross?.h || 1900
  const innerW   = W - 2 * pad
  const innerH   = H - 2 * pad
  const scaleX   = innerW / totalW
  const heightPx = Math.min(innerH, totalH * scaleX)
  const baseY    = pad + (innerH - heightPx) / 2

  const elements = []
  let cursorX = pad
  computed.forEach((p, i) => {
    const wPx = (p.gross?.w || 0) * scaleX
    const isDoor = p.kind === 'door'
    elements.push(
      <rect key={`p${i}`}
        x={cursorX} y={baseY}
        width={Math.max(1, wPx - 1)} height={heightPx}
        fill={isDoor ? '#bfdbfe' : '#e2e8f0'}
        stroke="#0f172a" strokeWidth="0.8" />,
    )
    if (isDoor && p.hingeSide) {
      const handleX = p.hingeSide === 'R' ? cursorX + 3 : cursorX + wPx - 4
      elements.push(
        <circle key={`h${i}`} cx={handleX} cy={baseY + heightPx * 0.55}
                r="1.6" fill="#0f172a" />,
      )
    }
    cursorX += wPx
  })

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
         style={{ background: '#f8fafc', borderRadius: 8, flexShrink: 0 }}>
      {elements}
    </svg>
  )
}

function Th({ children, align, width }) {
  return <th style={{ textAlign: align, padding: '0 0 10px', color: '#94a3b8', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', width }}>{children}</th>
}
function SumRow({ label, value, green }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: 500, color: green ? '#16a34a' : '#0f172a', direction: 'ltr' }}>{value}</span>
    </div>
  )
}
