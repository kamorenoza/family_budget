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

// Los gastos viven en su propia colección; cada doc se vincula a una familia por `familyId`.
const EXPENSES = 'expenses'
const expensesCol = () => collection(db, EXPENSES)

// Escucha los gastos de una familia.
export function subscribeExpenses(familyId, onChange) {
  const q = query(expensesCol(), where('familyId', '==', familyId))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Crea un gasto vinculado a la familia.
export function addExpense(familyId, data) {
  return addDoc(expensesCol(), { familyId, ...data })
}

// Actualiza un gasto por su id de documento.
export function updateExpense(id, data) {
  const { id: _ignore, ...rest } = data
  return updateDoc(doc(db, EXPENSES, id), rest)
}

// Elimina un gasto por su id de documento.
export function deleteExpense(id) {
  return deleteDoc(doc(db, EXPENSES, id))
}
