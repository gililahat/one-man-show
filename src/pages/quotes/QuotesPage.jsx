// src/pages/quotes/QuotesPage.jsx
import { useEffect, useState, useRef } from 'react'

function playClick(volume = 0.28) {
  try {
    const AC  = window.AudioContext || window['webkitAudioContext']
    const ctx = new AC()
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.055), ctx.sampleRate)
    const d   = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4)
    const src  = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = volume
    src.connect(gain); gain.connect(ctx.destination); src.start()
    src.onended = () => ctx.close()
  } catch { /* silent */ }
}
function haptic(ms = 12) { try { navigator.vibrate?.(ms) } catch {} }
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import useAuthStore from '@/store/authStore'
import { subscribeQuotes, updateQuote, deleteQuote, addProject } from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'

const STATUSES = [
  { key: 'draft',    label: 'טיוטה',       color: 'badge-neutral' },
  { key: 'sent',     label: 'נשלח',         color: 'badge-info'    },
  { key: 'approved', label: 'אושר',         color: 'badge-success' },
  { key: 'rejected', label: 'נדחה',         color: 'badge-danger'  },
  { key: 'expired',  label: 'פג תוקף',     color: 'badge-warning' },
]

export default function QuotesPage() {
  const uid                             = useAuthStore(s => s.uid())
  const navigate                        = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [quotes, setQuotes]             = useState([])
  const [filterStatus, setFilter]       = useState('all')
  const [selected, setSelected]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const [approveQuote, setApproveQuote] = useState(null)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeQuotes(uid, data => { setQuotes(data); setLoading(false) })
    return unsub
  }, [uid])

  // Auto-open a quote by ID (e.g. after creating from StandardProductsPage)
  useEffect(() => {
    const openId = searchParams.get('openId')
    if (!openId || quotes.length === 0) return
    const q = quotes.find(q => q.id === openId)
    if (q) { setSelected(q); setSearchParams({}) }
  }, [quotes, searchParams]) // eslint-disable-line

  const filtered = filterStatus === 'all'
    ? quotes
    : quotes.filter(q => q.status === filterStatus)

  const handleDelete = async (id) => {
    if (!confirm('למחוק הצעת מחיר זו?')) return
    await deleteQuote(uid, id)
    if (selected?.id === id) setSelected(null)
  }

  const handleStatusChange = async (id, status) => {
    // "sent" → "approved" goes through the dramatic switch overlay
    if (status === 'approved') {
      const q = quotes.find(q => q.id === id)
      if (q) { setApproveQuote(q); return }
    }
    await updateQuote(uid, id, { status })
    if (selected?.id === id) setSelected(s => ({ ...s, status }))
  }

  const handleApprovalConfirmed = async (quote) => {
    // Mark quote approved + create a linked project
    await updateQuote(uid, quote.id, { status: 'approved' })
    if (selected?.id === quote.id) setSelected(s => ({ ...s, status: 'approved' }))
    try {
      await addProject(uid, {
        title:      quote.projectName || quote.title || 'פרויקט חדש',
        clientId:   quote.clientId   || '',
        clientName: quote.clientName || '',
        status:     'approved',
        description: `מבוסס על הצעת מחיר: ${quote.title || ''}`,
      })
    } catch { /* project creation is best-effort */ }
    setApproveQuote(null)
    navigate('/projects')
  }

  // Totals
  const totalApproved = quotes
    .filter(q => q.status === 'approved')
    .reduce((s, q) => s + (q.result?.total || 0), 0)

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">הצעות מחיר</h1>
          <p className="text-sm text-ink-muted">{quotes.length} הצעות</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/clients')}>
          + הצעה חדשה
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniKpi label="הכל"     value={quotes.length}                              active={filterStatus==='all'}     onClick={() => setFilter('all')} />
        <MiniKpi label="טיוטות"  value={quotes.filter(q=>q.status==='draft').length} active={filterStatus==='draft'}   onClick={() => setFilter('draft')} />
        <MiniKpi label="ממתין"   value={quotes.filter(q=>q.status==='sent').length}  active={filterStatus==='sent'}    onClick={() => setFilter('sent')} />
        <MiniKpi label="אושרו"   value={formatCurrency(totalApproved)}              active={filterStatus==='approved'} onClick={() => setFilter('approved')} green />
      </div>

      {/* List — detail expands inline under the clicked card */}
      <div className="space-y-3">
        {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
          <EmptyState navigate={navigate} hasFilter={filterStatus !== 'all'} />
        ) : (
          filtered.map(q => (
            <div key={q.id} className="space-y-3">
              <QuoteCard quote={q}
                isSelected={selected?.id === q.id}
                onClick={() => setSelected(selected?.id === q.id ? null : q)}
                onDelete={() => handleDelete(q.id)}
                onStatusChange={(s) => handleStatusChange(q.id, s)}
                onCreateOrder={() => navigate(`/orders?quoteId=${q.id}&clientName=${encodeURIComponent(q.clientName||'')}&projectName=${encodeURIComponent(q.projectName||'')}&clientId=${q.clientId||''}&projectId=${q.projectId||''}`)}
                onCreateOutput={() => navigate(`/outputs?quoteId=${q.id}`)} />
              {selected?.id === q.id && (
                <QuoteDetail quote={selected} onClose={() => setSelected(null)}
                  navigate={navigate}
                  onDelete={() => handleDelete(selected.id)}
                  onStatusChange={(s) => handleStatusChange(selected.id, s)} />
              )}
            </div>
          ))
        )}
      </div>
      {/* Approval switch overlay */}
      {approveQuote && (
        <QuoteApprovalSwitch
          quote={approveQuote}
          onConfirm={() => handleApprovalConfirmed(approveQuote)}
          onCancel={() => setApproveQuote(null)}
        />
      )}
    </div>
  )
}

// ─── Quote approval switch (full-screen overlay) ──────────────
function QuoteApprovalSwitch({ quote, onConfirm, onCancel }) {
  const [on,       setOn]       = useState(false)
  const [vibrate,  setVibrate]  = useState(false)
  const [glowing,  setGlowing]  = useState(false)
  const [flashing, setFlashing] = useState(false)
  const fired = useRef(false)

  const handleFlip = () => {
    if (on || fired.current) return
    fired.current = true
    playClick()
    haptic(14)
    setOn(true)
    setTimeout(() => setVibrate(true),  80)
    setTimeout(() => setVibrate(false), 480)
    setTimeout(() => setGlowing(true),  120)
    setTimeout(() => setFlashing(true), 600)
    setTimeout(() => onConfirm(),       820)
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
         style={{ background: '#050505' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-500"
           style={{
             background: glowing
               ? 'radial-gradient(ellipse 55% 45% at 50% 60%, rgba(34,197,94,0.2) 0%, transparent 100%)'
               : 'transparent',
           }} />

      {/* White flash */}
      {flashing && (
        <div className="absolute inset-0 z-10 pointer-events-none"
             style={{ background: '#fff', animation: 'flashOut 700ms ease forwards' }} />
      )}

      <style>{`
        @keyframes flashOut { 0%{opacity:1} 30%{opacity:1} 100%{opacity:0} }
        @keyframes vibrate  {
          0%,100%{transform:translateX(0) rotate(0)}
          15%{transform:translateX(-5px) rotate(-1.5deg)}
          30%{transform:translateX(5px)  rotate(1.5deg)}
          45%{transform:translateX(-4px) rotate(-1deg)}
          60%{transform:translateX(4px)  rotate(1deg)}
          75%{transform:translateX(-2px) rotate(-0.5deg)}
          90%{transform:translateX(2px)  rotate(0.5deg)}
        }
      `}</style>

      {/* Label */}
      <p className="text-xs tracking-[0.35em] uppercase mb-10 transition-colors duration-500"
         style={{ color: on ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.25)' }}>
        {quote.clientName ? `${quote.clientName} — אישר` : 'הצעה אושרה'}
      </p>

      {/* Switch */}
      <div onClick={handleFlip}
           className="relative cursor-pointer select-none"
           style={{
             filter:    glowing ? 'drop-shadow(0 0 40px rgba(34,197,94,0.4))' : 'none',
             transition:'filter 500ms ease',
             animation: vibrate ? 'vibrate 400ms ease' : 'none',
           }}>

        {/* Plate */}
        <div className="relative rounded-[22px]"
             style={{
               width: 168, height: 272,
               background: 'linear-gradient(155deg,#1e1e1e,#0f0f0f)',
               boxShadow: glowing
                 ? '0 0 0 1px rgba(34,197,94,0.3), 0 30px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)'
                 : '0 30px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)',
               transition: 'box-shadow 500ms ease',
             }}>

          {/* Corner screws */}
          {[[14,14],[14,'auto'],[272-23,14],[272-23,'auto']].map(([t,r],i) => (
            <div key={i} className="absolute rounded-full"
                 style={{
                   top: typeof t==='number'?t:undefined,
                   bottom: typeof t==='number'&&t>100?undefined:undefined,
                   right: r==='auto'?14:undefined, left: r!=='auto'?14:undefined,
                   width:9, height:9,
                   background:'radial-gradient(circle at 35% 35%,#444,#1a1a1a)',
                   boxShadow:'0 1px 2px rgba(0,0,0,0.7)',
                 }} />
          ))}

          {/* Recess */}
          <div className="absolute rounded-[14px]"
               style={{ top:28,bottom:28,left:20,right:20,
                        background:'#050505',
                        boxShadow:'inset 0 3px 10px rgba(0,0,0,0.9)' }} />

          {/* Rocker */}
          <div className="absolute rounded-[10px] overflow-hidden"
               style={{
                 top:32,bottom:32,left:24,right:24,
                 background: on
                   ? 'linear-gradient(175deg,#22c55e 0%,#16a34a 55%,#166534 100%)'
                   : 'linear-gradient(175deg,#2c2c2c 0%,#181818 60%,#111 100%)',
                 boxShadow: on
                   ? '0 -6px 24px rgba(34,197,94,0.5), inset 0 2px 0 rgba(255,255,255,0.2)'
                   : '0 6px 16px rgba(0,0,0,0.6), inset 0 -2px 0 rgba(0,0,0,0.4)',
                 transformOrigin:'50% 50%',
                 transform: on ? 'perspective(300px) rotateX(-22deg)' : 'perspective(300px) rotateX(22deg)',
                 transition:'transform 300ms cubic-bezier(0.34,1.56,0.64,1),background 300ms ease,box-shadow 500ms ease',
               }}>
            <div className="absolute top-7 left-0 right-0 flex justify-center">
              <span style={{ fontSize:22, fontWeight:900, fontFamily:'monospace', color: on?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.18)' }}>I</span>
            </div>
            <div className="absolute bottom-7 left-0 right-0 flex justify-center">
              <span style={{ fontSize:18, fontWeight:900, fontFamily:'monospace', color: on?'rgba(0,0,0,0.3)':'rgba(255,255,255,0.14)' }}>O</span>
            </div>
            <div className="absolute left-4 right-4" style={{ top:'50%', height:2, borderRadius:1, background: on?'rgba(0,0,0,0.2)':'rgba(255,255,255,0.06)', transform:'translateY(-50%)' }} />
          </div>

          {/* LED */}
          <div className="absolute left-1/2 -translate-x-1/2 rounded-full"
               style={{
                 bottom:17, width:7, height:7,
                 background: on ? '#22c55e' : '#222',
                 boxShadow: on ? '0 0 6px #22c55e, 0 0 14px rgba(34,197,94,0.7)' : 'inset 0 1px 2px rgba(0,0,0,0.8)',
                 transition:'background 300ms,box-shadow 300ms',
               }} />

          <p className="absolute left-0 right-0 text-center"
             style={{ top:16, fontSize:6.5, letterSpacing:'0.25em', fontWeight:700, color:'rgba(255,255,255,0.12)' }}>
            ONE MAN SHOW
          </p>
        </div>
      </div>

      <p className="mt-10 text-xs tracking-wider transition-all duration-500"
         style={{ color: on ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.18)' }}>
        {on ? 'פרויקט נוצר...' : 'הרם להפעיל פרויקט'}
      </p>

      {/* Cancel */}
      {!on && (
        <button onClick={onCancel}
                className="absolute top-5 left-5 text-xs text-ink-subtle hover:text-ink transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-300">
          ← חזור
        </button>
      )}
    </div>
  )
}

// ─── Quote Card ───────────────────────────────────────────────
function QuoteCard({ quote, isSelected, onClick, onDelete, onStatusChange, onCreateOrder, onCreateOutput }) {
  const status  = STATUSES.find(s => s.key === quote.status) || STATUSES[0]
  const created = quote.createdAt?.toDate ? quote.createdAt.toDate() : new Date(quote.createdAt || Date.now())

  return (
    <div onClick={onClick}
         className={`card cursor-pointer transition-all hover:shadow-card
           ${isSelected ? 'ring-2 ring-brand-500 shadow-card' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink truncate">{quote.title || 'הצעת מחיר'}</p>
            <span className={`badge ${status.color}`}>{status.label}</span>
          </div>
          {quote.clientName && <p className="text-sm text-ink-muted mt-0.5">👤 {quote.clientName}</p>}
          <p className="text-xs text-ink-subtle mt-1">
            {format(created, 'd בMMM yyyy', { locale: he })}
          </p>
        </div>
        <div className="text-left shrink-0">
          <p className="font-bold text-ink text-lg">{formatCurrency(quote.result?.total || 0)}</p>
          <p className="text-xs text-ink-subtle">{quote.result?.totalArea?.toFixed(2)} מ"ר</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-surface-100">
        {quote.status === 'draft' && (
          <button className="btn-secondary text-xs" onClick={e => { e.stopPropagation(); onStatusChange('sent') }}>
            סמן כנשלח
          </button>
        )}
        {quote.status === 'sent' && (<>
          <button className="btn-primary text-xs" onClick={e => { e.stopPropagation(); onStatusChange('approved') }}>
            ✓ אושר
          </button>
          <button className="btn-ghost text-xs text-danger" onClick={e => { e.stopPropagation(); onStatusChange('rejected') }}>
            ✗ נדחה
          </button>
        </>)}
        {quote.status === 'approved' && (
          <button className="btn-primary text-xs" onClick={e => { e.stopPropagation(); onCreateOrder() }}>
            📦 צור הזמנה
          </button>
        )}
        {quote.status === 'approved' && (
          <button className="btn-secondary text-xs" onClick={e => { e.stopPropagation(); onCreateOutput() }}>
            📄 הפק פלט
          </button>
        )}
        <button className="btn-ghost text-xs text-danger mr-auto"
                onClick={e => { e.stopPropagation(); onDelete() }}>
          מחיקה
        </button>
      </div>
    </div>
  )
}

// ─── Quote Detail ─────────────────────────────────────────────
function QuoteDetail({ quote, onClose, onDelete, onStatusChange, navigate }) {
  const status                      = STATUSES.find(s => s.key === quote.status) || STATUSES[0]
  const r                           = quote.result || {}
  const [phoneInput, setPhoneInput] = useState('')

  return (
    <div className="card space-y-4 ring-2 ring-brand-400/30">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-ink">{quote.title}</h3>
          {quote.clientName && <p className="text-sm text-ink-muted">👤 {quote.clientName}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/quote/${quote.id}`)}
                  className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100 text-xs"
                  title="הצג כמסמך / PDF">
            📄
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100 text-xs">✕</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-muted">סטטוס:</span>
        <span className={`badge ${status.color}`}>{status.label}</span>
      </div>

      {/* Panels breakdown (calculator quotes) */}
      {quote.panels?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">פנלים</p>
          <div className="space-y-1.5">
            {quote.panels.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">{p.label || `פנל ${i+1}`} ({p.width}×{p.height})</span>
                <span className="font-medium text-ink">
                  {formatCurrency(quote.result?.panelResults?.[i]?.panelPrice || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items (standard-product quotes) */}
      {quote.items?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">פריטים</p>
          <div className="space-y-1.5">
            {quote.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">
                  {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                </span>
                <span className="font-medium text-ink">
                  {formatCurrency(item.price * (item.qty || 1))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed breakdown (only when relevant data exists) */}
      {(r.glassSubtotal > 0 || r.profileCost > 0 || r.hardwareCost > 0) && (
        <div className="rounded-xl bg-surface-50 p-3 space-y-2 text-sm">
          <DetailRow label="זכוכית"  value={formatCurrency(r.glassSubtotal || 0)} />
          <DetailRow label="פרופיל"  value={formatCurrency(r.profileCost   || 0)} />
          <DetailRow label="פרזול"   value={formatCurrency(r.hardwareCost  || 0)} />
          <DetailRow label="התקנה"  value={formatCurrency(r.installCost   || 0)} />
          {r.discountAmount > 0 && (
            <DetailRow label={`הנחה (${quote.config?.discountPct}%)`}
                       value={`− ${formatCurrency(r.discountAmount)}`} className="text-success" />
          )}
          <DetailRow label={`מע"מ (${r.vatPct}%)`} value={formatCurrency(r.vatAmount || 0)} />
        </div>
      )}

      {/* Total */}
      <div className="rounded-xl bg-surface-50 px-3 py-2.5 flex items-center justify-between font-bold text-sm">
        <span>סה"כ</span>
        <span className="text-brand-600 text-base">{formatCurrency(r.total || 0)}</span>
      </div>

      {quote.notes && (
        <div>
          <p className="text-xs font-semibold text-ink-muted mb-1">הערות</p>
          <p className="text-sm text-ink">{quote.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-1">
        {/* WhatsApp — always available on every quote */}
        {(() => {
          const phone   = quote.clientPhone || phoneInput
          const email   = quote.clientEmail || ''
          const msgText = `הצעת מחיר מ-ONE MAN SHOW\nלקוח: ${quote.clientName || ''}\nפרויקט: ${quote.projectName || quote.title || ''}\nסה"כ: ₪${(r.total || 0).toLocaleString()}`
          const waNum   = phone.replace(/[^0-9]/g, '').replace(/^0/, '972')
          const waHref  = waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(msgText)}` : null
          return (
            <div className="space-y-2">
              {!quote.clientPhone && (
                <input
                  type="tel"
                  placeholder="הכנס מספר טלפון לשליחה"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="input w-full text-right"
                  dir="ltr"
                />
              )}
              <div className={`grid gap-2 ${email ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {waHref ? (
                  <a href={waHref} target="_blank" rel="noopener noreferrer"
                     className="btn-primary text-sm text-center">
                    📱 ווצאפ
                  </a>
                ) : (
                  <button disabled className="btn-primary text-sm opacity-40 cursor-not-allowed">
                    📱 ווצאפ
                  </button>
                )}
                {email && (
                  <a href={`mailto:${email}?subject=${encodeURIComponent('הצעת מחיר')}&body=${encodeURIComponent(msgText)}`}
                     className="btn-secondary text-sm text-center">
                    📧 מייל
                  </a>
                )}
              </div>
            </div>
          )
        })()}
        {quote.status === 'draft' && (
          <button className="btn-secondary w-full text-sm" onClick={() => onStatusChange('sent')}>
            📤 סמן כנשלח ללקוח
          </button>
        )}
        {quote.status === 'sent' && (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary text-sm" onClick={() => onStatusChange('approved')}>✓ אושר</button>
            <button className="btn-secondary text-sm text-danger" onClick={() => onStatusChange('rejected')}>✗ נדחה</button>
          </div>
        )}
        {quote.status === 'approved' && (<>
          <button className="btn-primary w-full text-sm"
            onClick={() => navigate(`/orders?quoteId=${quote.id}&clientName=${encodeURIComponent(quote.clientName||'')}&projectName=${encodeURIComponent(quote.projectName||'')}&clientId=${quote.clientId||''}&projectId=${quote.projectId||''}`)}>
            📦 צור הזמנה לספק
          </button>
          <button className="btn-secondary w-full text-sm"
            onClick={() => navigate(`/outputs?quoteId=${quote.id}`)}>
            📄 הפק פלט
          </button>
        </>)}
        <button className="btn-ghost w-full text-sm text-danger" onClick={onDelete}>מחיקה</button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────
function DetailRow({ label, value, className }) {
  return (
    <div className={`flex items-center justify-between ${className || ''}`}>
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

function MiniKpi({ label, value, active, onClick, green }) {
  return (
    <button onClick={onClick}
      className={`card text-center py-3 transition-all hover:shadow-card
        ${active ? 'ring-2 ring-brand-500' : ''}`}>
      <p className={`text-lg font-bold ${green ? 'text-success' : 'text-ink'}`}>{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="card animate-pulse flex gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-200 rounded w-1/2" />
            <div className="h-3 bg-surface-100 rounded w-1/3" />
          </div>
          <div className="w-20 h-8 bg-surface-200 rounded" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ navigate, hasFilter }) {
  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <span className="text-5xl mb-4">📋</span>
      <p className="font-semibold text-ink mb-1">{hasFilter ? 'אין הצעות בסטטוס זה' : 'אין הצעות מחיר עדיין'}</p>
      <p className="text-sm text-ink-muted mb-5">בחר לקוח → צור מדידה → בנה הצעה</p>
      {!hasFilter && (
        <button className="btn-primary" onClick={() => navigate('/clients')}>
          בחר לקוח
        </button>
      )}
    </div>
  )
}
