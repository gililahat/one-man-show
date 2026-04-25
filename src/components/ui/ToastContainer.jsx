// src/components/ui/ToastContainer.jsx
import useToastStore from '@/store/toastStore'

export default function ToastContainer() {
  const toasts      = useToastStore(s => s.toasts)
  const removeToast = useToastStore(s => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[90]
                    flex flex-col gap-2 items-center pointer-events-none w-max max-w-xs px-4">
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`px-4 py-3 rounded-2xl shadow-lg text-sm font-medium
                      pointer-events-auto cursor-pointer select-none
                      ${toast.type === 'success' ? 'bg-emerald-600 text-white' :
                        toast.type === 'error'   ? 'bg-red-500 text-white'     :
                        toast.type === 'warning' ? 'bg-amber-500 text-white'   :
                                                   'bg-zinc-800 text-white'}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
