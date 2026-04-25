// src/pages/supplier-confirm/SupplierConfirmPage.jsx
// Public, branded order document — supplier confirms "ready for delivery".
// Shows business (sender), supplier (recipient), items. No end-client personal info.

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getSupplierToken, confirmSupplierToken,
  getSupplierTokensByBookingToken, activateBookingToken,
} from '@/firebase/db'

export default function SupplierConfirmPage() {
  const { token }               = useParams()
  const [data,    setData]      = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [done, setDone]         = useState(false)

  useEffect(() => {
    if (!token) return
    getSupplierToken(token).then(d => {
      if (d) { setData(d); if (d.confirmed) setDone(true) }
      else   setNotFound(true)
      setLoading(false)
    })
  }, [token])

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await confirmSupplierToken(token)
      setDone(true)

      // If this supplier was the last one for a given booking — activate it
      if (data?.bookingTokenId) {
        const all = await getSupplierTokensByBookingToken(data.bookingTokenId)
        const allConfirmed = all.every(t => t.id === token || t.confirmed)
        if (allConfirmed) {
          await activateBookingToken(data.bookingTokenId)
        }
      }
    } catch (e) { console.error(e) }
    setConfirming(false)
  }

  if (loading) return <PageCenter><Spinner /></PageCenter>

  if (notFound) return (
    <PageCenter>
      <div style={cardSt}>
        <p style={{ fontSize: 48, margin: '0 0 16px' }}>❌</p>
        <p style={{ color: '#64748b', fontSize: 16 }}>הקישור לא נמצא או פג תוקפו</p>
      </div>
    </PageCenter>
  )

  const biz = data.biz || {}

  return (
    <div style={{ minHeight: '100dvh', background: '#f1f5f9', padding: 20, fontFamily: "'Heebo', system-ui, sans-serif", direction: 'rtl' }}>
      {/* Document */}
      <div style={{
        maxWidth: 680, margin: '20px auto',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)', overflow: 'hidden',
      }}>

        {/* ── Branded Header ─────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg,#0f2744 0%,#1a4a7a 100%)', padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
              {biz.logoUrl && (
                <img src={biz.logoUrl} alt="לוגו"
                     style={{ width: 56, height: 56, borderRadius: 10, background: '#fff', padding: 6, objectFit: 'contain', flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
                  {biz.name || 'ONE MAN SHOW'}
                </p>
                {biz.vatId && (
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '3px 0 0', direction: 'ltr' }}>
                    ע.מ / ח.פ {biz.vatId}
                  </p>
                )}
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                  {biz.phone    && <span style={miniSt}>📞 {biz.phone}</span>}
                  {biz.phone2   && <span style={miniSt}>📞 {biz.phone2}</span>}
                  {biz.whatsapp && <span style={miniSt}>💬 {biz.whatsapp}</span>}
                  {biz.email    && <span style={miniSt}>✉️ {biz.email}</span>}
                  {biz.website  && <span style={miniSt}>🌐 {biz.website}</span>}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'left', flexShrink: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: 0, letterSpacing: '0.15em' }}>
                {data.supplierKind === 'glass' ? 'סירטוט זכוכית' : 'הזמנה לספק'}
              </p>
              {data.projectRef && (
                <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '3px 0 0', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                  #{data.projectRef}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────── */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Recipient + project */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={labelSt}>לכבוד הספק</p>
              <p style={{ fontWeight: 700, fontSize: 17, color: '#0f172a', margin: '0 0 4px' }}>
                {data.supplierName || '—'}
              </p>
              {data.supplierPhone && (
                <p style={metaSt} dir="ltr">📞 {data.supplierPhone}</p>
              )}
            </div>
            {data.projectName && (
              <div style={{ minWidth: 150, textAlign: 'left' }}>
                <p style={labelSt}>פרויקט</p>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', margin: 0 }}>
                  {data.projectName}
                </p>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0' }} />

          {/* Glass cutting details (for glass supplier only) */}
          {data.supplierKind === 'glass' && data.shower && (
            <>
              <div>
                <p style={labelSt}>מפרט סירטוט</p>
                <div style={{
                  background: '#f8fafc', borderRadius: 12, padding: 14,
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10,
                  marginTop: 6,
                }}>
                  <SpecRow label="סוג מקלחון" value={SHOWER_TYPE_HEB[data.shower.type] || data.shower.type || '—'} />
                  <SpecRow label="פריסה"     value={data.shower.layout === 'corner' ? 'פינתי' : 'חזית'} />
                  <SpecRow label="עובי"       value={data.shower.thickness ? `${data.shower.thickness} מ"מ` : '—'} />
                  {data.shower.dims?.len1 != null && (
                    <SpecRow label="אורך" value={`${data.shower.dims.len1} ס"מ`} />
                  )}
                  {data.shower.layout === 'corner' && data.shower.dims?.len2 != null && (
                    <SpecRow label="אורך צד ב׳" value={`${data.shower.dims.len2} ס"מ`} />
                  )}
                  {data.shower.dims?.height != null && (
                    <SpecRow label="גובה" value={`${data.shower.dims.height} ס"מ`} />
                  )}
                  <SpecRow label="סוג זכוכית" value={data.shower.glass || '—'} />
                  {data.shower.options?.step      && <SpecRow label="מדרגה"         value="כן" />}
                  {data.shower.options?.harmonica && <SpecRow label="ארמוניקה"      value="כן" />}
                  {data.shower.options?.zz        && <SpecRow label="ציר ז/ז"       value="כן" />}
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0' }} />
            </>
          )}

          {/* Items */}
          <div>
            <p style={labelSt}>פריטים להזמנה</p>
            {data.orderItems?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thSt}>תיאור</th>
                    <th style={{ ...thSt, width: 100 }}>מידות</th>
                    <th style={{ ...thSt, textAlign: 'center', width: 60 }}>כמות</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orderItems.map((it, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '11px 0', color: '#0f172a', fontWeight: 500 }}>
                        {it.desc || it.name || '—'}
                      </td>
                      <td style={{ padding: '11px 0', color: '#64748b', direction: 'ltr' }}>
                        {it.dims || '—'}
                      </td>
                      <td style={{ padding: '11px 0', textAlign: 'center', color: '#0f172a', fontWeight: 600 }}>
                        {it.qty || 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap', marginTop: 6 }}>
                {data.items || 'אין פירוט'}
              </p>
            )}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0' }} />

          {/* Action: confirm ready for delivery */}
          {done ? (
            <div style={{
              background: '#dcfce7', border: '1px solid #86efac',
              borderRadius: 12, padding: 20, textAlign: 'center',
            }}>
              <p style={{ fontSize: 36, margin: '0 0 6px' }}>✅</p>
              <p style={{ color: '#15803d', fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>
                אישרת — הסחורה מוכנה ויוצאת להספקה
              </p>
              <p style={{ color: '#16a34a', fontSize: 13, margin: 0 }}>
                תודה. בעל העסק קיבל עדכון.
              </p>
            </div>
          ) : (
            <>
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: 12, padding: 14, fontSize: 13, color: '#1e40af', lineHeight: 1.6,
              }}>
                לחיצה על הכפתור תשלח ל{biz.name || 'בעל העסק'} אישור ש<b>הסחורה מוכנה ויצאה להספקה</b>.
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                style={{
                  background: '#16a34a', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '16px 24px', fontSize: 17,
                  fontWeight: 800, cursor: confirming ? 'wait' : 'pointer',
                  width: '100%', opacity: confirming ? 0.7 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {confirming ? 'שולח...' : '✅ אני מאשר — הסחורה מוכנה ויוצאת להספקה'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tiny helpers ─────────────────────────────────────────────
function PageCenter({ children }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f1f5f9', padding: 20, fontFamily: 'system-ui, sans-serif', direction: 'rtl',
    }}>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#3b82f6', animation: 'pulse 1.5s infinite' }} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </>
  )
}

const cardSt = {
  background: '#fff', borderRadius: 20, padding: '36px 32px',
  boxShadow: '0 4px 32px rgba(0,0,0,0.10)', maxWidth: 420, width: '100%',
  textAlign: 'center',
}

const labelSt = {
  fontSize: 10, fontWeight: 700, color: '#94a3b8',
  letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px',
}

const metaSt = { fontSize: 13, color: '#64748b', margin: '2px 0 0' }

const miniSt = { color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }

const thSt = {
  textAlign: 'right', padding: '0 0 10px',
  color: '#94a3b8', fontWeight: 600, fontSize: 11, letterSpacing: '0.1em',
}

const SHOWER_TYPE_HEB = {
  '1fixed1door':      'דופן + דלת',
  '2fixed1door':      '2 דופנות + דלת',
  '2doors':           '2 דלתות',
  '2fixed2doors':     '2 דופנות + 2 דלתות',
  '1fixed0door':      'דופן בלבד',
  '2fixed0door':      '2 דופנות בלבד',
  '0fixed1door':      'דלת בלבד',
  '0fixed1harmonica': 'דלת ארמוניקה בלבד',
}

function SpecRow({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.1em', margin: '0 0 2px' }}>
        {label}
      </p>
      <p style={{ fontSize: 14, color: '#0f172a', fontWeight: 600, margin: 0 }}>
        {value}
      </p>
    </div>
  )
}
