// src/store/globalSettingsStore.js
import { create } from 'zustand'
import { getGlobalSettings, saveGlobalSettings } from '@/firebase/db'

export const DEFAULT_STAGES = [
  { key: 'new',        label: 'חדש',       color: '#3B82F6', order: 0 },
  { key: 'measured',   label: 'מדוד',      color: '#F59E0B', order: 1 },
  { key: 'quoted',     label: 'הוצע מחיר', color: '#6B7280', order: 2 },
  { key: 'approved',   label: 'אושר',      color: '#10B981', order: 3 },
  { key: 'production', label: 'בייצור',    color: '#F59E0B', order: 4 },
  { key: 'installed',  label: 'הותקן',     color: '#10B981', order: 5 },
  { key: 'completed',  label: 'הושלם',     color: '#6B7280', order: 6 },
]

export const DEFAULT_SETTINGS = {
  // ── Workflow stages ───────────────────────────────────────
  projectStages: DEFAULT_STAGES,

  // ── Trigger-stage keys (no hardcoded values elsewhere) ───
  // These tell the engine WHICH stage fires each rule / event.
  completionStageKey:       'completed',  // → 🎉 overlay
  installReadyStageKey:     'installed',  // → WhatsApp notification
  depositTriggerStageKey:   'approved',   // → deposit rule enforced FROM this stage
  materialsTriggerStageKey: 'installed',  // → materials rule enforced FROM this stage

  // ── Financial rules ───────────────────────────────────────
  depositPercent:   30,
  requireDeposit:   false,
  requireMaterials: false,

  // ── Suppliers ─────────────────────────────────────────────
  supplierTypes:         ['זכוכית', 'פרזול', 'פרופיל', 'כללי'],
  defaultSupplierByType: {},

  // ── Business ──────────────────────────────────────────────
  workingDaysPerWeek:  5,
  defaultDeliveryDays: 14,

  // ── Clients / Notifications ───────────────────────────────
  autoNotifications:       true,
  installationScheduling:  false,
  whatsappInstallReady:    'שלום {client},\nהפרויקט "{project}" מוכן להתקנה! 🔧\nנשמח לתאם מועד.',
  whatsappQuoteSent:       'שלום {client},\nשלחנו לך הצעת מחיר עבור "{project}".\nנשמח לענות על שאלות.',
  whatsappPaymentReminder: 'שלום {client},\nתזכורת ידידותית לתשלום עבור "{project}".\nתודה!',

  // ── UX / Experience (unified here — no separate settings/ux doc) ──
  completionAnimation:  true,
  completionSound:      true,
  whatsappNotification: true,   // show WhatsApp popup on install-ready stage
  toastDuration:        3000,
  expenseCategories: [
    { key: 'materials', label: 'חומרים',     color: '#3B82F6' },
    { key: 'tools',     label: 'כלים וציוד', color: '#8B5CF6' },
    { key: 'transport', label: 'תחבורה',      color: '#F59E0B' },
    { key: 'marketing', label: 'שיווק',       color: '#EC4899' },
    { key: 'office',    label: 'משרד',        color: '#10B981' },
    { key: 'other',     label: 'אחר',         color: '#6B7280' },
  ],
}

const useGlobalSettingsStore = create((set, get) => ({
  settings: null,
  loading:  true,
  _uid:     null,

  // Load once per uid — subsequent calls are no-ops
  load: async (uid) => {
    if (!uid) return
    if (get()._uid === uid && get().settings) return  // already loaded
    set({ loading: true, _uid: uid })
    try {
      const saved = await getGlobalSettings(uid)
      set({
        settings: saved ? { ...DEFAULT_SETTINGS, ...saved } : { ...DEFAULT_SETTINGS },
        loading: false,
      })
    } catch {
      set({ settings: { ...DEFAULT_SETTINGS }, loading: false })
    }
  },

  // Merge-update and persist
  save: async (uid, patch) => {
    const next = { ...get().settings, ...patch }
    set({ settings: next })
    await saveGlobalSettings(uid, next)
  },
}))

export default useGlobalSettingsStore
