// src/store/toastStore.js
import { create } from 'zustand'

const useToastStore = create((set, get) => ({
  toasts: [],
  defaultDuration: 3000,

  setDefaultDuration: (ms) => set({ defaultDuration: ms }),

  addToast: (message, type = 'info', duration) => {
    const id = Date.now() + Math.random()
    const ms = duration ?? get().defaultDuration
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), ms)
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export default useToastStore
