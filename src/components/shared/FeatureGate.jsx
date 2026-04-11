// src/components/shared/FeatureGate.jsx
// ─────────────────────────────────────────────────────────────
// Wraps any page/component. If user lacks access — shows upgrade wall.
// Usage:
//   <FeatureGate feature="suppliers">
//     <SuppliersPage />
//   </FeatureGate>
// ─────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'
import useSubscription, { FEATURE_REQUIREMENTS, PLANS } from '@/hooks/useSubscription'

const FEATURE_LABELS = {
  suppliers:    'ניהול ספקים',
  orders:       'הזמנות ספקים',
  outputs:      'פלטי ייצור',
  reports:      'דוחות מתקדמים',
}

export default function FeatureGate({ feature, children }) {
  const { canAccess, isTrialExpired, trialDaysLeft, plan } = useSubscription()

  // Trial expired wall
  if (isTrialExpired) {
    return <TrialExpiredWall />
  }

  // Feature not available on current plan
  if (!canAccess(feature)) {
    const requiredPlan = FEATURE_REQUIREMENTS[feature] || 'pro'
    return <UpgradeWall feature={feature} requiredPlan={requiredPlan} currentPlan={plan} />
  }

  // Trial banner (non-blocking)
  return (
    <>
      {trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <TrialBanner daysLeft={trialDaysLeft} />
      )}
      {children}
    </>
  )
}

// ─── Trial expiry warning banner ──────────────────────────────
export function TrialBanner({ daysLeft }) {
  if (daysLeft === null) return null
  const urgent = daysLeft <= 3

  return (
    <div className={`rounded-xl px-4 py-3 mb-4 flex items-center justify-between
      ${urgent ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-100'}`}>
      <p className={`text-sm font-medium ${urgent ? 'text-red-700' : 'text-amber-800'}`}>
        {daysLeft === 0
          ? '⚠️ תקופת הניסיון מסתיימת היום!'
          : `⏳ ${daysLeft} ימים נותרו בתקופת הניסיון`}
      </p>
      <Link to="/settings"
            className={`text-xs font-bold px-3 py-1.5 rounded-lg
              ${urgent ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
        שדרג עכשיו
      </Link>
    </div>
  )
}

// ─── Upgrade wall ─────────────────────────────────────────────
function UpgradeWall({ feature, requiredPlan, currentPlan }) {
  const featureLabel = FEATURE_LABELS[feature] || feature
  const planLabel    = PLANS[requiredPlan]?.label || requiredPlan

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center
                      text-3xl mb-5">
        🔒
      </div>
      <h2 className="text-xl font-bold text-ink mb-2">
        {featureLabel} — תכונת {planLabel}
      </h2>
      <p className="text-ink-muted text-sm max-w-sm mb-6">
        תכונה זו זמינה בתוכנית {planLabel} ומעלה.
        שדרג כדי לגשת לספקים, הזמנות ופלטי ייצור.
      </p>
      <Link to="/settings" className="btn-primary px-8 py-3 text-base">
        שדרג לתוכנית {planLabel}
      </Link>
      <p className="text-xs text-ink-subtle mt-3">
        תוכנית נוכחית: {PLANS[currentPlan]?.label || currentPlan}
      </p>
    </div>
  )
}

// ─── Trial expired wall ───────────────────────────────────────
function TrialExpiredWall() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center
                      text-3xl mb-5">
        ⏰
      </div>
      <h2 className="text-xl font-bold text-ink mb-2">תקופת הניסיון הסתיימה</h2>
      <p className="text-ink-muted text-sm max-w-sm mb-6">
        תקופת הניסיון החינמית שלך הסתיימה.
        בחר תוכנית כדי להמשיך להשתמש במערכת.
      </p>
      <Link to="/settings" className="btn-primary px-8 py-3 text-base">
        בחר תוכנית מנוי
      </Link>
    </div>
  )
}
