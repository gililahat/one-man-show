// src/pages/outputs/OutputsPage.jsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import useAuthStore from '@/store/authStore'
import { subscribeQuotes, logExport } from '@/firebase/db'
import {
  generateGlassProduction, generateHardwareList,
  generateClientSummary, generateInstallerBrief,
  generateGlassCSV, downloadTextFile, downloadCSV,
} from '@/utils/outputEngine'

const OUTPUT_TYPES = [
  {
    key:   'glass',
    label: 'ייצור זכוכית',
    emoji: '🔲',
    desc:  'קובץ ייצור למפעל זכוכית',
    color: 'bg-blue-50 border-blue-100 text-blue-800',
    ext:   'txt',
  },
  {
    key:   'hardware',
    label: 'רשימת פרזול',
    emoji: '🔩',
    desc:  'רשימת פריטים לספק פרזול',
    color: 'bg-amber-50 border-amber-100 text-amber-800',
    ext:   'txt',
  },
  {
    key:   'client',
    label: 'סיכום ללקוח',
    emoji: '👤',
    desc:  'הצעת מחיר / סיכום עבודה ללקוח',
    color: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    ext:   'txt',
  },
  {
    key:   'installer',
    label: 'הוראות מתקין',
    emoji: '🔧',
    desc:  'מידות והוראות לצוות ההתקנה',
    color: 'bg-violet-50 border-violet-100 text-violet-800',
    ext:   'txt',
  },
  {
    key:   'csv',
    label: 'CSV ייצור',
    emoji: '📊',
    desc:  'גיליון נתונים למפעל (CSV)',
    color: 'bg-surface-100 border-surface-200 text-ink-muted',
    ext:   'csv',
  },
]

export default function OutputsPage() {
  const uid     = useAuthStore(s => s.uid())
  const profile = useAuthStore(s => s.profile)
  const [quotes, setQuotes]       = useState([])
  const [selectedQuote, setSelected] = useState(null)
  const [preview, setPreview]     = useState(null)   // { type, content }
  const [loading, setLoading]     = useState(true)

  const businessName = profile?.profile?.businessName || profile?.profile?.name || ''

  const [searchParams] = useSearchParams()
  const urlQuoteId = searchParams.get('quoteId') || ''

  useEffect(() => {
    if (!uid) return
    return subscribeQuotes(uid, data => {
      setQuotes(data)
      setLoading(false)
      // Auto-select quote if arriving from Quotes page
      if (urlQuoteId) {
        const found = data.find(q => q.id === urlQuoteId)
        if (found) setSelected(found)
      }
    })
  }, [uid]) // eslint-disable-line

  const generate = (type) => {
    if (!selectedQuote) return
    let content = ''
    switch (type) {
      case 'glass':     content = generateGlassProduction(selectedQuote, businessName); break
      case 'hardware':  content = generateHardwareList(selectedQuote, businessName);    break
      case 'client':    content = generateClientSummary(selectedQuote, businessName);   break
      case 'installer': content = generateInstallerBrief(selectedQuote, null, businessName); break
      case 'csv':       content = generateGlassCSV(selectedQuote);                      break
    }
    setPreview({ type, content })
  }

  const download = async () => {
    if (!preview || !selectedQuote) return
    const t      = OUTPUT_TYPES.find(o => o.key === preview.type)
    const client = selectedQuote.clientName?.replace(/\s/g, '_') || 'client'
    const date   = format(new Date(), 'yyyy-MM-dd')
    const fname  = `OMS_${t.label}_${client}_${date}.${t.ext}`

    if (preview.type === 'csv') downloadCSV(preview.content, fname)
    else                        downloadTextFile(preview.content, fname)

    // Log the export
    await logExport(uid, {
      type: preview.type, quoteId: selectedQuote.id,
      clientName: selectedQuote.clientName, filename: fname,
    })
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">פלטים</h1>
          <p className="text-sm text-ink-muted">הפק מסמכים מהצעות מחיר</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">

        {/* ── Left: Quote selector + output buttons ── */}
        <div className="space-y-4">
          {/* Quote selector */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-ink">בחר הצעת מחיר</h2>
            {loading ? (
              <p className="text-sm text-ink-muted">טוען...</p>
            ) : quotes.length === 0 ? (
              <p className="text-sm text-ink-muted">אין הצעות מחיר. צור הצעה במחשבון תחילה.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {quotes.map(q => (
                  <button key={q.id} onClick={() => { setSelected(q); setPreview(null) }}
                    className={`w-full text-right p-3 rounded-xl border transition-all
                      ${selectedQuote?.id === q.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-surface-200 hover:border-brand-300 hover:bg-surface-50'}`}>
                    <p className="text-sm font-medium text-ink">{q.title || 'הצעת מחיר'}</p>
                    {q.clientName && (
                      <p className="text-xs text-ink-muted">👤 {q.clientName}</p>
                    )}
                    {q.result?.total && (
                      <p className="text-xs text-brand-600 font-medium">
                        ₪{Math.round(q.result.total).toLocaleString()}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Output type buttons */}
          {selectedQuote && (
            <div className="card space-y-2">
              <h2 className="font-semibold text-ink mb-3">סוג פלט</h2>
              {OUTPUT_TYPES.map(t => (
                <button key={t.key} onClick={() => generate(t.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border
                    text-right transition-all hover:shadow-soft
                    ${preview?.type === t.key ? t.color + ' ring-2 ring-offset-1 ring-brand-400' : 'border-surface-200 hover:border-surface-300'}
                  `}>
                  <span className="text-xl">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{t.label}</p>
                    <p className="text-xs text-ink-muted">{t.desc}</p>
                  </div>
                  <span className="text-xs text-ink-subtle shrink-0 uppercase">{t.ext}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Preview ─────────────────────── */}
        <div className="card min-h-[400px] flex flex-col">
          {!selectedQuote ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
              <span className="text-5xl mb-4">📄</span>
              <p className="font-semibold text-ink mb-1">בחר הצעת מחיר</p>
              <p className="text-sm text-ink-muted">לאחר מכן בחר סוג פלט לתצוגה מקדימה</p>
            </div>
          ) : !preview ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
              <span className="text-5xl mb-4">👆</span>
              <p className="font-semibold text-ink mb-1">בחר סוג פלט</p>
              <p className="text-sm text-ink-muted">הצעה נבחרה: {selectedQuote.clientName || selectedQuote.title}</p>
            </div>
          ) : (
            <>
              {/* Preview header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-200">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{OUTPUT_TYPES.find(t => t.key === preview.type)?.emoji}</span>
                  <h3 className="font-semibold text-ink">
                    {OUTPUT_TYPES.find(t => t.key === preview.type)?.label}
                  </h3>
                </div>
                <button onClick={download} className="btn-primary text-sm">
                  ⬇ הורד קובץ
                </button>
              </div>

              {/* Content */}
              <pre className="flex-1 text-xs font-mono text-ink leading-relaxed
                              whitespace-pre-wrap overflow-auto bg-surface-50
                              rounded-xl p-4 border border-surface-200"
                   dir="rtl">
                {preview.content}
              </pre>

              <div className="flex gap-3 mt-4 pt-3 border-t border-surface-100">
                <button onClick={download} className="btn-primary flex-1">
                  ⬇ הורד קובץ
                </button>
                <button onClick={() => navigator.clipboard?.writeText(preview.content)}
                        className="btn-secondary text-sm">
                  העתק
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
