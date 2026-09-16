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

// Los ingresos viven en su propia colección; cada doc se vincula a una familia por `familyId`.
const INCOMES = 'incomes'
const incomesCol = () => collection(db, INCOMES)

// Escucha los ingresos de una familia.
export function subscribeIncomes(familyId, onChange) {
  const q = query(incomesCol(), where('familyId', '==', familyId))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Crea un ingreso vinculado a la familia.
export function addIncome(familyId, data) {
  return addDoc(incomesCol(), { familyId, ...data })
}

// Actualiza un ingreso por su id de documento.
export function updateIncome(id, data) {
  const { id: _ignore, ...rest } = data
  return updateDoc(doc(db, INCOMES, id), rest)
}

// Elimina un ingreso por su id de documento.
export function deleteIncome(id) {
  return deleteDoc(doc(db, INCOMES, id))
}
