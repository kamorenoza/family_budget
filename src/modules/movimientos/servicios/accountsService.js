import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { db } from '../../../database/firebase'

// Las cuentas viven en su propia colección; cada doc pertenece a una familia.
// Los movimientos de cada cuenta se guardan en el arreglo `expenses` del doc
// (igual que en la app de referencia).
const ACCOUNTS = 'accounts'
const accountsCol = () => collection(db, ACCOUNTS)

// Escucha las cuentas de una familia.
export function subscribeAccounts(familyId, onChange) {
  const q = query(accountsCol(), where('familyId', '==', familyId))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Crea una cuenta vinculada a la familia.
export function addAccount(familyId, data) {
  return addDoc(accountsCol(), { familyId, expenses: [], ...data })
}

// Actualiza una cuenta por su id de documento.
export function updateAccount(id, data) {
  const { id: _ignore, familyId: _f, ...rest } = data
  return updateDoc(doc(db, ACCOUNTS, id), rest)
}

// Elimina una cuenta por su id de documento.
export function deleteAccount(id) {
  return deleteDoc(doc(db, ACCOUNTS, id))
}

// Reemplaza el arreglo de movimientos de una cuenta.
export function saveAccountExpenses(id, expenses) {
  return updateDoc(doc(db, ACCOUNTS, id), { expenses })
}
