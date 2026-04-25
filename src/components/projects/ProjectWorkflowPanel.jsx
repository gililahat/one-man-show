// src/components/projects/ProjectWorkflowPanel.jsx
// Settings-driven workflow panel — shows pipeline, handles stage transitions
// with rule enforcement from globalSettings.
import { useState } from 'react'
import useGlobalSettings from '@/hooks/useGlobalSettings'
import useToastStore from '@/store/toastStore'
import {
  getStages, isCompletionStage, validateTransition, stageBadgeStyle,
} from '@/utils/projectWorkflow'
import { updateProject } from '@/firebase/db'

export default function ProjectWorkflowPanel({
  project,
  uid,
  orders = [],          // supplier orders for this project (for rule checking)
  onStatusChanged,      // callback(oldStatus, newStatus, updatedProject)
}) {
  const { settings, loading } = useGlobalSettings()
  const addToast = useToastStore(s => s.addToast)
  const [busy, setBusy] = useState(false)

  if (loading || !settings) {
    return <div className="h-16 bg-surface-100 rounded-xl animate-pulse" />
  }

  const stages      = getStages(settings)
  const currentIdx = stages.findIndex(s => s.key === project.status)

  // Context for rule validation
  const context = {
    hasDeposit:   project.depositPaid === true,
    hasMaterials: orders.some(o => ['confirmed','in_prod','ready','delivered'].includes(o.status)),
  }

  const handleTransition = async (toStage) => {
    if (busy) return
    const err = validateTransition(settings, toStage.key, context)
    if (err) { addToast(`⚠️ ${err}`, 'warning'); return }

    setBusy(true)
    try {
      await updateProject(uid, project.id, { status: toStage.key })
      onStatusChanged?.(project.status, toStage.key, { ...project, status: toStage.key })
    } catch {
      addToast('שגיאה בעדכון שלב', 'error')
    } finally {
      setBusy(false)
    }
  }

  const isLast = isCompletionStage(settings, project.status)

  return (
    <div className="space-y-3">
      {/* ── Pipeline bar ──────────────────────────────────── */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {stages.map((stage, idx) => {
          const done    = idx < currentIdx
          const active  = idx === currentIdx
          const isFirst = idx === 0

          return (
            <div key={stage.key} className="flex items-center shrink-0">
              {/* Connector line before */}
              {!isFirst && (
                <div className={`h-0.5 w-4 shrink-0 transition-colors
                  ${done || active ? 'bg-brand-400' : 'bg-surface-200'}`} />
              )}

              {/* Stage node */}
              <button
                onClick={() => !active && !busy && handleTransition(stage)}
                disabled={busy || active}
                title={stage.label}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                            border-2 transition-all shrink-0
                            ${active  ? 'border-brand-600 bg-brand-600 text-white scale-110 shadow-sm' :
                              done    ? 'border-brand-400 bg-brand-100 text-brand-700 hover:bg-brand-200 cursor-pointer' :
                                        'border-surface-200 bg-white text-ink-subtle hover:border-surface-300 cursor-pointer'}`}
                style={active ? { borderColor: stage.color, backgroundColor: stage.color } : {}}
              >
                {done ? '✓' : idx + 1}
              </button>
            </div>
          )
        })}
      </div>

      {/* Stage labels — show current + neighbours */}
      <div className="flex items-start gap-2 flex-wrap">
        {stages.map((stage, idx) => {
          const active = idx === currentIdx
          if (!active && Math.abs(idx - currentIdx) > 1) return null
          return (
            <span key={stage.key}
                  className={`text-xs px-2 py-0.5 rounded-lg font-medium transition-all
                    ${active ? 'text-white' : 'text-ink-muted bg-surface-100'}`}
                  style={active ? stageBadgeStyle(stage) : {}}>
              {stage.label}
            </span>
          )
        })}
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      {!isLast && (
        <div className="space-y-2">
          {/* Next stage */}
          {stages[currentIdx + 1] && (
            <button
              onClick={() => handleTransition(stages[currentIdx + 1])}
              disabled={busy}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2"
            >
              {busy ? '...' : `→ העבר ל: ${stages[currentIdx + 1].label}`}
            </button>
          )}

          {/* Jump to any other stage */}
          {stages.length > 3 && (
            <StageJumpMenu
              stages={stages}
              currentIdx={currentIdx}
              busy={busy}
              onSelect={handleTransition}
            />
          )}
        </div>
      )}

      {isLast && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-700 font-medium text-center">
          ✅ הפרויקט הושלם
        </div>
      )}

      {/* ── Rule indicators ─────────────────────────────────── */}
      <RuleIndicators settings={settings} context={context} />
    </div>
  )
}

// ─── Stage jump dropdown ──────────────────────────────────────
function StageJumpMenu({ stages, currentIdx, busy, onSelect }) {
  const [open, setOpen] = useState(false)
  const others = stages.filter((_, i) => i !== currentIdx)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={busy}
        className="btn-secondary w-full text-xs flex items-center justify-center gap-1"
      >
        ⋯ שנה שלב ידנית
        <span className="text-ink-subtle">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 left-0 bg-white border border-surface-200
                        rounded-xl shadow-modal z-20 overflow-hidden">
          {others.map(stage => (
            <button
              key={stage.key}
              onClick={() => { setOpen(false); onSelect(stage) }}
              className="w-full text-right px-3 py-2 text-sm text-ink hover:bg-surface-50
                         transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }} />
              {stage.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Rule status indicators ───────────────────────────────────
function RuleIndicators({ settings, context }) {
  const rules = []

  if (settings.requireDeposit) {
    rules.push({
      label: `מקדמה (${settings.depositPercent || 30}%)`,
      met: context.hasDeposit,
    })
  }
  if (settings.requireMaterials) {
    rules.push({ label: 'הזמנת חומרים', met: context.hasMaterials })
  }

  if (!rules.length) return null

  return (
    <div className="space-y-1 pt-1 border-t border-surface-100">
      {rules.map(r => (
        <div key={r.label} className="flex items-center gap-2 text-xs">
          <span>{r.met ? '✅' : '⬜'}</span>
          <span className={r.met ? 'text-emerald-700' : 'text-ink-muted'}>{r.label}</span>
        </div>
      ))}
    </div>
  )
}
