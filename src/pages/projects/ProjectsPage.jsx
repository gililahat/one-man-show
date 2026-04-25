// src/pages/projects/ProjectsPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import {
  subscribeProjects, addProject, updateProject, deleteProject,
  getClients, getQuotesByProject, getOrdersByProject, updateQuote,
  getSuppliers, addOrder, updateOrder,
} from '@/firebase/db'
import { formatCurrency } from '@/utils/calculatorEngine'
import useToastStore from '@/store/toastStore'
import CompletionOverlay from '@/components/ui/CompletionOverlay'
import InstallReadyNotification from '@/components/ui/InstallReadyNotification'
import ProjectWorkflowPanel from '@/components/projects/ProjectWorkflowPanel'
import useGlobalSettings from '@/hooks/useGlobalSettings'
import {
  getStages, getStage, stageBadgeStyle,
  isCompletionStage, isInstallReadyStage,
} from '@/utils/projectWorkflow'
import ActionSwitch from '@/components/ui/ActionSwitch'

export default function ProjectsPage() {
  const uid      = useAuthStore(s => s.uid())
  const profile  = useAuthStore(s => s.profile)
  const bizName  = profile?.profile?.businessName || 'ONE MAN SHOW'
  const navigate = useNavigate()
  const addToast = useToastStore(s => s.addToast)
  const { settings } = useGlobalSettings()
  const stages = getStages(settings)

  const [projects,       setProjects]   = useState([])
  const [clients,        setClients]    = useState([])
  const [suppliers,      setSuppliers]  = useState([])
  const [search,         setSearch]     = useState('')
  const [filterStatus,   setFilter]     = useState('all')
  const [modal,          setModal]      = useState(null)
  const [detailProject,  setDetail]     = useState(null)
  const [loading,        setLoading]    = useState(true)
  const [completionProj,    setCompletion]    = useState(null)
  const [installProj,       setInstall]       = useState(null)
  const [supplierOrderProj, setSupplierOrder] = useState(null)

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeProjects(uid, data => { setProjects(data); setLoading(false) })
    getClients(uid).then(setClients)
    getSuppliers(uid).then(setSuppliers)
    return unsub
  }, [uid])

  // Sync detailProject reference when projects list updates
  useEffect(() => {
    if (!detailProject) return
    const updated = projects.find(p => p.id === detailProject.id)
    if (updated) setDetail(updated)
  }, [projects]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (oldStatus, newStatus, projectData) => {
    const label = getStage(settings, newStatus)?.label || newStatus
    addToast(`✓ סטטוס עודכן: ${label}`, 'success')

    if (isCompletionStage(settings, newStatus) && !isCompletionStage(settings, oldStatus)) {
      if (settings?.completionAnimation !== false) setCompletion(projectData)
    }
    if (isInstallReadyStage(settings, newStatus) && !isInstallReadyStage(settings, oldStatus)) {
      if (settings?.whatsappNotification !== false) setInstall(projectData)
    }

    // Open supplier orders modal on project approval
    if (newStatus === 'approved' && oldStatus !== 'approved') {
      setSupplierOrder(projectData)
    }
  }

  const filtered = projects.filter(p => {
    const matchSearch = p.title?.includes(search) || p.clientName?.includes(search)
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleDelete = async (id) => {
    if (!confirm('למחוק פרויקט זה?')) return
    await deleteProject(uid, id)
    if (detailProject?.id === id) setDetail(null)
  }

  const handleCreateQuote = (project) => {
    navigate(`/quote/new?clientId=${project.clientId}&clientName=${encodeURIComponent(project.clientName||'')}&projectId=${project.id}&projectName=${encodeURIComponent(project.title)}`)
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">פרויקטים</h1>
          <p className="text-sm text-ink-muted">{projects.length} פרויקטים</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>+ פרויקט חדש</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input className="input flex-1 max-w-xs" placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          <FilterBtn active={filterStatus === 'all'} onClick={() => setFilter('all')}>הכל</FilterBtn>
          {stages.map(s => (
            <FilterBtn key={s.key} active={filterStatus === s.key} onClick={() => setFilter(s.key)}>{s.label}</FilterBtn>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${detailProject ? 'lg:grid-cols-[1fr_380px]' : ''}`}>
        <div className="space-y-3">
          {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
            <EmptyState onAdd={() => setModal('add')} hasSearch={!!search || filterStatus !== 'all'} />
          ) : (
            filtered.map(p => (
              <ProjectRow key={p.id} project={p} stages={stages} uid={uid}
                isSelected={detailProject?.id === p.id}
                onClick={() => setDetail(p)}
                onEdit={() => setModal(p)}
                onDelete={() => handleDelete(p.id)}
                onCreateQuote={() => handleCreateQuote(p)}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
        {detailProject && (
          <ProjectDetailPanel project={detailProject} uid={uid}
            onClose={() => setDetail(null)}
            onEdit={() => setModal(detailProject)}
            onCreateQuote={() => handleCreateQuote(detailProject)}
            onOpenOrders={() => setSupplierOrder(detailProject)}
            navigate={navigate}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {modal && (
        <ProjectModal project={modal === 'add' ? null : modal}
          uid={uid} clients={clients} stages={stages} onClose={() => setModal(null)}
          onStatusChange={handleStatusChange} />
      )}

      {completionProj && (
        <CompletionOverlay
          projectName={completionProj.title}
          playSound={settings?.completionSound !== false}
          onClose={() => setCompletion(null)}
        />
      )}

      {installProj && (
        <InstallReadyNotification
          project={installProj}
          settings={settings}
          onClose={() => setInstall(null)}
        />
      )}

      {supplierOrderProj && (
        <ProjectOrdersModal
          project={supplierOrderProj}
          uid={uid}
          suppliers={suppliers}
          bizName={bizName}
          onClose={() => setSupplierOrder(null)}
        />
      )}
    </div>
  )
}

function ProjectRow({ project, stages, uid, isSelected, onClick, onEdit, onDelete, onCreateQuote, onStatusChange }) {
  const stage    = stages?.find(s => s.key === project.status) ?? stages?.[0]
  const stageIdx = stages?.findIndex(s => s.key === project.status) ?? 0

  // Milestone switch logic
  // "הפעל פרויקט" → move from stage 0-2 (new/measured/quoted) to 'approved' (idx 3)
  // "שלח לביצוע"  → move from 'approved' (idx 3) to 'production' (idx 4)
  const approvedStage   = stages?.find(s => s.key === 'approved')
  const productionStage = stages?.find(s => s.key === 'production')

  const showActivate   = stageIdx <= 2 && approvedStage
  const showProduction = project.status === 'approved' && productionStage

  const handleMilestone = async (e, toKey) => {
    e.stopPropagation()
    const prev = project.status
    await updateProject(uid, project.id, { status: toKey })
    onStatusChange?.(prev, toKey, { ...project, status: toKey })
  }

  return (
    <div onClick={onClick}
         className={`card cursor-pointer hover:shadow-card transition-all group ${isSelected ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 text-xl">📁</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink">{project.title}</p>
            {stage && (
              <span className="badge text-xs font-medium px-2 py-0.5 rounded-lg"
                    style={stageBadgeStyle(stage)}>
                {stage.label}
              </span>
            )}
          </div>
          {project.clientName && <p className="text-sm text-ink-muted mt-0.5">👤 {project.clientName}</p>}
          {project.description && <p className="text-xs text-ink-subtle mt-0.5 truncate">{project.description}</p>}
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          <button className="btn-primary text-xs" onClick={onCreateQuote}>+ הצעה</button>
          <button className="btn-secondary text-xs" onClick={onEdit}>עריכה</button>
          <button className="btn-ghost text-xs text-danger" onClick={onDelete}>מחיקה</button>
        </div>
      </div>

      {/* Milestone switches */}
      {(showActivate || showProduction) && (
        <div className="mt-3 pt-3 border-t border-surface-300 flex items-center" onClick={e => e.stopPropagation()}>
          {showActivate && (
            <ActionSwitch
              label="הפעל פרויקט"
              labelOn="פרויקט פעיל"
              active={false}
              onToggle={() => handleMilestone({ stopPropagation: () => {} }, 'approved')}
              color="gold"
            />
          )}
          {showProduction && (
            <ActionSwitch
              label="שלח לביצוע"
              labelOn="בייצור ✓"
              active={false}
              onToggle={() => handleMilestone({ stopPropagation: () => {} }, 'production')}
              color="green"
            />
          )}
        </div>
      )}
    </div>
  )
}

function ProjectDetailPanel({ project, uid, onClose, onEdit, onCreateQuote, onOpenOrders, navigate, onStatusChange }) {
  const [quotes, setQuotes] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getQuotesByProject(uid, project.id), getOrdersByProject(uid, project.id)])
      .then(([q, o]) => { setQuotes(q); setOrders(o); setLoading(false) })
  }, [project.id, uid])

  const totalQuoted = quotes.reduce((s, q) => s + (q.result?.total || 0), 0)

  return (
    <div className="card sticky top-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-ink">{project.title}</h3>
          {project.clientName && <p className="text-sm text-ink-muted">👤 {project.clientName}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100 text-xs">✕</button>
      </div>

      {/* Workflow panel — settings-driven stage pipeline */}
      <div className="border-t border-surface-100 pt-3">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Workflow</p>
        <ProjectWorkflowPanel
          project={project}
          uid={uid}
          orders={orders}
          onStatusChanged={onStatusChange}
        />
      </div>

      {project.description && <p className="text-sm text-ink-muted border-t border-surface-100 pt-3">{project.description}</p>}

      <div className="space-y-2">
        <button className="btn-primary w-full text-sm" onClick={onOpenOrders}>📦 הזמנות ספקים</button>
        <button className="btn-secondary w-full text-sm" onClick={onCreateQuote}>🧮 צור הצעת מחיר</button>
        <button className="btn-ghost w-full text-sm text-ink-muted" onClick={onEdit}>✏️ ערוך פרויקט</button>
      </div>

      <LinkedSection title={`הצעות מחיר (${quotes.length})`} extra={totalQuoted > 0 ? formatCurrency(totalQuoted) : null} loading={loading} empty="אין הצעות מחיר עדיין">
        {quotes.map(q => (
          <QuoteLinkedItem
            key={q.id}
            quote={q}
            project={project}
            navigate={navigate}
            onApprove={() => {
              setQuotes(prev => prev.map(x => x.id === q.id ? { ...x, status: 'approved' } : x))
              updateQuote(uid, q.id, { status: 'approved' })
            }}
          />
        ))}
      </LinkedSection>

      <LinkedSection title={`הזמנות ספקים (${orders.length})`} loading={loading} empty="אין הזמנות עדיין">
        {orders.map(o => (
          <LinkedItem key={o.id} label={o.supplierName || 'ספק'} value={o.totalAmount ? formatCurrency(o.totalAmount) : ''}
            status={o.status} statusColors={{ draft:'badge-neutral', sent:'badge-info', confirmed:'badge-success', in_prod:'badge-warning', ready:'badge-success', delivered:'badge-neutral' }}
            statusLabels={{ draft:'טיוטה', sent:'נשלח', confirmed:'אושר', in_prod:'בייצור', ready:'מוכן', delivered:'סופק' }}
            onClick={() => navigate('/orders')} />
        ))}
      </LinkedSection>
    </div>
  )
}

function QuoteLinkedItem({ quote, project, navigate, onApprove }) {
  const statusColors = { draft:'badge-neutral', sent:'badge-info', approved:'badge-success', rejected:'badge-danger' }
  const statusLabels = { draft:'טיוטה', sent:'נשלח', approved:'אושר', rejected:'נדחה' }

  const handleCreateOrder = () => {
    const params = new URLSearchParams({
      quoteId:     quote.id,
      clientName:  project.clientName || '',
      clientId:    project.clientId   || '',
      projectName: project.title      || '',
      projectId:   project.id,
    })
    navigate(`/orders?${params}`)
  }

  return (
    <div className="rounded-xl bg-surface-50 overflow-hidden">
      <button
        onClick={() => navigate(`/quotes/${quote.id}`)}
        className="w-full flex items-center justify-between p-2.5 hover:bg-surface-100 transition-colors text-right"
      >
        <span className="text-sm text-ink truncate flex-1">{quote.title || 'הצעת מחיר'}</span>
        <div className="flex items-center gap-2 shrink-0">
          {quote.result?.total > 0 && (
            <span className="text-xs font-medium text-brand-600">{formatCurrency(quote.result.total)}</span>
          )}
          <span className={`badge ${statusColors[quote.status] || 'badge-neutral'}`}>
            {statusLabels[quote.status] || quote.status}
          </span>
        </div>
      </button>

      {quote.status === 'sent' && (
        <div className="px-2.5 pb-2.5">
          <button onClick={onApprove} className="btn-primary w-full text-xs">
            ✓ הצעה אושרה
          </button>
        </div>
      )}

      {quote.status === 'approved' && (
        <div className="px-2.5 pb-2.5">
          <button onClick={handleCreateOrder} className="btn-secondary w-full text-xs">
            📦 צור הזמנת ספקים
          </button>
        </div>
      )}
    </div>
  )
}

function LinkedSection({ title, extra, loading, empty, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{title}</p>
        {extra && <span className="text-xs font-medium text-brand-600">{extra}</span>}
      </div>
      {loading ? <div className="h-8 bg-surface-100 rounded-xl animate-pulse" />
        : React.Children.count(children) === 0 ? <p className="text-xs text-ink-subtle py-2">{empty}</p>
        : <div className="space-y-1.5">{children}</div>}
    </div>
  )
}

function LinkedItem({ label, value, status, statusColors, statusLabels, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors text-right">
      <span className="text-sm text-ink truncate flex-1">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {value && <span className="text-xs font-medium text-brand-600">{value}</span>}
        <span className={`badge ${statusColors[status]||'badge-neutral'}`}>{statusLabels[status]||status}</span>
      </div>
    </button>
  )
}

// ─── Project Orders Modal ─────────────────────────────────────
function ProjectOrdersModal({ project, uid, suppliers, bizName, onClose }) {
  const [orders,    setOrders]    = useState([])
  const [quotes,    setQuotes]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)

  useEffect(() => {
    Promise.all([
      getOrdersByProject(uid, project.id),
      getQuotesByProject(uid, project.id),
    ]).then(([o, q]) => {
      setOrders(o)
      setQuotes(q)
      setLoading(false)
      if (o.length === 0) setShowForm(true)
    })
  }, [uid, project.id])

  const handleOrderSaved = (newOrder) => {
    setOrders(prev => [...prev, newOrder])
    setShowForm(false)
  }

  const handleSendWhatsApp = (order) => {
    const waNum = (order.supplierPhone || '').replace(/[^0-9]/g, '').replace(/^0/, '972')
    if (!waNum) return
    const itemsText = order.orderItems?.filter(i => i.desc).length > 0
      ? order.orderItems.filter(i => i.desc).map((it, i) => `${i + 1}. ${it.desc}${it.dims ? ' | ' + it.dims + ' מ"מ' : ''} × ${it.qty}`).join('\n')
      : (order.items || '')
    const msg = [
      `הזמנה מ: ${bizName}`,
      `לקוח: ${order.clientName || ''}`,
      `פרויקט: ${order.projectName || ''}`,
      ``,
      itemsText,
      order.notes ? `\nהערות: ${order.notes}` : '',
      order.totalAmount > 0 ? `\nסה"כ: ₪${Number(order.totalAmount).toLocaleString()}` : '',
      order.deliveryDate ? `\nאספקה: ${order.deliveryDate}` : '',
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank')
    updateOrder(uid, order.id, { status: 'sent' })
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'sent' } : o))
  }

  const ORDER_STATUS_LABELS = { draft:'טיוטה', sent:'נשלח', confirmed:'אושר', in_prod:'בייצור', ready:'מוכן', delivered:'סופק' }
  const ORDER_STATUS_COLORS = { draft:'badge-neutral', sent:'badge-info', confirmed:'badge-success', in_prod:'badge-warning', ready:'badge-success', delivered:'badge-neutral' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90dvh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-200">
          <div>
            <h3 className="text-lg font-semibold text-ink">📦 הזמנות ספקים</h3>
            <p className="text-sm text-ink-muted">{project.title}{project.clientName ? ` — ${project.clientName}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Existing orders */}
          {loading ? (
            <div className="h-16 bg-surface-100 rounded-xl animate-pulse" />
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map(o => (
                <div key={o.id} className="rounded-xl border border-surface-200 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-ink">{o.supplierName || 'ספק'}</p>
                      {o.deliveryDate && <p className="text-xs text-ink-subtle">📅 אספקה: {o.deliveryDate}</p>}
                    </div>
                    <span className={`badge ${ORDER_STATUS_COLORS[o.status] || 'badge-neutral'} shrink-0`}>
                      {ORDER_STATUS_LABELS[o.status] || o.status}
                    </span>
                  </div>
                  {o.orderItems?.filter(i => i.desc).length > 0 ? (
                    <div className="space-y-0.5">
                      {o.orderItems.filter(i => i.desc).map((it, idx) => (
                        <p key={idx} className="text-xs text-ink-muted">
                          {idx + 1}. {it.desc}{it.dims ? ` | ${it.dims} מ"מ` : ''} × {it.qty}
                        </p>
                      ))}
                    </div>
                  ) : o.items ? (
                    <p className="text-xs text-ink-muted whitespace-pre-line">{o.items}</p>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    {o.supplierPhone && (
                      <button
                        className="btn-primary text-xs flex items-center gap-1"
                        onClick={() => handleSendWhatsApp(o)}
                      >
                        📱 שלח לספק
                      </button>
                    )}
                    {o.status === 'sent' && <span className="text-xs text-success self-center">✓ נשלח</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : !showForm ? (
            <p className="text-sm text-ink-muted text-center py-4">אין הזמנות עדיין לפרויקט זה</p>
          ) : null}

          {/* Add order form */}
          {showForm ? (
            <QuickOrderForm
              project={project}
              uid={uid}
              suppliers={suppliers}
              quotes={quotes}
              bizName={bizName}
              onSaved={handleOrderSaved}
              onCancel={orders.length > 0 ? () => setShowForm(false) : null}
            />
          ) : (
            <button className="btn-secondary w-full text-sm" onClick={() => setShowForm(true)}>
              + הוסף הזמנה לספק נוסף
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Quick Order Form (inside ProjectOrdersModal) ─────────────
function QuickOrderForm({ project, uid, suppliers, quotes, bizName, onSaved, onCancel }) {
  const primary = suppliers.find(s => s.isPrimary) || suppliers[0]
  const [supplierId, setSupplierId] = useState(primary?.id || '')
  const [orderItems, setOrderItems] = useState([{ desc: '', dims: '', qty: 1 }])
  const [totalAmount,  setTotal]    = useState('')
  const [deliveryDate, setDelivery] = useState('')
  const [notes, setNotes]           = useState('')
  const [saving, setSaving]         = useState(false)

  const selectedSupplier = suppliers.find(s => s.id === supplierId)

  // Pre-fill items from latest approved quote
  useEffect(() => {
    const approved = quotes.find(q => q.status === 'approved') || quotes[0]
    if (!approved) return
    const rows = []
    if (approved.panels?.length > 0)
      approved.panels.forEach((p, i) => rows.push({ desc: p.label || `פנל ${i + 1}`, dims: `${p.width}×${p.height}`, qty: 1 }))
    if (approved.items?.length > 0)
      approved.items.forEach(it => rows.push({ desc: it.name || '', dims: '', qty: it.qty || 1 }))
    if (rows.length > 0) setOrderItems(rows)
  }, [quotes])

  const addRow    = () => setOrderItems(p => [...p, { desc: '', dims: '', qty: 1 }])
  const removeRow = (i) => setOrderItems(p => p.filter((_, idx) => idx !== i))
  const updateRow = (i, k, v) => setOrderItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  const buildData = () => {
    const itemsText = orderItems.filter(i => i.desc)
      .map((it, i) => `${i + 1}. ${it.desc}${it.dims ? ' | ' + it.dims + ' מ"מ' : ''} × ${it.qty}`)
      .join('\n')
    return {
      supplierId,
      supplierName:  selectedSupplier?.name  || '',
      supplierPhone: selectedSupplier?.phone || '',
      supplierEmail: selectedSupplier?.email || '',
      supplierType:  selectedSupplier?.type  || 'private',
      clientName:    project.clientName || '',
      clientId:      project.clientId   || '',
      projectName:   project.title      || '',
      projectId:     project.id,
      orderItems,
      items:         itemsText,
      totalAmount:   Number(totalAmount) || 0,
      deliveryDate,
      notes,
    }
  }

  const handleSave = async () => {
    if (!supplierId) return
    setSaving(true)
    const data = buildData()
    const ref  = await addOrder(uid, data)
    onSaved({ id: ref.id, ...data, status: 'draft' })
    setSaving(false)
  }

  const handleSaveAndSend = async () => {
    if (!supplierId) return
    const waNum = (selectedSupplier?.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '972')
    if (!waNum) { alert('לספק אין מספר טלפון — הוסף בדף ספקים'); return }
    setSaving(true)
    const data = buildData()
    const ref  = await addOrder(uid, data)
    const savedId = ref.id
    // Mark as sent
    updateOrder(uid, savedId, { status: 'sent' })
    // Build WhatsApp message
    const itemsLines = orderItems.filter(i => i.desc)
      .map((it, i) => `${i + 1}. ${it.desc}${it.dims ? ' | ' + it.dims + ' מ"מ' : ''} × ${it.qty}`)
      .join('\n')
    const msg = [
      `הזמנה מ: ${bizName}`,
      `לקוח: ${project.clientName || ''}`,
      `פרויקט: ${project.title || ''}`,
      ``,
      itemsLines,
      notes          ? `\nהערות: ${notes}` : '',
      totalAmount    ? `\nסה"כ: ₪${Number(totalAmount).toLocaleString()}` : '',
      deliveryDate   ? `\nאספקה: ${deliveryDate}` : '',
      ``,
      `אנא אשר קבלה`,
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank')
    onSaved({ id: savedId, ...data, status: 'sent' })
    setSaving(false)
  }

  return (
    <div className="rounded-xl border-2 border-brand-200 bg-brand-50/30 p-4 space-y-3">
      <p className="text-sm font-semibold text-ink">הזמנה חדשה לספק</p>

      {/* Supplier */}
      <div>
        <label className="label text-xs">ספק</label>
        <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          <option value="">— בחר ספק —</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}{s.isPrimary ? ' ★' : ''}</option>
          ))}
        </select>
      </div>

      {/* Supplier contact */}
      {selectedSupplier && (
        <div className="text-xs text-ink-muted space-y-0.5 bg-white rounded-lg p-2 border border-surface-200">
          {selectedSupplier.phone   && <p dir="ltr">📞 {selectedSupplier.phone}</p>}
          {selectedSupplier.email   && <p dir="ltr">✉️ {selectedSupplier.email}</p>}
          {selectedSupplier.address && <p>📍 {selectedSupplier.address}</p>}
        </div>
      )}

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="label text-xs mb-0">פריטים</label>
          <button type="button" onClick={addRow} className="text-xs text-brand-600 font-medium">+ הוסף שורה</button>
        </div>
        <div className="rounded-lg border border-surface-200 overflow-hidden bg-white">
          <div className="grid gap-0 text-xs text-ink-muted bg-surface-50 px-3 py-1.5"
               style={{ gridTemplateColumns: '1fr 88px 46px 22px' }}>
            <span>תיאור</span><span>מידות (מ"מ)</span><span className="text-center">כמות</span><span />
          </div>
          {orderItems.map((item, i) => (
            <div key={i} className="grid gap-1 px-2 py-1.5 border-t border-surface-100 items-center"
                 style={{ gridTemplateColumns: '1fr 88px 46px 22px' }}>
              <input className="input py-1 text-xs" placeholder='סוג / תיאור'
                value={item.desc} onChange={e => updateRow(i, 'desc', e.target.value)} />
              <input className="input py-1 text-xs" placeholder="800×2000"
                value={item.dims} dir="ltr" onChange={e => updateRow(i, 'dims', e.target.value)} />
              <input className="input py-1 text-xs text-center" type="number" min={1}
                value={item.qty} onChange={e => updateRow(i, 'qty', e.target.value)} />
              <button type="button" onClick={() => removeRow(i)}
                      className="text-ink-subtle hover:text-danger text-sm text-center">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Total + delivery */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-xs">סה"כ (₪)</label>
          <input className="input py-1.5 text-sm" type="number" min={0} dir="ltr"
            value={totalAmount} onChange={e => setTotal(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">תאריך אספקה</label>
          <input className="input py-1.5 text-sm" type="date" dir="ltr"
            value={deliveryDate} onChange={e => setDelivery(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label text-xs">הערות</label>
        <textarea className="input resize-none text-sm py-1.5" rows={2}
          value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="flex gap-2 pt-1">
        <button className="btn-primary flex-1 text-sm" onClick={handleSaveAndSend} disabled={!supplierId || saving}>
          {saving ? 'שולח...' : '📱 שמור ושלח בווצאפ'}
        </button>
        <button className="btn-secondary text-sm" onClick={handleSave} disabled={!supplierId || saving}>
          💾 שמור
        </button>
        {onCancel && (
          <button className="btn-ghost text-sm text-ink-muted" onClick={onCancel}>ביטול</button>
        )}
      </div>
    </div>
  )
}

function ProjectModal({ project, uid, clients, stages, onClose, onStatusChange }) {
  const isEdit    = !!project
  const emptyForm = { title: '', clientId: '', clientName: '', status: stages?.[0]?.key ?? 'new', description: '', notes: '' }
  const [form, setForm] = useState(project || emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const handleClientChange = e => {
    const c = clients.find(c => c.id === e.target.value)
    setForm(f => ({ ...f, clientId: e.target.value, clientName: c?.name || '' }))
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('שם הפרויקט הוא שדה חובה'); return }
    setLoading(true)
    try {
      if (isEdit) {
        await updateProject(uid, project.id, form)
        if (onStatusChange && form.status !== project.status) {
          onStatusChange(project.status, form.status, { ...project, ...form })
        }
      } else {
        await addProject(uid, form)
      }
      onClose()
    } catch { setError('שגיאה בשמירה') } finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md max-h-[90dvh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-ink">{isEdit ? 'עריכת פרויקט' : 'פרויקט חדש'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-subtle hover:bg-surface-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">שם *</label><input className="input" value={form.title} onChange={set('title')} /></div>
          <div><label className="label">לקוח</label>
            <select className="input" value={form.clientId} onChange={handleClientChange}>
              <option value="">— בחר לקוח —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">סטטוס</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {(stages ?? []).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div><label className="label">תיאור</label><textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} /></div>
          <div><label className="label">הערות</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} /></div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'שומר...' : isEdit ? 'שמור' : 'צור'}</button>
            <button type="button" className="btn-secondary" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return <button onClick={onClick} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${active ? 'bg-brand-600 text-white' : 'bg-surface-100 text-ink-muted hover:bg-surface-200'}`}>{children}</button>
}
function LoadingSkeleton() {
  return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="card animate-pulse flex gap-4"><div className="w-10 h-10 rounded-xl bg-surface-200 shrink-0"/><div className="flex-1 space-y-2"><div className="h-4 bg-surface-200 rounded w-1/2"/><div className="h-3 bg-surface-100 rounded w-1/3"/></div></div>)}</div>
}
function EmptyState({ onAdd, hasSearch }) {
  return <div className="card flex flex-col items-center py-16 text-center"><span className="text-5xl mb-4">📁</span><p className="font-semibold text-ink mb-1">{hasSearch ? 'לא נמצאו פרויקטים' : 'אין פרויקטים עדיין'}</p><p className="text-sm text-ink-muted mb-5">{hasSearch ? 'נסה חיפוש אחר' : 'צור את הפרויקט הראשון'}</p>{!hasSearch&&<button className="btn-primary" onClick={onAdd}>+ פרויקט חדש</button>}</div>
}

import React from 'react'
