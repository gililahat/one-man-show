// src/components/ui/ActionSwitch.jsx
// Industrial-style action switch for major workflow milestones.
// NOT for small edits — only for irreversible stage transitions.

import { useState } from 'react'

/**
 * @param {string}   label       – text shown when OFF (the action to take)
 * @param {string}   labelOn     – text shown when ON  (confirms done)
 * @param {boolean}  active      – current state
 * @param {function} onToggle    – called with (newValue: boolean)
 * @param {boolean}  disabled
 * @param {string}   color       – 'gold' | 'green' | 'blue'  (default 'gold')
 */
export default function ActionSwitch({
  label,
  labelOn,
  active,
  onToggle,
  disabled = false,
  color    = 'gold',
}) {
  const [pressing, setPressing] = useState(false)

  const COLORS = {
    gold:  { track: '#F5C518', glow: 'rgba(245,197,24,0.35)',  thumb: '#000' },
    green: { track: '#22c55e', glow: 'rgba(34,197,94,0.35)',   thumb: '#000' },
    blue:  { track: '#3b82f6', glow: 'rgba(59,130,246,0.35)',  thumb: '#fff' },
  }
  const c = COLORS[color] || COLORS.gold

  const handleClick = () => {
    if (disabled) return
    onToggle(!active)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      onPointerDown={() => setPressing(true)}
      onPointerUp={()   => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      className="flex items-center gap-3 select-none"
      style={{ direction: 'rtl', opacity: disabled ? 0.45 : 1 }}
    >
      {/* Label */}
      <span
        className="text-sm font-semibold transition-colors duration-200"
        style={{ color: active ? c.track : 'rgba(255,255,255,0.55)' }}
      >
        {active ? (labelOn || label) : label}
      </span>

      {/* Track */}
      <div
        className="relative shrink-0 rounded-full transition-all duration-200"
        style={{
          width:  56,
          height: 30,
          background: active
            ? `linear-gradient(135deg, ${c.track}cc, ${c.track})`
            : '#1c1c1c',
          border: active
            ? `1.5px solid ${c.track}`
            : '1.5px solid #333',
          boxShadow: active
            ? `0 0 14px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`
            : 'inset 0 2px 5px rgba(0,0,0,0.6)',
          transform: pressing ? 'scale(0.94)' : 'scale(1)',
          transition: 'background 220ms ease, border 220ms ease, box-shadow 220ms ease, transform 120ms ease',
        }}
      >
        {/* Thumb */}
        <div
          className="absolute top-[3px] rounded-full"
          style={{
            width:      24,
            height:     24,
            left:       active ? 29 : 3,
            background: active
              ? c.thumb
              : 'linear-gradient(160deg, #484848, #282828)',
            boxShadow: active
              ? `0 1px 4px rgba(0,0,0,0.6)`
              : '0 2px 5px rgba(0,0,0,0.5)',
            transition: 'left 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Power dot inside thumb */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: active ? 0.7 : 0.35 }}
          >
            <div
              style={{
                width:        6,
                height:       6,
                borderRadius: '50%',
                background:   active ? c.track : '#888',
              }}
            />
          </div>
        </div>

        {/* ON indicator line (right side of track) */}
        {active && (
          <div
            className="absolute right-[8px] top-1/2 -translate-y-1/2"
            style={{ width: 2, height: 12, background: `${c.track}99`, borderRadius: 1 }}
          />
        )}
      </div>
    </button>
  )
}
