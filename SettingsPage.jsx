// src/firebase/db.js
import {
  collection, doc,
  addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs,
  query, where, orderBy, limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'
import { db } from './config'

// ─── Helpers ─────────────────────────────────────────────────
const userCol = (uid, col) => collection(db, 'users', uid, col)
const userDoc = (uid, col, id) => doc(db, 'users', uid, col, id)

// ─── CLIENTS ─────────────────────────────────────────────────
export const clientsRef = (uid) => userCol(uid, 'clients')

export const addClient = (uid, data) =>
  addDoc(userCol(uid, 'clients'), { ...data, createdAt: serverTimestamp() })

export const updateClient = (uid, id, data) =>
  updateDoc(userDoc(uid, 'clients', id), { ...data, updatedAt: serverTimestamp() })

export const deleteClient = (uid, id) =>
  deleteDoc(userDoc(uid, 'clients', id))

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
