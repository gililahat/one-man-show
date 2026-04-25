// src/pages/dashboard/DashboardPage.jsx
// Main screen — electrical switch workflow
// Switch 1 → new client form → Switch 2 → calculator (quote)

import { useState, useEffect, useRef } from 'react'

/* ─── Switch feedback ────────────────────────────────────────
   Synthetic mechanical click via Web Audio (no file needed).
   Falls back silently if AudioContext is unavailable.
──────────────────────────────────────────────────────────── */
function playClick(volume = 0.28) {
  try {
    const AC   = window.AudioContext || window['webkitAudioContext']
    const ctx  = new AC()
    const dur  = 0.055  // 55 ms
    const buf  = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      // White noise with sharp exponential decay → mechanical "click"
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4)
    }
    const src  = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = volume
    src.connect(gain)
    gain.connect(ctx.destination)
    src.start()
    src.onended = () => ctx.close()
  } catch { /* silently ignore */ }
}

function haptic(ms = 12) {
  try { navigator.vibrate?.(ms) } catch { /* not available */ }
}
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { addClient } from '@/firebase/db'

/* ─── Phase machine ──────────────────────────────────────────
   switch1 → flash → client-form → flash → calculator (with client)
──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const uid      = useAuthStore(s => s.uid())
  const navigate = useNavigate()

  const [phase,    setPhase] = useState('switch1')
  const [flashing, setFlash] = useState(false)
  const pendingRef = useRef(null)

  const flash = (cb) => { pendingRef.current = cb; setFlash(true) }
  const onFlashMid  = () => { pendingRef.current?.(); pendingRef.current = null }
  const onFlashDone = () => setFlash(false)

  const handleSwitch1 = () =>
    flash(() => setPhase('client-form'))

  const handleClientDone = async (formData) => {
    let clientId = null
    try {
      if (uid) {
        const ref = await addClient(uid, { ...formData, active: true })
        clientId = ref.id
      }
    } catch { /* proceed anyway */ }

    const params = new URLSearchParams()
    if (clientId)            params.set('clientId',   clientId)
    if (formData.name)       params.set('clientName', formData.name)
    if (formData.phone)      params.set('phone',      formData.phone)
    if (formData.address)    params.set('address',    formData.address)
    if (formData.complexity) params.set('complexity', formData.complexity)
    const q = params.toString() ? `?${params.toString()}` : ''

    const dest = formData.complexity === 'סטנדרט'
      ? `/standard-products${q}`
      : (clientId ? `/clients/${clientId}` : '/clients')

    flash(() => navigate(dest))
  }

  return (
    <div className="fixed inset-0 overflow-hidden z-[60]" style={{ direction: 'rtl' }}>
      {phase === 'switch1'     && <SwitchScreen onActivate={handleSwitch1} />}
      {phase === 'client-form' && <ClientForm   onDone={handleClientDone}  />}

      {flashing && <FlashOverlay onMid={onFlashMid} onDone={onFlashDone} />}
    </div>
  )
}

/* ─── White flash overlay ─────────────────────────────────── */
function FlashOverlay({ onMid, onDone }) {
  const [opacity, setOpacity] = useState(0)
  const midFired = useRef(false)

  useEffect(() => {
    // Frame 1: fade in to white (150ms)
    const raf = requestAnimationFrame(() => setOpacity(1))

    // At peak: switch content underneath
    const t1 = setTimeout(() => {
      if (!midFired.current) { midFired.current = true; onMid() }
      // start fade out
      setOpacity(0)
    }, 220)

    // Done fading out
    const t2 = setTimeout(onDone, 950)

    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2) }
  }, []) // eslint-disable-line

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-none"
      style={{
        background: '#ffffff',
        opacity,
        transition: opacity === 1
          ? 'opacity 150ms ease-in'
          : 'opacity 700ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  )
}

/* ─── Switch screen ───────────────────────────────────────── */
function SwitchScreen({ onActivate }) {
  const [on,    setOn]    = useState(false)
  const fired = useRef(false)

  const handleFlip = () => {
    if (on || fired.current) return
    fired.current = true
    playClick()
    haptic(14)
    setOn(true)
    setTimeout(() => onActivate(), 850)
  }

  return (
    <div
      onClick={handleFlip}
      style={{
        position: 'fixed', inset: 0, zIndex: 61,
        width: '100%', height: '100vh',
        background: '#0b0b0b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 260,
          height: 360,
          background: 'linear-gradient(145deg, #2a2a2a, #111)',
          borderRadius: 20,
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Indicator Light */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: on ? '#00ff88' : '#333',
            boxShadow: on ? '0 0 10px #00ff88, 0 0 20px #00ff88' : 'none',
            transition: 'all 0.2s',
          }}
        />

        {/* Lever */}
        <div
          style={{
            width: 80,
            height: 160,
            background: '#111',
            borderRadius: 20,
            display: 'flex',
            alignItems: on ? 'flex-start' : 'flex-end',
            justifyContent: 'center',
            padding: 10,
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #555, #111)',
              boxShadow: '0 5px 10px rgba(0,0,0,0.8), inset 0 2px 5px rgba(255,255,255,0.1)',
              transition: 'all 0.2s ease',
            }}
          />
        </div>

        {/* Text */}
        <div
          style={{
            textAlign: 'center',
            color: on ? '#00ff88' : '#F5C518',
            fontWeight: 'bold',
            fontSize: 22,
            transition: 'all 0.2s',
          }}
        >
          {on ? 'לקוח פעיל' : 'לקוח חדש'}
        </div>

        {/* ON / OFF */}
        <div
          style={{
            fontSize: 18,
            color: on ? '#00ff88' : '#ff9900',
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          {on ? 'ON' : 'OFF'}
        </div>
      </div>
    </div>
  )
}


/* ─── Selection lists ─────────────────────────────────────── */
const COMPLEXITY_TYPES = [
  { key: 'סטנדרט',        icon: '▭', sub: 'מלאי רגיל'             },
  { key: 'ייצור אישי',    icon: '✦', sub: 'מידות מיוחדות'          },
  { key: 'עבודה מורכבת',  icon: '⚙', sub: 'פרויקט מותאם אישית'     },
]

/* ─── Client form — one continuous flow ──────────────────── */
function ClientForm({ onDone }) {
  const [form,     setForm]     = useState({ name: '', phone: '', email: '', address: '' })
  const [stage,    setStage]    = useState('form') // 'form' | 'complexity'
  const [hasFocus, setHasFocus] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const nameRef  = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 150) }, [])

  const allFilled = form.name.trim() && form.phone.trim() && form.address.trim()

  // Auto-advance: only when all filled + no active field (keyboard closed)
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (allFilled && stage === 'form' && !hasFocus) {
      timerRef.current = setTimeout(() => {
        document.activeElement?.blur()
        setStage('complexity')
      }, 3500)
    }
    return () => clearTimeout(timerRef.current)
  }, [allFilled, stage, hasFocus])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const focusHandlers = {
    onFocus: () => setHasFocus(true),
    onBlur:  () => setHasFocus(false),
  }

  const advance = (to) => { clearTimeout(timerRef.current); document.activeElement?.blur(); setStage(to) }

  const goNext = () => {
    if (stage === 'form' && allFilled) advance('complexity')
  }
  const goBack = () => {
    if (stage === 'complexity') setStage('form')
  }

  const handleComplexity = async (type) => {
    if (loading) return
    setLoading(true)
    await onDone({ ...form, complexity: type })
    setLoading(false)
  }

  const canBack = stage === 'complexity'
  const canNext = stage === 'form' && allFilled && !hasFocus

  const inputStyle = (val) => ({
    width: '100%', padding: '13px 16px', borderRadius: 14, fontSize: 15,
    border: `2px solid ${val.trim() ? '#111' : 'transparent'}`,
    background: '#fff', outline: 'none',
    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
    transition: 'border-color 180ms', boxSizing: 'border-box',
    color: '#111', fontWeight: 500,
  })

  const panelStyle = (visible, fromRight) => ({
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '0 22px',
    opacity:   visible ? 1 : 0,
    transform: visible ? 'translateX(0)' : fromRight ? 'translateX(60px)' : 'translateX(-60px)',
    transition: 'opacity 280ms ease, transform 280ms ease',
    pointerEvents: visible ? 'auto' : 'none',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 61,
      background: '#f5f5f5',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: 'Arial, sans-serif', direction: 'rtl',
    }}>

      {/* ── Summary bar — always visible, fills up progressively ── */}
      <div style={{
        background: '#111', padding: '13px 20px 12px',
        minHeight: 62, flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        {form.name ? (
          <>
            <p style={{ fontWeight: 800, fontSize: 16, color: '#fff', margin: 0 }}>{form.name}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
              {form.phone   && <span style={{ fontSize: 12, color: '#777' }} dir="ltr">{form.phone}</span>}
              {form.address && <span style={{ fontSize: 12, color: '#777' }}>{form.address}</span>}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#444', margin: 0 }}>לקוח חדש</p>
        )}
      </div>

      {/* ── Dynamic content ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* STAGE: form */}
        <div style={panelStyle(stage === 'form', false)}>
          <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input ref={nameRef} type="text" placeholder="שם מלא *"
              value={form.name} onChange={set('name')}
              style={inputStyle(form.name)} {...focusHandlers}
              onFocus={e => { setHasFocus(true); e.target.style.borderColor = '#111' }}
              onBlur={e => { setHasFocus(false); e.target.style.borderColor = form.name.trim() ? '#111' : 'transparent' }}
            />
            <input type="tel" dir="ltr" placeholder="טלפון"
              value={form.phone} onChange={set('phone')}
              style={inputStyle(form.phone)}
              onFocus={e => { setHasFocus(true); e.target.style.borderColor = '#111' }}
              onBlur={e => { setHasFocus(false); e.target.style.borderColor = form.phone.trim() ? '#111' : 'transparent' }}
            />
            <div>
              <input type="email" dir="ltr" placeholder="אימייל"
                value={form.email} onChange={set('email')}
                style={inputStyle(form.email)}
                onFocus={e => { setHasFocus(true); e.target.style.borderColor = '#111' }}
                onBlur={e => { setHasFocus(false); e.target.style.borderColor = form.email.trim() ? '#111' : 'transparent' }}
              />
              <p style={{ fontSize: 11, color: '#bbb', margin: '4px 0 0 4px' }}>(למי שאין וואצאפ)</p>
            </div>
            <input type="text" placeholder="כתובת מגורים"
              value={form.address} onChange={set('address')}
              style={inputStyle(form.address)}
              onFocus={e => { setHasFocus(true); e.target.style.borderColor = '#111' }}
              onBlur={e => { setHasFocus(false); e.target.style.borderColor = form.address.trim() ? '#111' : 'transparent' }}
            />
          </div>
          {/* waiting indicator — appears only after blur + all filled */}
          <div style={{
            marginTop: 20, height: 3, width: 40, borderRadius: 2,
            background: '#111',
            opacity: (allFilled && !hasFocus && stage === 'form') ? 1 : 0,
            transition: 'opacity 600ms ease',
          }} />
        </div>

        {/* STAGE: complexity */}
        <div style={{
          ...panelStyle(stage === 'complexity', stage === 'form'),
          justifyContent: 'center', gap: 10, padding: '16px 22px',
          alignItems: 'stretch',
        }}>
          <p style={{ textAlign: 'center', fontWeight: 800, fontSize: 14, color: '#888', marginBottom: 6 }}>
            סוג העבודה
          </p>
          {COMPLEXITY_TYPES.map((ct, i) => (
            <SelectBtn key={ct.key} icon={ct.icon} label={ct.key} sub={ct.sub}
              visible={stage === 'complexity'} index={i}
              onClick={() => handleComplexity(ct.key)} disabled={loading} />
          ))}
        </div>

      </div>

      {/* ── Navigation arrows ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 24px 28px', flexShrink: 0,
      }}>
        <NavArrow dir="back" active={canBack} onClick={goBack} />
        <NavArrow dir="next" active={canNext} onClick={goNext} />
      </div>
    </div>
  )
}

function SelectBtn({ icon, label, sub, visible, index, onClick, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '15px 18px', borderRadius: 14,
        background: '#fff', border: '2px solid #e8e8e8',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer', textAlign: 'right',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-16px)',
        transition: `opacity 240ms ease ${index * 55 + 60}ms, transform 240ms ease ${index * 55 + 60}ms, background 100ms`,
        width: '100%',
      }}
      onTouchStart={e => e.currentTarget.style.background = '#f0f0f0'}
      onTouchEnd={e => e.currentTarget.style.background = '#fff'}
      onMouseDown={e => e.currentTarget.style.background = '#f0f0f0'}
      onMouseUp={e => e.currentTarget.style.background = '#fff'}
    >
      <span style={{
        width: 38, height: 38, borderRadius: 10, background: '#111', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        color: '#fff',
      }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: 16, color: '#111', margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#bbb', margin: '2px 0 0' }}>{sub}</p>}
      </div>
      <span style={{ color: '#ccc', fontSize: 20 }}>›</span>
    </button>
  )
}

function NavArrow({ dir, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 46, height: 46, borderRadius: '50%',
      background: active ? '#111' : '#e8e8e8',
      border: 'none', cursor: active ? 'pointer' : 'default',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, color: active ? '#fff' : '#ccc',
      transition: 'background 250ms, color 250ms', userSelect: 'none',
    }}>
      {dir === 'back' ? '‹' : '›'}
    </button>
  )
}
