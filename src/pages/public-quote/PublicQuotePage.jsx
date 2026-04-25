// src/pages/public-quote/PublicQuotePage.jsx
// Public quote view — no auth required, accessible via shared link

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicQuote, approvePublicQuote } from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'
import {
  buildCustomerLayout, ShowerCard, RegularItemsTable,
  InstallationLines, TotalsBlock,
} from '@/components/quote-builder/CustomerLayout'

export default function PublicQuotePage() {
  const params                    = useParams()
  // Support both /p/:uid/:id (new) and /p/:id (legacy)
  const uid                       = params.uid || null
  const id                        = params.id
  const [quote, setQuote]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved]   = useState(false)

  useEffect(() => {
    if (!id) return
    // uid not required — getPublicQuote reads from publicQuotes by id only
    getPublicQuote(uid, id).then(data => {
      if (data) { setQuote(data); if (data.clientApproved) setApproved(true) }
      else      setNotFound(true)
      setLoading(false)
    }).catch(() => { setNotFound(true); setLoading(false) })
  }, [id])   // eslint-disable-line

  const handleApprove = async () => {
    setApproving(true)
    try {
      // uid comes from URL param, or from document data as fallback
      const ownerUid = uid || quote?.uid
      if (!ownerUid) { setApproving(false); return }
      await approvePublicQuote(ownerUid, id)
      setApproved(true)
    } catch { /* ignore */ }
    setApproving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#3b82f6', animation: 'pulse 1.5s infinite' }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ fontSize: 48, margin: 0 }}>📋</p>
      <p style={{ color: '#64748b', marginTop: 16 }}>ההצעה לא נמצאה או פגה תוקפה</p>
    </div>
  )

  const r = quote.result || {}
  const layout = buildCustomerLayout(quote)
  const hasNewLayout = layout.showerCards.length > 0
                    || layout.regularLines.length > 0
                    || layout.installLines.length > 0

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; direction: rtl; }
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          #doc { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print" style={{ textAlign: 'center', padding: '16px 0 0', display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => window.print()}
          style={{
            background: '#0f2744', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 24px', fontSize: 14,
            fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', gap: 8,
          }}>
          📄 שמור כ-PDF
        </button>

        {approved ? (
          <div style={{
            background: '#dcfce7', color: '#16a34a', borderRadius: 10,
            padding: '10px 24px', fontSize: 14, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            ✓ ההצעה אושרה
          </div>
        ) : (
          <button
            onClick={handleApprove}
            disabled={approving}
            style={{
              background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 24px', fontSize: 14,
              fontWeight: 600, cursor: approving ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              opacity: approving ? 0.7 : 1,
            }}>
            {approving ? 'מאשר...' : '✅ אני מאשר את ההצעה'}
          </button>
        )}
      </div>

      {/* Quote document */}
      <div id="doc" style={{
        maxWidth: 680, margin: '20px auto 40px',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0f2744 0%,#1a4a7a 100%)', padding: '28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
              {quote.bizLogoUrl && (
                <img src={quote.bizLogoUrl} alt="לוגו"
                     style={{ width: 60, height: 60, borderRadius: 10, background: '#fff', padding: 6, objectFit: 'contain', flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {quote.bizName || 'ONE MAN SHOW'}
                </p>
                {quote.bizVatId && (
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 3, direction: 'ltr' }}>
                    ע.מ / ח.פ {quote.bizVatId}
                  </p>
                )}
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                  {quote.bizPhone     && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>📞 {quote.bizPhone}</span>}
                  {quote.bizPhone2    && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>📞 {quote.bizPhone2}</span>}
                  {quote.bizWhatsapp  && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>💬 {quote.bizWhatsapp}</span>}
                  {quote.bizEmail     && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>✉️ {quote.bizEmail}</span>}
                  {quote.bizWebsite   && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>🌐 {quote.bizWebsite}</span>}
                  {quote.bizAddress   && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>📍 {quote.bizAddress}</span>}
                  {quote.bizInstagram && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>📷 {quote.bizInstagram}</span>}
                  {quote.bizFacebook  && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>f {quote.bizFacebook}</span>}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'left', flexShrink: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: '0.15em' }}>הצעת מחיר</p>
              <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginTop: 3, fontFamily: 'monospace' }}>
                #{quote.quoteNum || id?.slice(0,8).toUpperCase()}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 8 }}>
                {quote.dateStr || ''}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Client + project */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <p style={labelSt}>לכבוד</p>
              <p style={{ fontWeight: 700, fontSize: 17, color: '#0f172a', marginBottom: 5 }}>{quote.clientName || '—'}</p>
              {quote.clientPhone   && <p style={metaSt}>📞 {quote.clientPhone}</p>}
              {quote.clientAddress && <p style={metaSt}>📍 {quote.clientAddress}</p>}
            </div>
            <div style={{ minWidth: 150, textAlign: 'left' }}>
              <p style={labelSt}>נושא</p>
              <p style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                {quote.projectName || quote.title || '—'}
              </p>
              {quote.complexity && <p style={{ ...metaSt, marginTop: 4 }}>{quote.complexity}</p>}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0' }} />

          {/* Customer-facing layout — same component used by QuoteViewPage */}
          {hasNewLayout ? (
            <>
              {layout.showerCards.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {layout.showerCards.map(card => <ShowerCard key={card.key} card={card} />)}
                </div>
              )}
              <RegularItemsTable rows={layout.regularLines} />
              <InstallationLines lines={layout.installLines} />
              <TotalsBlock layout={layout} />
            </>
          ) : (
            // Legacy fallback for quotes saved before measurementSnapshots
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ minWidth: 260, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                {r.glassSubtotal > 0 && <SumRow label="זכוכית"    val={formatCurrency(r.glassSubtotal)} />}
                {r.profileCost   > 0 && <SumRow label="פרופיל"    val={formatCurrency(r.profileCost)} />}
                {r.hardwareCost  > 0 && <SumRow label="פרזול"     val={formatCurrency(r.hardwareCost)} />}
                {r.discountAmount > 0 && <SumRow label="הנחה" val={`− ${formatCurrency(r.discountAmount)}`} green />}
                {!r.glassSubtotal && r.preTax > 0 && (
                  <>
                    <SumRow label="סכום לפני מע״מ" val={formatCurrency(r.preTax)} />
                    <SumRow label='מע"מ 18%'        val={formatCurrency((r.total || 0) - (r.preTax || 0))} />
                  </>
                )}
                {!r.preTax && r.vatAmount > 0 && <SumRow label={`מע"מ ${r.vatPct || 18}%`} val={formatCurrency(r.vatAmount)} />}
                <div style={{ borderTop: '2px solid #0f2744', marginTop: 10, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>סה"כ לתשלום</span>
                  <span style={{ fontWeight: 900, fontSize: 22, color: '#0f2744', direction: 'ltr' }}>
                    {formatCurrency(r.total || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {quote.notes && (
            <>
              <div style={{ borderTop: '1px solid #e2e8f0' }} />
              <div>
                <p style={labelSt}>הערות</p>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>{quote.notes}</p>
              </div>
            </>
          )}

          {quote.bizFooterText && (
            <>
              <div style={{ borderTop: '1px solid #e2e8f0' }} />
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {quote.bizFooterText}
              </p>
            </>
          )}

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>⏱ תוקף ההצעה: 30 יום ממועד הנפקה</p>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>{quote.bizName || 'ONE MAN SHOW'}</p>
          </div>
        </div>
      </div>
    </>
  )
}

const labelSt = { fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }
const metaSt  = { fontSize: 13, color: '#64748b', marginTop: 2 }

// Used only by the legacy-format fallback below
function SumRow({ label, val, green }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: 500, color: green ? '#16a34a' : '#0f172a', direction: 'ltr' }}>{val}</span>
    </div>
  )
}

