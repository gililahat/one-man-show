// src/pages/booking/BookingPage.jsx
// Public page — client self-schedules installation (no auth required)

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getBookingToken, confirmBooking, getBookedSlotsForUser } from '@/firebase/db'

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const HEB_DAY_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const HEB_MONTH    = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

const fmtDate = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

export default function BookingPage() {
  const { token }               = useParams()
  const [data,    setData]      = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [booked,  setBooked]    = useState([])     // all booked tokens for this user
  const [selectedDate, setSelDate] = useState(null)
  const [selectedWindow, setSelWindow] = useState(null)
  const [name,    setName]      = useState('')
  const [phone,   setPhone]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [done,      setDone]      = useState(false)
  const [alreadyBooked, setAlreadyBooked] = useState(false) // revisit — link already used
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (!token) return
    getBookingToken(token).then(async (d) => {
      if (!d) { setNotFound(true); setLoading(false); return }
      setData(d)
      if (d.booked) { setAlreadyBooked(true); setLoading(false); return }
      if (d.clientName)  setName(d.clientName)
      if (d.clientPhone) setPhone(d.clientPhone)
      // Load other booked slots for availability
      if (d.uid) {
        try {
          const slots = await getBookedSlotsForUser(d.uid)
          setBooked(slots.filter(s => s.id !== token))
        } catch (e) { console.error(e) }
      }
      setLoading(false)
    })
  }, [token])

  const cfg = data?.bookingConfig || null

  // Build calendar: next 45 days
  const days = useMemo(() => {
    if (!cfg) return []
    const result = []
    const today = new Date(); today.setHours(0,0,0,0)
    for (let i = 1; i <= 45; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i)
      const dayKey = DAY_KEYS[d.getDay()]
      const isWorking = cfg.workingDays?.[dayKey]
      const isBlocked = (cfg.blockedDates || []).includes(dateKey(d))
      // Find region(s) active on this day
      const regions = (cfg.regions || []).filter(r => r.days?.includes(dayKey))
      result.push({ date: d, dayKey, isWorking, isBlocked, regions })
    }
    return result
  }, [cfg])

  // Count bookings per day+window
  const slotCounts = useMemo(() => {
    const counts = {}
    booked.forEach(b => {
      if (!b.bookedSlot) return
      counts[b.bookedSlot] = (counts[b.bookedSlot] || 0) + 1
    })
    return counts
  }, [booked])

  const countPerDay = useMemo(() => {
    const c = {}
    booked.forEach(b => {
      if (!b.bookedSlot) return
      const [d] = b.bookedSlot.split('|')
      c[d] = (c[d] || 0) + 1
    })
    return c
  }, [booked])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedDate || !selectedWindow) { setError('יש לבחור תאריך וחלון שעות'); return }
    if (!name.trim())  { setError('יש להזין שם'); return }
    if (!phone.trim()) { setError('יש להזין טלפון'); return }
    setSaving(true)
    try {
      const slotKey = `${dateKey(selectedDate)}|${selectedWindow.start}-${selectedWindow.end}`
      // Detect "first of day": first window of the day AND no one else booked it yet
      const firstWindow = cfg.windows[0]
      const isFirstWindow = selectedWindow.start === firstWindow.start && selectedWindow.end === firstWindow.end
      const existingInSlot = slotCounts[slotKey] || 0
      const isFirstOfDay = isFirstWindow && existingInSlot === 0

      await confirmBooking(token, slotKey, {
        bookedName:   name.trim(),
        bookedPhone:  phone.trim(),
        bookedRegion: selectedWindow.region?.name || '',
        bookedColor:  selectedWindow.region?.color || '',
        isFirstOfDay,
        dayStartTime: firstWindow.start,
      })
      setDone(true)
    } catch (e) {
      console.error(e)
      setError('שגיאה בשמירה, נסה שוב')
    }
    setSaving(false)
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

  // Link already used — show minimal info, hide personal details
  if (alreadyBooked) return (
    <PageCenter>
      <div style={cardSt}>
        <p style={{ fontSize: 48, margin: '0 0 16px' }}>🔒</p>
        <p style={{ color: '#0f172a', fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>
          תיאום ההתקנה כבר בוצע
        </p>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          הקישור הזה חד-פעמי.<br />
          לשינוי — פנה לבעל העסק.
        </p>
      </div>
    </PageCenter>
  )

  if (done) {
    const slot = data.bookedSlot || (selectedDate && selectedWindow ? `${dateKey(selectedDate)}|${selectedWindow.start}-${selectedWindow.end}` : '')
    const [dStr, wStr] = (slot || '').split('|')
    const chosen = dStr ? new Date(dStr) : null
    const isFirst = data.isFirstOfDay
    const startT  = data.dayStartTime || (cfg?.windows?.[0]?.start || '08:00')
    return (
      <PageCenter>
        <div style={cardSt}>
          <p style={{ fontSize: 56, margin: '0 0 12px' }}>🎉</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
            ההתקנה נקבעה!
          </h1>
          {chosen && (
            <p style={{ color: '#475569', fontSize: 15, margin: '0 0 14px' }}>
              {HEB_DAY_FULL[chosen.getDay()]}, {fmtDate(chosen)} • {wStr}
            </p>
          )}
          {isFirst ? (
            <div style={{ background: '#eff6ff', borderRadius: 12, padding: 16, color: '#1d4ed8', fontSize: 14, fontWeight: 600 }}>
              ⭐ את/ה ראשון/ה ביום הזה!<br />
              נשלח לך הודעה בערב שלפני — &quot;ערב טוב, מחר נגיע אליך בשעה {startT}&quot;
            </div>
          ) : (
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 16, color: '#16a34a', fontSize: 14, fontWeight: 600 }}>
              ✓ המתקין יתקשר 30 דקות לפני ההגעה
            </div>
          )}
        </div>
      </PageCenter>
    )
  }

  // No config yet
  if (!cfg || !cfg.windows?.length) return (
    <PageCenter>
      <div style={cardSt}>
        <p style={{ fontSize: 48, margin: '0 0 16px' }}>📅</p>
        <p style={{ color: '#64748b', fontSize: 15 }}>
          הגדרות היומן עדיין לא הוגדרו. נא ליצור קשר ישירות לתיאום.
        </p>
      </div>
    </PageCenter>
  )

  const availableDays = days.filter(d => d.isWorking && !d.isBlocked && (countPerDay[dateKey(d.date)] || 0) < (cfg.maxPerDay || 99))

  return (
    <PageCenter>
      <div style={{ ...cardSt, maxWidth: 520 }}>
        <p style={{ fontSize: 40, margin: '0 0 8px' }}>📅</p>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
          תיאום התקנה
        </h1>
        {data.projectName && (
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>
            {data.projectName}
          </p>
        )}

        {/* Calendar */}
        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <p style={labelSt}>בחר תאריך</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginTop: 8 }}>
            {availableDays.map(d => {
              const k = dateKey(d.date)
              const region = d.regions[0]  // primary region for this day
              const color  = region?.color || '#94a3b8'
              const isSel  = selectedDate && dateKey(selectedDate) === k
              const dayCount = countPerDay[k] || 0
              const dayFull  = dayCount >= (cfg.maxPerDay || 99)
              return (
                <button
                  key={k}
                  type="button"
                  disabled={dayFull}
                  onClick={() => { setSelDate(d.date); setSelWindow(null) }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: `2px solid ${isSel ? color : '#e2e8f0'}`,
                    background: isSel ? `${color}25` : dayFull ? '#f1f5f9' : '#fff',
                    opacity: dayFull ? 0.4 : 1,
                    cursor: dayFull ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                    {HEB_DAY_FULL[d.date.getDay()]}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    {d.date.getDate()}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                    {HEB_MONTH[d.date.getMonth()].slice(0, 3)}
                  </div>
                  {region && (
                    <div style={{
                      marginTop: 4, fontSize: 10, fontWeight: 700,
                      color: '#fff', background: color, borderRadius: 6, padding: '1px 4px',
                      display: 'inline-block',
                    }}>
                      {region.name}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Time windows for selected day */}
        {selectedDate && (
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <p style={labelSt}>בחר חלון שעות</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 8 }}>
              {cfg.windows.map((w, i) => {
                const dKey = dateKey(selectedDate)
                const slotKey = `${dKey}|${w.start}-${w.end}`
                const count = slotCounts[slotKey] || 0
                const full  = count >= (cfg.maxPerWindow || 4)
                const region = days.find(d => dateKey(d.date) === dKey)?.regions[0]
                const color  = region?.color || '#3b82f6'
                const isSel  = selectedWindow && selectedWindow.start === w.start && selectedWindow.end === w.end
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={full}
                    onClick={() => setSelWindow({ ...w, region })}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `2px solid ${isSel ? color : '#e2e8f0'}`,
                      background: isSel ? `${color}25` : full ? '#f1f5f9' : '#fff',
                      opacity: full ? 0.4 : 1,
                      cursor: full ? 'not-allowed' : 'pointer',
                      fontSize: 14, fontWeight: isSel ? 700 : 500,
                      color: '#0f172a',
                      textAlign: 'center',
                    }}
                  >
                    {w.start}–{w.end}
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {full ? 'תפוס' : `${(cfg.maxPerWindow || 4) - count} מקומות פנויים`}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Client details form */}
        {selectedWindow && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'right' }}>
            <div>
              <label style={labelSt}>שם מלא *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="ישראל ישראלי" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>טלפון *</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" dir="ltr" style={inputSt} />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0, textAlign: 'right' }}>{error}</p>}
            <button
              type="submit"
              disabled={saving}
              style={{
                background: selectedWindow?.region?.color || '#1d4ed8', color: '#fff', border: 'none',
                borderRadius: 12, padding: '14px', fontSize: 16,
                fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1, marginTop: 4,
              }}
            >
              {saving ? 'שומר...' : '✅ אשר תיאום'}
            </button>
          </form>
        )}

        {availableDays.length === 0 && (
          <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>
            אין תאריכים פנויים כרגע — צור קשר ישירות
          </p>
        )}
      </div>
    </PageCenter>
  )
}

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
  background: '#fff', borderRadius: 20, padding: '28px 24px',
  boxShadow: '0 4px 32px rgba(0,0,0,0.10)', maxWidth: 420, width: '100%',
  textAlign: 'center',
}
const labelSt = {
  display: 'block', textAlign: 'right', fontSize: 11, fontWeight: 700,
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4,
}
const inputSt = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', fontSize: 15, outline: 'none',
  boxSizing: 'border-box', background: '#f8fafc',
}
