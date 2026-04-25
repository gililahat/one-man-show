// src/pages/quote-view/QuoteViewPage.jsx
// Professional quote document — printable as PDF

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import useAuthStore from '@/store/authStore'
import {
  getQuote, subscribeQuote, updateQuote, publishQuote,
  getSuppliers, addOrder,
  generateToken, createSupplierToken, createBookingToken,
  subscribeSupplierTokensByQuote, getBookingSettings,
} from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'
import { publicOrigin } from '@/utils/publicUrl'
import RecordPaymentModal from '@/components/payments/RecordPaymentModal'
import { getClient } from '@/firebase/db'
import {
  buildCustomerLayout, ShowerCard, RegularItemsTable,
  InstallationLines, TotalsBlock,
} from '@/components/quote-builder/CustomerLayout'

export default function QuoteViewPage() {
  const { id }                              = useParams()
  const uid                                 = useAuthStore(s => s.uid())
  const profile                             = useAuthStore(s => s.profile)
  const navigate                            = useNavigate()
  const [quote,           setQuote]         = useState(null)
  const [loading,         setLoading]       = useState(true)
  const [phoneInput,      setPhoneInput]    = useState('')
  const [supplierTokens,  setSupplierTokens] = useState([])
  const [confirmingPay,   setConfirmingPay] = useState(false)
  const [paymentModal,    setPaymentModal]  = useState(false)
  const [clientExtId,     setClientExtId]   = useState(null)
  const [publishing,      setPublishing]    = useState(false)

  const bizName = profile?.profile?.businessName || 'ONE MAN SHOW'

  useEffect(() => {
    if (!uid || !id) return

    // Load immediately via getDoc (one-time, reliable)
    getQuote(uid, id).then(data => {
      setQuote(data)
      setLoading(false)
    }).catch(() => {
      setQuote(null)
      setLoading(false)
    })

    // Subscribe for live updates (clientApproved, paymentConfirmed)
    const unsub = subscribeQuote(
      uid, id,
      data => { setQuote(data); setLoading(false) },
      _err => { setLoading(false) }
    )
    return unsub
  }, [uid, id])

  // Pre-publish to publicQuotes as soon as quote loads — so share link is always ready
  useEffect(() => {
    if (!quote || !uid || !id) return
    const r       = quote.result || {}
    const phone   = quote.clientPhone || ''
    const created = quote.createdAt?.toDate ? quote.createdAt.toDate() : new Date()
    setPublishing(true)
    const biz = profile?.profile || {}
    publishQuote(uid, id, {
      bizName,
      bizLogoUrl:    biz.logoUrl    || '',
      bizVatId:      biz.vatId      || '',
      bizPhone:      biz.phone      || '',
      bizPhone2:     biz.phone2     || '',
      bizWhatsapp:   biz.whatsapp   || '',
      bizEmail:      biz.email      || '',
      bizWebsite:    biz.website    || '',
      bizAddress:    biz.address    || '',
      bizInstagram:  biz.instagram  || '',
      bizFacebook:   biz.facebook   || '',
      bizFooterText: biz.footerText || '',
      quoteNum:      id.slice(0, 8).toUpperCase(),
      dateStr:       format(created, 'd/M/yyyy'),
      title:         quote.title        || '',
      clientName:    quote.clientName   || '',
      clientPhone:   phone,
      clientAddress: quote.clientAddress || '',
      projectName:   quote.projectName  || '',
      complexity:    quote.complexity   || '',
      notes:         quote.notes        || '',
      items:         quote.items        || [],
      panels:        quote.panels       || [],
      result:        r,
    }).then(() => setPublishing(false)).catch(() => setPublishing(false))
  }, [quote?.id])  // eslint-disable-line

  // Subscribe to supplier tokens for this quote
  useEffect(() => {
    if (!id) return
    return subscribeSupplierTokensByQuote(id, setSupplierTokens)
  }, [id])

  // Resolve client's accounting external id (for linking new documents to the right customer)
  useEffect(() => {
    if (!uid || !quote?.clientId) return
    getClient(uid, quote.clientId).then(c => {
      if (c?.accounting?.externalId) setClientExtId(c.accounting.externalId)
    }).catch(() => {})
  }, [uid, quote?.clientId])

  const handlePaymentSaved = async (record) => {
    const existing = Array.isArray(quote.payments) ? quote.payments : []
    await updateQuote(uid, id, { payments: [...existing, record] })
  }

  const handleConfirmPayment = async () => {
    if (!uid || !quote) return
    setConfirmingPay(true)
    try {
      const [suppliers, bookingSettings] = await Promise.all([
        getSuppliers(uid),
        getBookingSettings(uid),
      ])
      const pickSupplier = (category) =>
        suppliers.find(s => s.active !== false && s.category === category && s.isPrimary)
        || suppliers.find(s => s.active !== false && s.category === category)

      const glassSup    = pickSupplier('זכוכית')
      const hardwareSup = pickSupplier('פרזול')

      const allItems      = quote.items || []
      const glassItems    = allItems.filter(it => it.name === 'זכוכית')
      const hardwareItems = allItems.filter(it => it.name !== 'זכוכית')

      const itemsStrFor = (items) => items.map(i => `${i.name} ×${i.qty || 1}`).join(', ')
      const projectRef  = (id || '').slice(0, 8).toUpperCase()
      const bizSnap     = profile?.profile || {}
      const bizPayload  = {
        name:      bizName,
        logoUrl:   bizSnap.logoUrl    || '',
        vatId:     bizSnap.vatId      || '',
        phone:     bizSnap.phone      || '',
        phone2:    bizSnap.phone2     || '',
        whatsapp:  bizSnap.whatsapp   || '',
        email:     bizSnap.email      || '',
        website:   bizSnap.website    || '',
        address:   bizSnap.address    || '',
        instagram: bizSnap.instagram  || '',
        facebook:  bizSnap.facebook   || '',
      }

      // Plan supplier orders: glass + hardware, skip empty
      const plan = [
        glassSup && glassItems.length > 0 && {
          kind:     'glass',
          supplier: glassSup,
          items:    glassItems,
          shower:   quote.shower || null,  // dimensions/type for glass cutting
        },
        hardwareSup && hardwareItems.length > 0 && {
          kind:     'hardware',
          supplier: hardwareSup,
          items:    hardwareItems,
          shower:   null,
        },
      ].filter(Boolean)

      // Booking token (covers whole job)
      const bookingToken = generateToken()
      await createBookingToken(bookingToken, {
        uid,
        quoteId:       id,
        projectId:     quote.projectId || '',
        clientName:    quote.clientName  || '',
        clientPhone:   quote.clientPhone || '',
        projectName:   quote.projectName || quote.title || '',
        suppliersTotal: plan.length,
        bookingConfig: bookingSettings || null,
      })

      const supplierTokenIds = []

      for (const p of plan) {
        const tok       = generateToken()
        const itemsStr  = itemsStrFor(p.items)
        const orderRef  = await addOrder(uid, {
          supplierId:    p.supplier.id,
          supplierName:  p.supplier.name,
          supplierPhone: p.supplier.phone || '',
          supplierEmail: p.supplier.email || '',
          supplierKind:  p.kind,
          quoteId:       id,
          projectId:     quote.projectId || '',
          projectName:   quote.projectName || quote.title || '',
          clientName:    quote.clientName  || '',
          items:         itemsStr,
          orderItems:    p.items,
          status:        'sent',
          autoSent:      true,
          confirmToken:  tok,
        })

        await createSupplierToken(tok, {
          uid,
          quoteId:        id,
          projectId:      quote.projectId || '',
          orderId:        orderRef.id,
          supplierName:   p.supplier.name,
          supplierPhone:  p.supplier.phone || '',
          supplierKind:   p.kind,
          items:          itemsStr,
          orderItems:     p.items,
          projectRef,
          projectName:    quote.projectName || quote.title || '',
          bookingTokenId: bookingToken,
          shower:         p.shower,        // glass supplier gets shower dims; hardware gets null
          biz:            bizPayload,
        })
        supplierTokenIds.push(tok)

        // WhatsApp to supplier (no client personal info)
        const confirmUrl = `${publicOrigin()}/sc/${tok}`
        const roleLabel  = p.kind === 'glass' ? 'זכוכית לייצור' : 'פרזול'
        const msg = [
          `שלום ${p.supplier.name},`,
          ``,
          `הזמנת ${roleLabel} מ-${bizName}`,
          `פרויקט: ${quote.projectName || quote.title || projectRef}`,
          `פרטי הזמנה מלאים בקישור:`,
          confirmUrl,
          ``,
          `כשהסחורה מוכנה — אשר בקישור.`,
        ].join('\n')
        const waNum = (p.supplier.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '972')
        if (waNum) window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank')
      }

      await updateQuote(uid, id, {
        paymentConfirmed:   true,
        status:             'approved',
        supplierTokenIds,
        bookingTokenId:     bookingToken,
        ordersAutoSent:     plan.length > 0,
      })
    } catch (e) {
      console.error(e)
      alert('שגיאה בשליחת הזמנות')
    }
    setConfirmingPay(false)
  }

  const handleSendSupplierWhatsApp = (token) => {
    const confirmUrl = `${publicOrigin()}/sc/${token.id}`
    const msg = [
      `שלום ${token.supplierName},`,
      ``,
      `הזמנה מ-${bizName}:`,
      `פרויקט: ${token.projectName || ''}`,
      `לקוח: ${token.clientName || ''}`,
      `פריטים: ${token.items || ''}`,
      ``,
      `כשהסחורה מוכנה — אשר כאן:`,
      confirmUrl,
    ].join('\n')
    const waNum = (token.supplierPhone || '').replace(/[^0-9]/g, '').replace(/^0/, '972')
    if (!waNum) { alert('לספק זה אין מספר טלפון'); return }
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleSendBookingLink = () => {
    if (!quote?.bookingTokenId || !quote?.clientPhone) return
    const bookingUrl = `${publicOrigin()}/book/${quote.bookingTokenId}`
    const msg = [
      `שלום ${quote.clientName || ''},`,
      ``,
      `הסחורה שלך מוכנה! 🎉`,
      `לתיאום התקנה — בחר/י תאריך ושעה:`,
      bookingUrl,
    ].join('\n')
    const waNum = quote.clientPhone.replace(/[^0-9]/g, '').replace(/^0/, '972')
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-xl bg-brand-600 animate-pulse" />
    </div>
  )
  if (!quote) return (
    <div className="card text-center py-16">
      <p className="text-ink-muted mb-4">הצעה לא נמצאה</p>
      <button className="btn-primary" onClick={() => navigate('/quotes')}>חזור להצעות</button>
    </div>
  )

  const r        = quote.result || {}
  const phone    = quote.clientPhone || phoneInput
  const waNum    = phone.replace(/[^0-9]/g, '').replace(/^0/, '972')
  const created  = quote.createdAt?.toDate ? quote.createdAt.toDate() : new Date()
  const quoteNum = id.slice(0, 8).toUpperCase()

  const greeting = [
    `שלום, קיבלת הצעת מחיר מ: ${bizName}`,
    ``,
    `לקוח: ${quote.clientName || ''}`,
    `פרויקט: ${quote.projectName || quote.title || ''}`,
    `מספר הצעה: ${quoteNum}`,
    `סה"כ: ₪${(r.total || 0).toLocaleString()}`,
    ``,
    `לפרטים נוספים צרו קשר`,
  ].join('\n')

  const publicUrl = `${publicOrigin()}/p/${uid}/${id}`
  const waText    = encodeURIComponent(`הצעת מחיר מ${bizName}:\n${publicUrl}`)
  const waUrl     = waNum ? `https://wa.me/${waNum}?text=${waText}` : null

  const handleWaClick = () => {
    if (!quote.clientPhone && phoneInput) updateQuote(uid, id, { clientPhone: phoneInput })
    if (quote.status === 'draft') updateQuote(uid, id, { status: 'sent' })
    publishQuote(uid, id, {
      bizName, quoteNum,
      dateStr:       format(created, 'd/M/yyyy'),
      title:         quote.title,
      clientName:    quote.clientName,
      clientPhone:   phone,
      clientAddress: quote.clientAddress,
      projectName:   quote.projectName,
      complexity:    quote.complexity,
      notes:         quote.notes,
      items:         quote.items  || [],
      panels:        quote.panels || [],
      result:        r,
    }).catch(e => console.error('publishQuote failed:', e))
  }

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`הצעת מחיר מ-${bizName}`)
    const body    = encodeURIComponent(greeting)
    window.open(`mailto:${quote.clientEmail || ''}?subject=${subject}&body=${body}`)
  }

  const handlePrint = () => window.print()

  // Customer-facing layout (showers as cards, installation as final lines)
  const layout = buildCustomerLayout(quote)
  const hasNewLayout = layout.showerCards.length > 0
                    || layout.regularLines.length > 0
                    || layout.installLines.length > 0

  return (
    <>
      {/* ── Print / PDF styles ────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, html { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          #quote-doc {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* ── Top action bar (hidden in print) ─────────────── */}
      <div className="no-print max-w-2xl mx-auto mb-4 flex items-center gap-2 flex-wrap">

        <button onClick={() => navigate(-1)}
                className="p-2 rounded-xl text-ink-subtle hover:bg-surface-100 transition-colors text-xl">
          ←
        </button>

        <div className="flex-1" />

        {/* Phone input if no stored phone */}
        {!quote.clientPhone && (
          <input
            type="tel" dir="ltr"
            placeholder="טלפון לווצאפ"
            value={phoneInput}
            onChange={e => setPhoneInput(e.target.value)}
            className="input text-sm"
            style={{ width: 148 }}
          />
        )}

        {/* WhatsApp */}
        {waUrl && !publishing ? (
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
             onClick={handleWaClick}
             className="btn-primary flex items-center gap-1.5 text-sm">
            <span style={{ fontSize: 16 }}>📱</span> ווצאפ
          </a>
        ) : (
          <button disabled className="btn-primary flex items-center gap-1.5 text-sm" style={{ opacity: 0.4 }}>
            <span style={{ fontSize: 16 }}>📱</span> {publishing ? '⏳' : 'ווצאפ'}
          </button>
        )}

        {/* Email */}
        {quote.clientEmail && (
          <button
            onClick={handleShareEmail}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <span style={{ fontSize: 16 }}>📧</span> מייל
          </button>
        )}

        {/* Print / PDF */}
        <button
          onClick={handlePrint}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <span style={{ fontSize: 16 }}>📄</span> PDF
        </button>

      </div>

      {/* ── Quote document ────────────────────────────────── */}
      <div id="quote-doc" dir="rtl"
           className="max-w-2xl mx-auto bg-white rounded-2xl overflow-hidden"
           style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.10)' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#0f2744 0%,#1a4a7a 100%)',
          padding: '28px 32px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
              {profile?.profile?.logoUrl && (
                <img src={profile.profile.logoUrl} alt="לוגו"
                     style={{ width: 60, height: 60, borderRadius: 10, background: '#fff', padding: 6, objectFit: 'contain', flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
                  {bizName}
                </p>
                {profile?.profile?.vatId && (
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '3px 0 0', letterSpacing: '0.05em', direction: 'ltr' }}>
                    ע.מ / ח.פ {profile.profile.vatId}
                  </p>
                )}
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                  {profile?.profile?.phone     && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>📞 {profile.profile.phone}</span>}
                  {profile?.profile?.phone2    && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>📞 {profile.profile.phone2}</span>}
                  {profile?.profile?.whatsapp  && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>💬 {profile.profile.whatsapp}</span>}
                  {profile?.profile?.email     && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>✉️ {profile.profile.email}</span>}
                  {profile?.profile?.website   && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>🌐 {profile.profile.website}</span>}
                  {profile?.profile?.address   && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>📍 {profile.profile.address}</span>}
                  {profile?.profile?.instagram && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>📷 {profile.profile.instagram}</span>}
                  {profile?.profile?.facebook  && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, direction: 'ltr' }}>f {profile.profile.facebook}</span>}
                </div>
              </div>
            </div>
            {/* Quote meta */}
            <div style={{ textAlign: 'left', flexShrink: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: 0, letterSpacing: '0.15em' }}>הצעת מחיר</p>
              <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '3px 0 0', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                #{quoteNum}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '8px 0 0' }}>
                {format(created, 'd בMMM yyyy', { locale: he })}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Client + project */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <p style={labelStyle}>לכבוד</p>
              <p style={{ fontWeight: 700, fontSize: 17, color: '#0f172a', margin: '0 0 5px' }}>
                {quote.clientName || '—'}
              </p>
              {quote.clientPhone   && <p style={metaStyle}>📞 {quote.clientPhone}</p>}
              {quote.clientAddress && <p style={metaStyle}>📍 {quote.clientAddress}</p>}
              {quote.clientEmail   && <p style={metaStyle}>✉️ {quote.clientEmail}</p>}
            </div>
            <div style={{ minWidth: 150, textAlign: 'left' }}>
              <p style={labelStyle}>נושא ההצעה</p>
              <p style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', margin: '0 0 4px' }}>
                {quote.projectName || quote.title || '—'}
              </p>
              {quote.complexity && (
                <p style={{ ...metaStyle, marginTop: 2 }}>{quote.complexity}</p>
              )}
            </div>
          </div>

          <Divider />

          {/* Customer-facing layout: shower cards + extras + installs + totals */}
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
            // Legacy fallback for older quotes saved before measurementSnapshots
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ minWidth: 260, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                {r.glassSubtotal > 0 && <SumRow label="זכוכית"  value={formatCurrency(r.glassSubtotal)} />}
                {r.profileCost   > 0 && <SumRow label="פרופיל"  value={formatCurrency(r.profileCost)}   />}
                {r.hardwareCost  > 0 && <SumRow label="פרזול"   value={formatCurrency(r.hardwareCost)}  />}
                {r.installCost   > 0 && <SumRow label="התקנה"   value={formatCurrency(r.installCost)}   />}
                {!r.glassSubtotal && r.preTax > 0 && (
                  <>
                    <SumRow label="סכום לפני מע״מ" value={formatCurrency(r.preTax)} />
                    <SumRow label='מע"מ 18%'        value={formatCurrency((r.total || 0) - (r.preTax || 0))} />
                  </>
                )}
                {r.discountAmount > 0 && (
                  <SumRow label={`הנחה (${quote.config?.discountPct || ''}%)`}
                          value={`− ${formatCurrency(r.discountAmount)}`} green />
                )}
                {!r.preTax && r.vatAmount > 0 && (
                  <SumRow label={`מע"מ ${r.vatPct || 18}%`} value={formatCurrency(r.vatAmount)} />
                )}
                <div style={{
                  borderTop: '2px solid #0f2744', marginTop: 10, paddingTop: 12,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>סה"כ לתשלום</span>
                  <span style={{ fontWeight: 900, fontSize: 22, color: '#0f2744', direction: 'ltr' }}>
                    {formatCurrency(r.total || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {quote.notes && (
            <>
              <Divider />
              <div>
                <p style={labelStyle}>הערות</p>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: 0 }}>{quote.notes}</p>
              </div>
            </>
          )}

          {/* Business footer text (תנאי תשלום / אחריות וכו') */}
          {profile?.profile?.footerText && (
            <>
              <Divider />
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {profile.profile.footerText}
              </p>
            </>
          )}

          {/* Footer */}
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
              ⏱ תוקף ההצעה: 30 יום ממועד הנפקה
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
              {bizName}
            </p>
          </div>

        </div>
      </div>

      {/* ── Approval / payment status panel ─────────────── */}
      <div className="no-print max-w-2xl mx-auto mt-4 space-y-3">

        {/* Status badges row */}
        {(quote.status === 'sent' || quote.status === 'approved' || quote.clientApproved || quote.paymentConfirmed) && (
          <div className="card flex flex-wrap gap-3 items-center">
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg ${quote.clientApproved ? 'bg-success/10 text-success' : 'bg-surface-100 text-ink-muted'}`}>
              {quote.clientApproved ? '✓ לקוח אישר' : '⏳ ממתין לאישור לקוח'}
            </div>
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg ${quote.paymentConfirmed ? 'bg-success/10 text-success' : 'bg-surface-100 text-ink-muted'}`}>
              {quote.paymentConfirmed ? '✓ תשלום אושר' : '⏳ ממתין לאישור תשלום'}
            </div>

            {/* Supplier token statuses */}
            {supplierTokens.map(st => (
              <div key={st.id} className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg ${st.confirmed ? 'bg-brand-50 text-brand-700' : 'bg-surface-100 text-ink-muted'}`}>
                {st.confirmed ? `✓ ${st.supplierName} אישר` : `⏳ ${st.supplierName} — ממתין`}
              </div>
            ))}
          </div>
        )}

        {/* Payment confirm button */}
        {quote.clientApproved && !quote.paymentConfirmed && (
          <button
            className="btn-primary w-full text-sm"
            disabled={confirmingPay}
            onClick={handleConfirmPayment}
          >
            {confirmingPay ? 'שולח הזמנות...' : '💳 אשר קבלת תשלום ← שלח הזמנות לספקים'}
          </button>
        )}

        {/* Record payment + issue accounting document */}
        {quote.clientApproved && (
          <button
            className="btn-secondary w-full text-sm"
            onClick={() => setPaymentModal(true)}
          >
            🧾 רשום תשלום והנפק מסמך
          </button>
        )}

        {/* Existing payment records */}
        {Array.isArray(quote.payments) && quote.payments.length > 0 && (
          <div className="card space-y-2">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">תשלומים ומסמכים</p>
            {quote.payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-surface-300 pb-2 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-ink">{formatCurrency(p.amount)}</div>
                  <div className="text-xs text-ink-subtle">
                    {p.accounting?.documentNumber ? `מסמך ${p.accounting.documentNumber}` : 'תשלום נרשם'} · {new Date(p.date).toLocaleDateString('he-IL')}
                  </div>
                </div>
                {p.accounting?.pdfUrl && (
                  <a href={p.accounting.pdfUrl} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                    PDF ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Manual re-send to supplier (if not yet confirmed) */}
        {quote.paymentConfirmed && supplierTokens.filter(t => !t.confirmed).map(t => (
          <button
            key={t.id}
            className="btn-secondary w-full text-sm"
            onClick={() => handleSendSupplierWhatsApp(t)}
          >
            📲 שלח לספק {t.supplierName} בוואטסאפ
          </button>
        ))}

        {/* Send booking link button */}
        {quote.paymentConfirmed && supplierTokens.length > 0 && supplierTokens.every(t => t.confirmed) && (
          <button
            className="btn-primary w-full text-sm"
            onClick={handleSendBookingLink}
          >
            📅 שלח ללקוח ← תאם התקנה
          </button>
        )}

        {/* Manual send booking if no suppliers */}
        {quote.paymentConfirmed && supplierTokens.length === 0 && quote.bookingTokenId && (
          <button
            className="btn-secondary w-full text-sm"
            onClick={handleSendBookingLink}
          >
            📅 שלח ללקוח ← תאם התקנה
          </button>
        )}
      </div>

      {/* ── Bottom nav (hidden in print) ─────────────────── */}
      <div className="no-print max-w-2xl mx-auto mt-3 flex gap-2">
        <button className="btn-ghost text-sm text-ink-muted flex-1"
                onClick={() => navigate('/quotes')}>
          כל הצעות המחיר
        </button>
      </div>

      {/* bottom padding for mobile */}
      <div className="h-8" />

      {/* Record payment modal */}
      {paymentModal && (
        <RecordPaymentModal
          uid={uid}
          quote={quote}
          clientExternalId={clientExtId}
          onSaved={handlePaymentSaved}
          onClose={() => setPaymentModal(false)}
        />
      )}
    </>
  )
}

// ─── Tiny helpers ─────────────────────────────────────────────
const labelStyle = {
  fontSize: 10, fontWeight: 700, color: '#94a3b8',
  letterSpacing: '0.15em', margin: '0 0 8px', textTransform: 'uppercase',
}
const metaStyle = { fontSize: 13, color: '#64748b', margin: '2px 0 0' }

function Divider() {
  return <div style={{ borderTop: '1px solid #e2e8f0' }} />
}

function SumRow({ label, value, green }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ fontWeight: 500, color: green ? '#16a34a' : '#0f172a', direction: 'ltr' }}>{value}</span>
    </div>
  )
}
