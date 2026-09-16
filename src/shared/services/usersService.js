import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../database/firebase'

const USERS = 'users'

// Registra/actualiza al usuario; el nombre solo se toma de Google la 1ª vez.
export async function registerUser(user) {
  const email = user?.email?.toLowerCase()
  if (!email) return
  const ref = doc(db, USERS, email)
  const snap = await getDoc(ref)
  const existing = snap.exists() ? snap.data() : null
  return setDoc(
    ref,
    {
      email,
      name: existing?.name || user.displayName || email.split('@')[0],
      photoURL: user.photoURL || '',
    },
    { merge: true },
  )
}

// Guarda el perfil propio (nombre/color): persiste aunque cambie de familia.
export function setUserProfile(email, patch) {
  return setDoc(doc(db, USERS, email.toLowerCase()), patch, { merge: true })
}

// Devuelve el familyId guardado del usuario, o null.
export async function getUserFamilyId(email) {
  const snap = await getDoc(doc(db, USERS, email.toLowerCase()))
  return snap.exists() ? snap.data().familyId || null : null
}

// Lee un usuario puntual (existencia, foto...); null si no existe.
export async function getUser(email) {
  const snap = await getDoc(doc(db, USERS, email.toLowerCase()))
  return snap.exists() ? snap.data() : null
}

// Apunta al usuario a una familia.
export function setUserFamilyId(email, familyId) {
  return setDoc(doc(db, USERS, email.toLowerCase()), { familyId }, { merge: true })
}

// Marca una invitación pendiente para que el invitado la vea al entrar.
export function setUserPendingFamilyId(email, familyId) {
  return setDoc(doc(db, USERS, email.toLowerCase()), { pendingFamilyId: familyId }, { merge: true })
}

// Limpia la invitación pendiente (al aceptar o rechazar).
export function clearUserPending(email) {
  return setDoc(doc(db, USERS, email.toLowerCase()), { pendingFamilyId: null }, { merge: true })
}

// Escucha el doc del usuario logueado (familyId, pendingFamilyId...).
export function subscribeUser(email, onChange) {
  return onSnapshot(doc(db, USERS, email.toLowerCase()), (snap) => {
    onChange(snap.exists() ? snap.data() : null)
  })
}

// Preferencias personales del usuario (no se comparten con la familia).
export function setUserPrefs(email, patch) {
  return setDoc(doc(db, USERS, email.toLowerCase()), { prefs: patch }, { merge: true })
}


