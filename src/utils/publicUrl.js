// src/utils/publicUrl.js
// Returns the origin to use for shareable links (supplier confirm, booking, public quote).
// On localhost (dev), falls back to production URL so mobile recipients can actually open links.

const PRODUCTION_URL = 'https://one-man-show-606c3.web.app'

export const publicOrigin = () => {
  if (typeof window === 'undefined') return PRODUCTION_URL
  const origin = window.location.origin
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return PRODUCTION_URL
  }
  return origin
}
