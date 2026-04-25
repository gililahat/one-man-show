// src/components/ui/CompletionOverlay.jsx
import { useEffect } from 'react'

export default function CompletionOverlay({ projectName, playSound = true, onClose }) {
  useEffect(() => {
    // ── Play cheerful success chime via Web Audio API ──────────
    if (!playSound) { const t = setTimeout(onClose, 5000); return () => clearTimeout(t) }
    try {
      const ctx = new AudioContext()
      const play = (freq, startAt, dur) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type            = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, ctx.currentTime + startAt)
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + startAt + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + dur)
        osc.start(ctx.currentTime + startAt)
        osc.stop(ctx.currentTime + startAt + dur)
      }
      // C5 → E5 → G5 → C6 ascending chord
      play(523,  0,    0.4)
      play(659,  0.15, 0.4)
      play(784,  0.30, 0.5)
      play(1047, 0.45, 0.8)
    } catch { /* audio not available */ }

    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* card */}
      <div className="relative bg-white rounded-3xl shadow-modal p-8 max-w-sm w-full mx-4
                      text-center animate-[bounceIn_0.5s_ease-out]">
        <div className="text-7xl mb-4 animate-[spin_0.6s_ease-out]">🎉</div>
        <h2 className="text-2xl font-bold text-ink mb-2">הושלם!</h2>
        <p className="font-medium text-ink-muted">{projectName}</p>
        <p className="text-sm text-ink-subtle mt-1">הפרויקט הגיע לשלב האחרון — כל הכבוד!</p>
        <button onClick={onClose} className="btn-primary mt-6 w-full">סגור</button>
      </div>
    </div>
  )
}
