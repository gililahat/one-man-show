// src/store/authStore.js
import { create } from 'zustand'
import { onAuthChange, fetchUserProfile } from '@/firebase/auth'

const useAuthStore = create((set, get) => ({
  user: null,         // Firebase Auth user
  profile: null,      // Firestore user document
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  // Called once on app mount
  init: () => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        set({ user: firebaseUser, loading: true })
        const profile = await fetchUserProfile(firebaseUser.uid)
        set({ profile, loading: false, initialized: true })
      } else {
        set({ user: null, profile: null, loading: false, initialized: true })
      }
    })
    return unsubscribe
  },

  // Helpers
  isLoggedIn: () => !!get().user,
  uid: () => get().user?.uid,
  displayName: () => get().user?.displayName || get().profile?.profile?.name || 'משתמש',
}))

export default useAuthStore
