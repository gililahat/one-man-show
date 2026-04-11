// src/utils/outputEngine.js
// ─────────────────────────────────────────────────────────────
// Generates export content for different output types.
// Pure functions — no React, no Firebase.
// ─────────────────────────────────────────────────────────────
import { formatCurrency } from './calculatorEngine'

const NOW = () => new Date().toLocaleDateString('he-IL', {
  day: '2-digit', month: '2-digit', year: 'numeric'
})

// ─── Glass Production File ────────────────────────────────────
/**
 * Generates a production order for a glass manufacturer.
 * Input: quote object from Firestore
 * Output: plain-text string ready to copy / print / send
 */
export function generateGlassProduction(quote, businessName = '') {
  const panels = quote.panels || []
  const r      = quote.result  || {}

  const lines = [
    `═══════════════════════════════════════════`,
    `  הזמנת ייצור זכוכית`,
    `═══════════════════════════════════════════`,
    `תאריך:        ${NOW()}`,
    businessName ? `עסק:          ${businessName}` : '',
    `לקוח:         ${quote.clientName || '—'}`,
    quote.projectName ? `פרויקט:       ${quote.projectName}` : '',
    ``,
    `───────────────────────────────────────────`,
    `  פנלים`,
    `───────────────────────────────────────────`,
  ].filter(Boolean)

  panels.forEach((p, i) => {
    const pr = quote.result?.panelResults?.[i] || {}
    const glassLabel = p.glassType?.replace(/_/g, ' ') || '—'
    const openingLabel = p.openingType || 'קבוע'
    lines.push(
      ``,
      `פנל ${i + 1}: ${p.label || ''}`,
      `  מידות:     ${p.width} × ${p.height} מ"מ`,
      `  שטח:       ${pr.area?.toFixed(3) || '—'} מ"ר`,
      `  זכוכית:    ${glassLabel}`,
      `  פתיחה:     ${openingLabel}`,
    )
  })

  lines.push(
    ``,
    `───────────────────────────────────────────`,
    `  סיכום`,
    `───────────────────────────────────────────`,
    `סה"כ שטח:     ${r.totalArea?.toFixed(3) || '—'} מ"ר`,
    `מספר פנלים:   ${panels.length}`,
    ``,
    `הערות: ${quote.notes || '—'}`,
    ``,
    `═══════════════════════════════════════════`,
    `  ONE MAN SHOW — מסמך ייצור`,
    `═══════════════════════════════════════════`,
  )

  return lines.join('\n')
}

// ─── Hardware List ────────────────────────────────────────────
export function generateHardwareList(quote, businessName = '') {
  const cfg = quote.config || {}
  const r   = quote.result  || {}

  const lines = [
    `═══════════════════════════════════════════`,
    `  רשימת פרזול`,
    `═══════════════════════════════════════════`,
    `תאריך:    ${NOW()}`,
    businessName ? `עסק:      ${businessName}` : '',
    `לקוח:     ${quote.clientName || '—'}`,
    ``,
    `───────────────────────────────────────────`,
    `  פריטים`,
    `───────────────────────────────────────────`,
    ``,
    `סוג פרזול:    ${r.hardwareLabel || cfg.hardwareSet || '—'}`,
    `כמות סטים:    1`,
    ``,
    `סוג פרופיל:   ${r.profileLabel  || cfg.profileType || '—'}`,
    `אורך פרופיל:  ${r.perimeterMeters?.toFixed(2) || '—'} מ"ל`,
    ``,
    `───────────────────────────────────────────`,
    `  עלות פרזול`,
    `───────────────────────────────────────────`,
    `פרזול:        ${formatCurrency(r.hardwareCost || 0)}`,
    `פרופיל:       ${formatCurrency(r.profileCost  || 0)}`,
    ``,
    `הערות: ${quote.notes || '—'}`,
    ``,
    `═══════════════════════════════════════════`,
    `  ONE MAN SHOW — רשימת פרזול`,
    `═══════════════════════════════════════════`,
  ].filter(Boolean)

  return lines.join('\n')
}

// ─── Client Summary ───────────────────────────────────────────
export function generateClientSummary(quote, businessName = '') {
  const r   = quote.result || {}
  const cfg = quote.config  || {}

  const lines = [
    `═══════════════════════════════════════════`,
    `  הצעת מחיר`,
    `═══════════════════════════════════════════`,
    businessName ? `מ:        ${businessName}` : '',
    `אל:       ${quote.clientName || '—'}`,
    `תאריך:    ${NOW()}`,
    quote.projectName ? `פרויקט:   ${quote.projectName}` : '',
    ``,
    `───────────────────────────────────────────`,
    `  פירוט עבודה`,
    `───────────────────────────────────────────`,
    ``,
    `מקלחון זכוכית — ${quote.panels?.length || 0} פנלים`,
    `סה"כ שטח: ${r.totalArea?.toFixed(2) || '—'} מ"ר`,
    ``,
  ].filter(Boolean)

  if (quote.panels?.length) {
    quote.panels.forEach((p, i) => {
      lines.push(`  • ${p.label || `פנל ${i+1}`}: ${p.width}×${p.height} מ"מ`)
    })
    lines.push('')
  }

  lines.push(
    `───────────────────────────────────────────`,
    `  תמחור`,
    `───────────────────────────────────────────`,
    ``,
    `זכוכית:                ${formatCurrency(r.glassSubtotal || 0)}`,
    `פרופיל ופרזול:         ${formatCurrency((r.profileCost || 0) + (r.hardwareCost || 0))}`,
    `התקנה:                 ${formatCurrency(r.installCost  || 0)}`,
  )

  if (r.discountAmount > 0) {
    lines.push(`הנחה (${cfg.discountPct}%):          − ${formatCurrency(r.discountAmount)}`)
  }

  lines.push(
    `מע"מ (${r.vatPct}%):              ${formatCurrency(r.vatAmount || 0)}`,
    ``,
    `───────────────────────────────────────────`,
    `  סה"כ לתשלום: ${formatCurrency(r.total || 0)}`,
    `───────────────────────────────────────────`,
    ``,
    quote.notes ? `הערות: ${quote.notes}` : '',
    ``,
    `תוקף הצעה: 30 יום`,
    ``,
    `═══════════════════════════════════════════`,
    businessName ? `  ${businessName}` : '  ONE MAN SHOW',
    `═══════════════════════════════════════════`,
  ).filter(Boolean)

  return lines.filter(l => l !== undefined).join('\n')
}

// ─── Installer Brief ──────────────────────────────────────────
export function generateInstallerBrief(quote, appointment = null, businessName = '') {
  const panels = quote.panels || []

  const lines = [
    `═══════════════════════════════════════════`,
    `  הוראות התקנה`,
    `═══════════════════════════════════════════`,
    `תאריך:      ${NOW()}`,
    businessName ? `עסק:        ${businessName}` : '',
    `לקוח:       ${quote.clientName || '—'}`,
    quote.projectName ? `פרויקט:     ${quote.projectName}` : '',
    appointment ? `מועד התקנה: ${appointment}` : '',
    ``,
    `───────────────────────────────────────────`,
    `  מידות להתקנה`,
    `───────────────────────────────────────────`,
    ``,
  ].filter(Boolean)

  panels.forEach((p, i) => {
    const openingLabel = {
      fixed: 'קבוע', hinged: 'צירים', sliding: 'הזזה', pivot: 'ציר מרכזי', folding: 'קיפול'
    }[p.openingType] || p.openingType || 'קבוע'

    lines.push(
      `פנל ${i + 1}: ${p.label || ''}`,
      `  רוחב:   ${p.width} מ"מ`,
      `  גובה:   ${p.height} מ"מ`,
      `  זכוכית: ${p.glassType?.replace(/_/g, ' ') || '—'}`,
      `  פתיחה:  ${openingLabel}`,
      ``,
    )
  })

  lines.push(
    `───────────────────────────────────────────`,
    `  פרופיל`,
    `───────────────────────────────────────────`,
    `סוג: ${quote.result?.profileLabel || quote.config?.profileType || '—'}`,
    ``,
    `───────────────────────────────────────────`,
    `  הערות מיוחדות`,
    `───────────────────────────────────────────`,
    quote.notes || 'אין הערות מיוחדות',
    ``,
    `═══════════════════════════════════════════`,
    `  ONE MAN SHOW — מסמך התקנה`,
    `═══════════════════════════════════════════`,
  )

  return lines.join('\n')
}

// ─── CSV for glass production ────────────────────────────────
export function generateGlassCSV(quote) {
  const panels = quote.panels || []
  const header = 'פנל,רוחב (מ"מ),גובה (מ"מ),שטח (מ"ר),סוג זכוכית,סוג פתיחה'
  const rows = panels.map((p, i) => {
    const pr = quote.result?.panelResults?.[i] || {}
    return [
      p.label || `פנל ${i+1}`,
      p.width,
      p.height,
      pr.area?.toFixed(3) || '',
      p.glassType || '',
      p.openingType || '',
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

// ─── Download helper (browser) ───────────────────────────────
export function downloadTextFile(content, filename) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCSV(content, filename) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
