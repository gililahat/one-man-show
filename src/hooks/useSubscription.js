// src/hooks/useSubscription.js
// ─────────────────────────────────────────────────────────────
// Subscription state and feature gating.
// Reads from Firebase profile.subscription.
// Works without Stripe — uses existing Firebase subscription fields.
// ─────────────────────────────────────────────────────────────
import useAuthStore from '@/store/authStore'

// ─── Plan definitions ─────────────────────────────────────────
export const PLANS = {
  trial: {
    key:      'trial',
    label:    'ניסיון חינם',
    features: ['clients', 'projects', 'appointments', 'calculator', 'quotes', 'settings'],
  },
  basic: {
    key:      'basic',
    label:    'Basic',
    features: ['clients', 'projects', 'appointments', 'calculator', 'quotes', 'settings'],
  },
  pro: {
    key:      'pro',
    label:    'Pro',
    features: ['clients', 'projects', 'appointments', 'calculator', 'quotes',
               'suppliers', 'orders', 'outputs', 'settings', 'reports'],
  },
}

// ─── Feature → plan mapping ───────────────────────────────────
// Which plan is required minimum to access each feature
export const FEATURE_REQUIREMENTS = {
  clients:      'trial',   // available to all
  projects:     'trial',
  appointments: 'trial',
  calculator:   'trial',
  quotes:       'trial',
  settings:     'trial',
  suppliers:    'pro',     // Pro only
  orders:       'pro',
  outputs:      'pro',
  reports:      'pro',
}

const PLAN_RANK = { trial: 0, basic: 1, pro: 2 }

// ─── Hook ─────────────────────────────────────────────────────
export default function useSubscription() {
  const profile = useAuthStore(s => s.profile)
  const sub     = profile?.subscription

  const plan      = sub?.plan   || 'trial'
  const status    = sub?.status || 'active'
  const expiresAt = sub?.expiresAt?.toDate
    ? sub.expiresAt.toDate()
    : sub?.expiresAt ? new Date(sub.expiresAt) : null

  // Is trial expired?
  const isTrialExpired = plan === 'trial' && expiresAt && new Date() > expiresAt

  // Is subscription active?
  const isActive = status === 'active' && !isTrialExpired

  // Days remaining in trial
  const trialDaysLeft = plan === 'trial' && expiresAt
    ? Math.max(0, Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  // Can access a feature?
  const canAccess = (feature) => {
    if (!isActive) return false
    const required = FEATURE_REQUIREMENTS[feature] || 'pro'
    return PLAN_RANK[plan] >= PLAN_RANK[required]
  }

  // Is on pro plan?
  const isPro   = PLAN_RANK[plan] >= PLAN_RANK['pro']
  const isBasic = PLAN_RANK[plan] >= PLAN_RANK['basic']

  return {
    plan,
    status,
    isActive,
    isPro,
    isBasic,
    isTrialExpired,
    trialDaysLeft,
    expiresAt,
    canAccess,
    planLabel: PLANS[plan]?.label || plan,
  }
}
