// src/hooks/usePricing.js
// ─────────────────────────────────────────────────────────────
// Merges Firebase-saved pricing with code defaults.
// Components use this instead of importing from calculatorEngine directly.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { GLASS_TYPES, PROFILE_TYPES, HARDWARE_SETS, OPENING_TYPES } from '@/utils/calculatorEngine'
import { getPricingSettings } from '@/firebase/db'
import useAuthStore from '@/store/authStore'

export default function usePricing() {
  const uid = useAuthStore(s => s.uid())

  const [pricing, setPricing] = useState({
    glassTypes:   GLASS_TYPES,
    profileTypes: PROFILE_TYPES,
    hardwareSets: HARDWARE_SETS,
    openingTypes: OPENING_TYPES, // always from code — not editable in settings
    loaded: false,
  })

  useEffect(() => {
    if (!uid) return
    getPricingSettings(uid).then(saved => {
      setPricing({
        glassTypes:   saved?.glassTypes   || GLASS_TYPES,
        profileTypes: saved?.profileTypes || PROFILE_TYPES,
        hardwareSets: saved?.hardwareSets || HARDWARE_SETS,
        openingTypes: OPENING_TYPES,
        loaded: true,
      })
    }).catch(() => {
      setPricing(p => ({ ...p, loaded: true }))
    })
  }, [uid])

  return pricing
}
