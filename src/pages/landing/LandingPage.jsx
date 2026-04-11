// src/pages/landing/LandingPage.jsx
// ─────────────────────────────────────────────────────────────
// External marketing / landing page.
// Shown at / when user is NOT logged in (replace auth redirect).
// ─────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white" dir="rtl">

      {/* ── Nav ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-surface-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">OMS</span>
            </div>
            <span className="font-bold text-ink">ONE MAN SHOW</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"
                  className="text-sm font-medium text-ink-muted hover:text-ink transition-colors">
              כניסה
            </Link>
            <Link to="/register"
                  className="btn-primary text-sm px-5 py-2">
              התחל חינם
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5
                          text-brand-200 text-sm mb-6 border border-white/10">
            🎉 14 ימי ניסיון חינם — ללא כרטיס אשראי
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            ניהול עסק שלם
            <br />
            <span className="text-brand-300">בלחיצת כפתור</span>
          </h1>
          <p className="text-xl text-brand-200 mb-10 max-w-2xl mx-auto">
            המערכת היחידה שבעל מקצוע עצמאי צריך — מלקוח ראשון ועד פלט לייצור, הכל במקום אחד.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
                  className="bg-white text-brand-800 font-bold px-8 py-4 rounded-2xl
                             text-lg hover:bg-brand-50 transition-colors shadow-lg">
              התחל ניסיון חינם ←
            </Link>
            <a href="#features"
               className="border border-white/20 text-white font-medium px-8 py-4
                          rounded-2xl text-lg hover:bg-white/10 transition-colors">
              גלה את הפיצ'רים
            </a>
          </div>
        </div>
      </section>

      {/* ── Social proof strip ────────────────────────── */}
      <section className="bg-surface-50 border-y border-surface-200 py-5">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-ink-muted">
            <span>✅ ללא הגדרה מסובכת</span>
            <span>✅ RTL עברית מלאה</span>
            <span>✅ מובייל ראשון</span>
            <span>✅ פלט לייצור מוכן</span>
            <span>✅ ללא כרטיס אשראי</span>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────── */}
      <section id="features" className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-ink mb-4">כל מה שצריך בעסק אחד</h2>
            <p className="text-ink-muted text-lg">מותאם במיוחד למקלחונים, זכוכית ואלומיניום</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ──────────────────────────────────── */}
      <section className="py-20 bg-surface-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-ink mb-4">זרימת עבודה מלאה</h2>
            <p className="text-ink-muted">מהלקוח הראשון ועד מסמך הייצור</p>
          </div>
          <div className="grid sm:grid-cols-5 gap-4 items-start">
            {WORKFLOW.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white text-xl
                                flex items-center justify-center mb-3 shadow-card">
                  {step.emoji}
                </div>
                <p className="text-sm font-semibold text-ink">{step.label}</p>
                {i < WORKFLOW.length - 1 && (
                  <div className="hidden sm:block absolute translate-x-8 translate-y-6 text-brand-300 text-xl">
                    ←
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────── */}
      <section id="pricing" className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-ink mb-4">תמחור פשוט וברור</h2>
            <p className="text-ink-muted">ללא הפתעות. ביטול בכל עת.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <PricingCard
              name="Basic"
              price="99"
              desc="לבעל מקצוע יחיד"
              features={['לקוחות ופרויקטים', 'יומן פגישות', 'מחשבון מחיר', 'הצעות מחיר']}
            />
            <PricingCard
              name="Pro"
              price="199"
              desc="לעסק פעיל ומתרחב"
              features={['כל מה שב-Basic', 'ספקים והזמנות', 'פלטי ייצור', 'עמלות ספקים', 'דוחות מתקדמים']}
              highlight
            />
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-brand-950 to-brand-800">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">מוכן להתחיל?</h2>
          <p className="text-brand-200 mb-8 text-lg">14 ימים חינם. ללא כרטיס אשראי. ביטול בכל עת.</p>
          <Link to="/register"
                className="inline-block bg-white text-brand-800 font-bold px-10 py-4
                           rounded-2xl text-lg hover:bg-brand-50 transition-colors shadow-lg">
            התחל עכשיו — חינם ←
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer className="bg-brand-950 text-brand-400 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center
                        justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">O</span>
            </div>
            <span className="font-medium text-white">ONE MAN SHOW</span>
          </div>
          <p>© {new Date().getFullYear()} ONE MAN SHOW. כל הזכויות שמורות.</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-white transition-colors">כניסה</Link>
            <Link to="/register" className="hover:text-white transition-colors">הרשמה</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────
const FEATURES = [
  { emoji: '👥', title: 'ניהול לקוחות', desc: 'כל הלקוחות, פרויקטים ופגישות במקום אחד. חיפוש מהיר, היסטוריה מלאה.' },
  { emoji: '🧮', title: 'מחשבון מחיר', desc: 'חשב מחיר לכל פנל בנפרד עם זכוכית, פרופיל ופרזול. תוצאה חיה.' },
  { emoji: '📋', title: 'הצעות מחיר', desc: 'צור הצעות מחיר מקצועיות בשניות. מעקב סטטוס: טיוטה, נשלח, אושר.' },
  { emoji: '🏭', title: 'הזמנות ספקים', desc: 'שלח הזמנות לספקי זכוכית ופרזול. מעקב מייצור ועד אספקה.' },
  { emoji: '📄', title: 'פלטי ייצור', desc: 'הפק קבצי ייצור למפעל, רשימת פרזול, ומסמך ללקוח — בלחיצה.' },
  { emoji: '📅', title: 'יומן פגישות', desc: 'קבע מדידות, התקנות וביקורות. לוח שנה חזותי עם תצוגת יום.' },
]

const WORKFLOW = [
  { emoji: '👤', label: 'לקוח' },
  { emoji: '📁', label: 'פרויקט' },
  { emoji: '🧮', label: 'מחשבון' },
  { emoji: '📋', label: 'הצעה' },
  { emoji: '📄', label: 'פלט' },
]

// ─── Components ───────────────────────────────────────────────
function FeatureCard({ emoji, title, desc }) {
  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-5 hover:shadow-card transition-shadow">
      <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-2xl mb-4">
        {emoji}
      </div>
      <h3 className="font-semibold text-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
    </div>
  )
}

function PricingCard({ name, price, desc, features, highlight }) {
  return (
    <div className={`rounded-2xl p-6 border ${highlight
      ? 'bg-brand-600 border-brand-500 text-white'
      : 'bg-white border-surface-200'}`}>
      {highlight && (
        <div className="text-xs font-bold bg-white/20 rounded-full px-3 py-1 inline-block mb-3">
          הכי פופולרי
        </div>
      )}
      <h3 className={`text-xl font-bold mb-1 ${highlight ? 'text-white' : 'text-ink'}`}>{name}</h3>
      <p className={`text-sm mb-4 ${highlight ? 'text-brand-200' : 'text-ink-muted'}`}>{desc}</p>
      <div className={`text-3xl font-bold mb-1 ${highlight ? 'text-white' : 'text-ink'}`}>
        ₪{price}
        <span className={`text-base font-normal ${highlight ? 'text-brand-200' : 'text-ink-muted'}`}>/חודש</span>
      </div>
      <ul className="mt-5 space-y-2">
        {features.map(f => (
          <li key={f} className={`flex items-center gap-2 text-sm
            ${highlight ? 'text-brand-100' : 'text-ink-muted'}`}>
            <span className={highlight ? 'text-brand-200' : 'text-brand-600'}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link to="/register"
            className={`mt-6 block text-center py-3 rounded-xl font-semibold text-sm
              transition-colors ${highlight
                ? 'bg-white text-brand-700 hover:bg-brand-50'
                : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
        התחל חינם
      </Link>
    </div>
  )
}
