// src/utils/projectWorkflow.js
// Fully settings-driven — zero hardcoded stage keys.
// Every function reads from the `settings` object returned by useGlobalSettings().
import { DEFAULT_STAGES } from '@/store/globalSettingsStore'

// ─── Stage list ───────────────────────────────────────────────

/** Returns stages sorted by order, falling back to defaults. */
export function getStages(settings) {
  const stages = settings?.projectStages
  if (!stages?.length) return DEFAULT_STAGES
  return [...stages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/** Find a single stage object by key. */
export function getStage(settings, key) {
  return getStages(settings).find(s => s.key === key) ?? null
}

/** The first stage — used as default when creating a project. */
export function getFirstStageKey(settings) {
  return getStages(settings)[0]?.key ?? 'new'
}

// ─── Event-trigger helpers ────────────────────────────────────
// These are the ONLY place that reads the trigger-key fields.
// All other code checks against these functions, not raw keys.

export function getCompletionStageKey(settings) {
  return settings?.completionStageKey ?? getStages(settings).at(-1)?.key
}

export function getInstallReadyStageKey(settings) {
  return settings?.installReadyStageKey ?? getStages(settings).at(-2)?.key
}

export function getDepositTriggerKey(settings) {
  return settings?.depositTriggerStageKey ?? null
}

export function getMaterialsTriggerKey(settings) {
  return settings?.materialsTriggerStageKey ?? null
}

/** True when moving TO this stage should fire the 🎉 completion overlay. */
export function isCompletionStage(settings, key) {
  return !!key && getCompletionStageKey(settings) === key
}

/** True when moving TO this stage should fire the WhatsApp install notification. */
export function isInstallReadyStage(settings, key) {
  return !!key && getInstallReadyStageKey(settings) === key
}

// ─── Transition validation ────────────────────────────────────

/**
 * Returns null if the transition is allowed, or a Hebrew error string if blocked.
 *
 * @param {object} settings  — from useGlobalSettings()
 * @param {string} toKey     — target stage key
 * @param {object} context   — { hasDeposit: bool, hasMaterials: bool }
 */
export function validateTransition(settings, toKey, context = {}) {
  const stages = getStages(settings)
  const toIdx  = stages.findIndex(s => s.key === toKey)
  if (toIdx === -1) return 'שלב לא ידוע'

  // ── Deposit rule ──────────────────────────────────────────
  const depositKey = getDepositTriggerKey(settings)
  if (settings?.requireDeposit && depositKey) {
    const trigIdx = stages.findIndex(s => s.key === depositKey)
    if (trigIdx !== -1 && toIdx >= trigIdx && !context.hasDeposit) {
      const pct = settings.depositPercent || 30
      return `נדרשת מקדמה (${pct}%) לפני שלב זה`
    }
  }

  // ── Materials rule ────────────────────────────────────────
  const materialsKey = getMaterialsTriggerKey(settings)
  if (settings?.requireMaterials && materialsKey) {
    const trigIdx = stages.findIndex(s => s.key === materialsKey)
    if (trigIdx !== -1 && toIdx >= trigIdx && !context.hasMaterials) {
      return 'נדרשת הזמנת חומרים לפני שלב זה'
    }
  }

  return null // ✓ allowed
}

// ─── Badge styling (inline, hex-based) ───────────────────────

/** Returns an inline-style object for a stage chip/badge. */
export function stageBadgeStyle(stage) {
  if (!stage?.color) return {}
  return {
    backgroundColor: stage.color + '22',
    color:           stage.color,
    border:          `1px solid ${stage.color}44`,
  }
}
