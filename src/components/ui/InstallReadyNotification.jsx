// src/components/ui/InstallReadyNotification.jsx
const DEFAULT_TEMPLATE =
  'שלום {client},\nהפרויקט "{project}" מוכן להתקנה! 🔧\nנשמח לתאם מועד מתאים.'

export default function InstallReadyNotification({ project, settings, onClose }) {
  const template = settings?.whatsappInstallReady || DEFAULT_TEMPLATE

  const message = template
    .replace(/\{client\}/g,  project.clientName || 'לקוח')
    .replace(/\{project\}/g, project.title      || 'הפרויקט')

  // normalise Israeli phone → international format for wa.me
  const rawPhone = project.clientPhone?.replace(/\D/g, '') || ''
  const intlPhone = rawPhone.startsWith('0')
    ? '972' + rawPhone.slice(1)
    : rawPhone
  const waUrl = intlPhone
    ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md p-5 space-y-4">

        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-ink">🔧 מוכן להתקנה!</h3>
            <p className="text-sm text-ink-muted mt-0.5">{project.title}</p>
          </div>
          <button onClick={onClose}
                  className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100 transition-colors">
            ✕
          </button>
        </div>

        <p className="text-xs text-ink-subtle">
          הפרויקט עבר לשלב &quot;הותקן&quot;. רוצה לעדכן את הלקוח?
        </p>

        <div className="bg-surface-50 rounded-xl p-3 text-sm text-ink whitespace-pre-line border border-surface-200">
          {message}
        </div>

        {!rawPhone && (
          <p className="text-xs text-amber-600">
            ⚠️ לא נמצא מספר טלפון ללקוח. ניתן לשלוח ידנית.
          </p>
        )}

        <div className="flex gap-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm no-underline"
          >
            📱 שלח WhatsApp
          </a>
          <button onClick={onClose} className="btn-secondary text-sm">סגור</button>
        </div>
      </div>
    </div>
  )
}
