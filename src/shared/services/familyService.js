import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../database/firebase'
import { copyCategoriesToFamily } from '../../modules/categories/servicios/categoriesService'

const FAMILIES = 'families'

const familyRef = (familyId) => doc(db, FAMILIES, familyId)

// Escucha el documento de la familia; devuelve la función para desuscribirse.
export function subscribeFamily(familyId, onChange) {
  return onSnapshot(familyRef(familyId), (snap) => {
    onChange(snap.exists() ? snap.data() : null)
  })
}

// Crea o actualiza campos del documento de la familia (members, categories, etc.).
export function updateFamily(familyId, patch) {
  return setDoc(familyRef(familyId), patch, { merge: true })
}

// Crea una familia con id neutral y devuelve su id (co-propiedad vía ownerEmails).
export async function createFamily(ownerEmail, members = []) {
  const ref = doc(collection(db, FAMILIES))
  await setDoc(ref, { ownerEmails: [ownerEmail], members })
  return ref.id
}

// Lee el documento completo de la familia (para exportar/duplicar).
export async function getFamily(familyId) {
  const snap = await getDoc(familyRef(familyId))
  return snap.exists() ? snap.data() : null
}

// Duplica la familia para `targetEmail`: copia los datos y lo deja como único dueño/miembro.
export async function forkFamily(sourceId, targetEmail) {
  const snap = await getDoc(familyRef(sourceId))
  const data = snap.exists() ? snap.data() : {}
  const target = (data.members || []).find((m) => m.email === targetEmail)
  const members = target ? [{ ...target, status: 'active' }] : []
  const ref = doc(collection(db, FAMILIES))
  await setDoc(ref, { ownerEmails: [targetEmail], members })
  // Copia las categorías de la familia original a la nueva.
  await copyCategoriesToFamily(sourceId, ref.id)
  return ref.id
}

// Agrega un co-propietario a la familia.
export async function addOwner(familyId, email) {
  const snap = await getDoc(familyRef(familyId))
  if (!snap.exists()) return
  const owners = snap.data().ownerEmails || []
  if (owners.includes(email)) return
  return updateDoc(familyRef(familyId), { ownerEmails: [...owners, email] })
}

// Quita un co-propietario de la familia.
export async function removeOwner(familyId, email) {
  const snap = await getDoc(familyRef(familyId))
  if (!snap.exists()) return
  const owners = (snap.data().ownerEmails || []).filter((e) => e !== email)
  return updateDoc(familyRef(familyId), { ownerEmails: owners })
}

// Cambia el estado de un miembro (p. ej. de 'pending' a 'active').
export async function updateMemberStatus(familyId, email, status) {
  const snap = await getDoc(familyRef(familyId))
  if (!snap.exists()) return
  const members = (snap.data().members || []).map((m) =>
    m.email === email ? { ...m, status } : m,
  )
  return updateDoc(familyRef(familyId), { members })
}

// Quita a un miembro de la familia (al rechazar la invitación).
export async function removeMemberFromFamily(familyId, email) {
  const snap = await getDoc(familyRef(familyId))
  if (!snap.exists()) return
  const members = (snap.data().members || []).filter((m) => m.email !== email)
  return updateDoc(familyRef(familyId), { members })
}

