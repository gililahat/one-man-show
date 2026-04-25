// src/firebase/db.js
import {
  collection, doc,
  addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs,
  query, where, orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './config'

// ─── STORAGE (logo, photos) ──────────────────────────────────
const safeFileName = (name) => {
  const ext  = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  // keep only ASCII letters/digits; non-ASCII names get a short hash-ish fallback
  const base = name.slice(0, name.length - ext.length).replace(/[^a-zA-Z0-9_-]/g, '')
  return (base || 'logo') + ext.toLowerCase()
}

export const uploadUserLogo = async (uid, file) => {
  const path = `users/${uid}/logo/${Date.now()}_${safeFileName(file.name)}`
  const ref  = storageRef(storage, path)
  await uploadBytes(ref, file, { contentType: file.type || 'image/png' })
  const url = await getDownloadURL(ref)
  return { url, path }
}

export const deleteUserLogo = async (path) => {
  if (!path) return
  try { await deleteObject(storageRef(storage, path)) } catch { /* ignore */ }
}

// ─── Helpers ─────────────────────────────────────────────────
const userCol = (uid, col) => collection(db, 'users', uid, col)
const userDoc = (uid, col, id) => doc(db, 'users', uid, col, id)

// ─── Public quotes (readable without auth) ───────────────────
// JSON round-trip removes undefined/NaN/Infinity — Firestore rejects those
const sanitize = (obj) => JSON.parse(JSON.stringify(obj ?? {}))

export const publishQuote = async (uid, quoteId, snapshotData) => {
  const clean = sanitize(snapshotData)
  // Write to publicQuotes (allow read: if true — accessible to anyone)
  await setDoc(doc(db, 'publicQuotes', quoteId), {
    uid,
    ...clean,
    updatedAt: serverTimestamp(),
  })
  // Also mark private quote as public so client-approval rule works
  await updateDoc(doc(db, 'users', uid, 'quotes', quoteId), {
    isPublic: true,
    updatedAt: serverTimestamp(),
  })
}

export const getPublicQuote = async (_uid, quoteId) => {
  const snap = await getDoc(doc(db, 'publicQuotes', quoteId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// ─── CLIENTS ─────────────────────────────────────────────────
export const clientsRef = (uid) => userCol(uid, 'clients')

export const addClient = (uid, data) =>
  addDoc(userCol(uid, 'clients'), { ...data, createdAt: serverTimestamp() })

export const updateClient = (uid, id, data) =>
  updateDoc(userDoc(uid, 'clients', id), { ...data, updatedAt: serverTimestamp() })

export const deleteClient = (uid, id) =>
  deleteDoc(userDoc(uid, 'clients', id))

// ─── DANGER: wipe work data (clients/projects/quotes/supplierOrders) ──
export const wipeWorkData = async (uid) => {
  const collectionsToWipe = ['clients', 'projects', 'quotes', 'supplierOrders']
  const counts = {}
  for (const col of collectionsToWipe) {
    const snap = await getDocs(userCol(uid, col))
    counts[col] = snap.docs.length
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  }
  return counts
}

export const getClient = async (uid, clientId) => {
  const snap = await getDoc(userDoc(uid, 'clients', clientId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const getClients = async (uid) => {
  const q = query(userCol(uid, 'clients'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const subscribeClients = (uid, callback) =>
  onSnapshot(
    query(userCol(uid, 'clients'), orderBy('createdAt', 'desc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

export const subscribeClient = (uid, id, callback) =>
  onSnapshot(userDoc(uid, 'clients', id), snap =>
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  )

export const getOrdersByClient = async (uid, clientId, clientName) => {
  const [snapId, snapName] = await Promise.all([
    getDocs(query(userCol(uid, 'supplierOrders'), where('clientId',   '==', clientId))),
    clientName
      ? getDocs(query(userCol(uid, 'supplierOrders'), where('clientName', '==', clientName)))
      : Promise.resolve({ docs: [] }),
  ])
  const byId   = snapId.docs.map(d => ({ id: d.id, ...d.data() }))
  const seen   = new Set(byId.map(d => d.id))
  const byName = snapName.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !seen.has(d.id))
  return [...byId, ...byName]
}

export const getProjectsByClientSub = (uid, clientId, clientName, callback) => {
  let resultById   = []
  let resultByName = []
  const merge = () => {
    const seen = new Set(resultById.map(d => d.id))
    callback([...resultById, ...resultByName.filter(d => !seen.has(d.id))])
  }
  const unsubId = onSnapshot(
    query(userCol(uid, 'projects'), where('clientId', '==', clientId)),
    snap => { resultById = snap.docs.map(d => ({ id: d.id, ...d.data() })); merge() }
  )
  const unsubName = clientName
    ? onSnapshot(
        query(userCol(uid, 'projects'), where('clientName', '==', clientName)),
        snap => { resultByName = snap.docs.map(d => ({ id: d.id, ...d.data() })); merge() }
      )
    : () => {}
  return () => { unsubId(); unsubName() }
}

// ─── PROJECTS ────────────────────────────────────────────────
export const addProject = (uid, data) =>
  addDoc(userCol(uid, 'projects'), { ...data, createdAt: serverTimestamp(), status: 'new' })

export const updateProject = (uid, id, data) =>
  updateDoc(userDoc(uid, 'projects', id), { ...data, updatedAt: serverTimestamp() })

export const deleteProject = (uid, id) =>
  deleteDoc(userDoc(uid, 'projects', id))

export const getProjects = async (uid) => {
  const q = query(userCol(uid, 'projects'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const subscribeProjects = (uid, callback) =>
  onSnapshot(
    query(userCol(uid, 'projects'), orderBy('createdAt', 'desc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

export const getProjectsByClient = async (uid, clientId) => {
  const q = query(userCol(uid, 'projects'), where('clientId', '==', clientId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── SUPPLIERS ───────────────────────────────────────────────
export const addSupplier = (uid, data) =>
  addDoc(userCol(uid, 'suppliers'), { ...data, createdAt: serverTimestamp() })

export const updateSupplier = (uid, id, data) =>
  updateDoc(userDoc(uid, 'suppliers', id), { ...data, updatedAt: serverTimestamp() })

export const deleteSupplier = (uid, id) =>
  deleteDoc(userDoc(uid, 'suppliers', id))

export const subscribeSuppliers = (uid, callback) =>
  onSnapshot(
    query(userCol(uid, 'suppliers'), orderBy('createdAt', 'desc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

export const getSuppliers = async (uid) => {
  const snap = await getDocs(query(userCol(uid, 'suppliers'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── SUPPLIER ORDERS ─────────────────────────────────────────
export const addOrder = (uid, data) =>
  addDoc(userCol(uid, 'supplierOrders'), {
    ...data, status: 'draft', createdAt: serverTimestamp(),
  })

export const updateOrder = (uid, id, data) =>
  updateDoc(userDoc(uid, 'supplierOrders', id), { ...data, updatedAt: serverTimestamp() })

export const deleteOrder = (uid, id) =>
  deleteDoc(userDoc(uid, 'supplierOrders', id))

export const subscribeOrders = (uid, callback) =>
  onSnapshot(
    query(userCol(uid, 'supplierOrders'), orderBy('createdAt', 'desc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

// ─── EXPORTS LOG ─────────────────────────────────────────────
export const logExport = (uid, data) =>
  addDoc(userCol(uid, 'exports'), { ...data, createdAt: serverTimestamp() })

// ─── QUOTES ──────────────────────────────────────────────────
export const addQuote = (uid, data) =>
  addDoc(userCol(uid, 'quotes'), {
    ...data,
    status: 'draft',
    createdAt: serverTimestamp(),
  })

export const updateQuote = (uid, id, data) =>
  updateDoc(userDoc(uid, 'quotes', id), { ...data, updatedAt: serverTimestamp() })

export const deleteQuote = (uid, id) =>
  deleteDoc(userDoc(uid, 'quotes', id))

export const getQuotes = async (uid) => {
  const q = query(userCol(uid, 'quotes'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const subscribeQuotes = (uid, callback) =>
  onSnapshot(
    query(userCol(uid, 'quotes'), orderBy('createdAt', 'desc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

export const getQuote = async (uid, id) => {
  const snap = await getDoc(userDoc(uid, 'quotes', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const subscribeQuote = (uid, id, callback, onError) =>
  onSnapshot(
    userDoc(uid, 'quotes', id),
    snap => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    err => { console.error('subscribeQuote error:', err); onError?.(err) }
  )

export const subscribeQuotesByClient = (uid, clientId, clientName, callback) => {
  let byId = [], byName = []
  const merge = () => {
    const seen = new Set(byId.map(q => q.id))
    const merged = [...byId, ...byName.filter(q => !seen.has(q.id))]
    merged.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    callback(merged)
  }
  const u1 = onSnapshot(
    query(userCol(uid, 'quotes'), where('clientId', '==', clientId)),
    snap => { byId = snap.docs.map(d => ({ id: d.id, ...d.data() })); merge() }
  )
  const u2 = onSnapshot(
    query(userCol(uid, 'quotes'), where('clientName', '==', clientName)),
    snap => { byName = snap.docs.map(d => ({ id: d.id, ...d.data() })); merge() }
  )
  return () => { u1(); u2() }
}

export const getQuotesByProject = async (uid, projectId) => {
  const q = query(userCol(uid, 'quotes'), where('projectId', '==', projectId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const getQuotesByClient = async (uid, clientId) => {
  const q = query(userCol(uid, 'quotes'), where('clientId', '==', clientId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const getQuotesByClientName = async (uid, clientName) => {
  const q = query(userCol(uid, 'quotes'), where('clientName', '==', clientName))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const getOrdersByQuote = async (uid, quoteId) => {
  const q = query(userCol(uid, 'supplierOrders'), where('quoteId', '==', quoteId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const getOrdersByProject = async (uid, projectId) => {
  const q = query(userCol(uid, 'supplierOrders'), where('projectId', '==', projectId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── PRICING SETTINGS (calculator constants in Firebase) ─────
export const getPricingSettings = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'pricing'))
  return snap.exists() ? snap.data() : null
}

export const savePricingSettings = (uid, data) =>
  setDoc(doc(db, 'users', uid, 'settings', 'pricing'), data)

export const addAppointment = (uid, data) =>
  addDoc(userCol(uid, 'appointments'), { ...data, createdAt: serverTimestamp() })

export const updateAppointment = (uid, id, data) =>
  updateDoc(userDoc(uid, 'appointments', id), { ...data, updatedAt: serverTimestamp() })

export const deleteAppointment = (uid, id) =>
  deleteDoc(userDoc(uid, 'appointments', id))

export const getAppointments = async (uid) => {
  const q = query(userCol(uid, 'appointments'), orderBy('date', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const subscribeAppointments = (uid, callback) =>
  onSnapshot(
    query(userCol(uid, 'appointments'), orderBy('date', 'asc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

// ─── EXPENSES ─────────────────────────────────────────────────
export const addExpense = (uid, data) =>
  addDoc(userCol(uid, 'expenses'), { ...data, createdAt: serverTimestamp() })

export const updateExpense = (uid, id, data) =>
  updateDoc(userDoc(uid, 'expenses', id), { ...data, updatedAt: serverTimestamp() })

export const deleteExpense = (uid, id) =>
  deleteDoc(userDoc(uid, 'expenses', id))

export const subscribeExpenses = (uid, callback) =>
  onSnapshot(
    query(userCol(uid, 'expenses'), orderBy('date', 'desc')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

// ─── UX SETTINGS ──────────────────────────────────────────────
export const getUxSettings = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'ux'))
  return snap.exists() ? snap.data() : null
}

export const saveUxSettings = (uid, data) =>
  setDoc(doc(db, 'users', uid, 'settings', 'ux'), data)

// ─── GLOBAL SETTINGS ──────────────────────────────────────────
export const getGlobalSettings = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'global'))
  return snap.exists() ? snap.data() : null
}

export const saveGlobalSettings = (uid, data) =>
  setDoc(doc(db, 'users', uid, 'settings', 'global'), data)

// ─── TOKEN HELPERS ────────────────────────────────────────────
// Cryptographically strong random token (32 hex chars = ~128 bits of entropy).
// Falls back to Math.random if crypto API unavailable.
export const generateToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID)
    return crypto.randomUUID().replace(/-/g, '')
  return Math.random().toString(36).substring(2, 18) +
         Math.random().toString(36).substring(2, 18) +
         Date.now().toString(36)
}

// ─── SUPPLIER CONFIRMATION TOKENS ────────────────────────────
export const createSupplierToken = (token, data) =>
  setDoc(doc(db, 'supplierTokens', token), { ...data, confirmed: false, createdAt: serverTimestamp() })

export const getSupplierToken = async (token) => {
  const snap = await getDoc(doc(db, 'supplierTokens', token))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const confirmSupplierToken = (token) =>
  updateDoc(doc(db, 'supplierTokens', token), { confirmed: true, confirmedAt: serverTimestamp() })

export const subscribeSupplierToken = (token, callback) =>
  onSnapshot(doc(db, 'supplierTokens', token), snap =>
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  )

// ─── BOOKING TOKENS ───────────────────────────────────────────
export const createBookingToken = (token, data) =>
  setDoc(doc(db, 'bookingTokens', token), { ...data, booked: false, createdAt: serverTimestamp() })

export const getBookingToken = async (token) => {
  const snap = await getDoc(doc(db, 'bookingTokens', token))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const confirmBooking = (token, slot, clientInfo) =>
  updateDoc(doc(db, 'bookingTokens', token), {
    booked: true, bookedAt: serverTimestamp(),
    bookedSlot: slot, ...clientInfo,
  })

// ─── CLIENT QUOTE APPROVAL (unauthenticated) ──────────────────
export const approvePublicQuote = (uid, quoteId) =>
  Promise.all([
    // Update public copy
    updateDoc(doc(db, 'publicQuotes', quoteId), {
      clientApproved: true, clientApprovedAt: serverTimestamp(),
    }),
    // Update private copy so owner sees approval in QuoteViewPage
    updateDoc(doc(db, 'users', uid, 'quotes', quoteId), {
      clientApproved: true, clientApprovedAt: serverTimestamp(),
    }),
  ])

// ─── SUBSCRIBE BOOKING TOKEN ──────────────────────────────────
export const subscribeBookingToken = (token, callback) =>
  onSnapshot(doc(db, 'bookingTokens', token), snap =>
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  )

export const activateBookingToken = (token) =>
  updateDoc(doc(db, 'bookingTokens', token), {
    suppliersConfirmed: true, activatedAt: serverTimestamp(),
  })

// ─── SUPPLIER TOKENS BY BOOKING ───────────────────────────────
export const getSupplierTokensByBookingToken = async (bookingTokenId) => {
  const q = query(collection(db, 'supplierTokens'), where('bookingTokenId', '==', bookingTokenId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const subscribeSupplierTokensByQuote = (quoteId, callback) =>
  onSnapshot(
    query(collection(db, 'supplierTokens'), where('quoteId', '==', quoteId)),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

// ─── BOOKED SLOTS (for availability check on public booking page) ──
export const getBookedSlotsForUser = async (uid) => {
  const q = query(
    collection(db, 'bookingTokens'),
    where('uid', '==', uid),
    where('booked', '==', true),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// Subscribe to booked slots for this user — used by AppointmentsPage to show bookings as work events
export const subscribeBookedSlotsForUser = (uid, callback) =>
  onSnapshot(
    query(
      collection(db, 'bookingTokens'),
      where('uid', '==', uid),
      where('booked', '==', true),
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

// ─── BOOKING SETTINGS ─────────────────────────────────────────
export const getBookingSettings = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid, 'settings', 'booking'))
  return snap.exists() ? snap.data() : null
}

export const saveBookingSettings = (uid, data) =>
  setDoc(doc(db, 'users', uid, 'settings', 'booking'), data)
