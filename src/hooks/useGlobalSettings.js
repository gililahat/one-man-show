// src/hooks/useGlobalSettings.js
// Global settings hook — loads once from Firestore, cached in Zustand.
// Usage:  const { settings, loading, save } = useGlobalSettings()
import { useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import useGlobalSettingsStore from '@/store/globalSettingsStore'

export default function useGlobalSettings() {
  const uid      = useAuthStore(s => s.uid())
  const store    = useGlobalSettingsStore()

  useEffect(() => {
    if (uid) store.load(uid)
  }, [uid]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    settings: store.settings,
    loading:  store.loading,
    save: (patch) => store.save(uid, patch),
  }
}
