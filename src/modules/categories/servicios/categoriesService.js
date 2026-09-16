import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../../database/firebase'

// Las categorías viven en su propia colección; cada doc se vincula a una familia por `familyId`.
const CATEGORIES = 'categories'
const categoriesCol = () => collection(db, CATEGORIES)

// Escucha las categorías de una familia.
export function subscribeCategories(familyId, onChange) {
  const q = query(categoriesCol(), where('familyId', '==', familyId))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Crea una categoría vinculada a la familia.
export function addCategory(familyId, data) {
  return addDoc(categoriesCol(), { familyId, ...data })
}

// Actualiza una categoría por su id de documento.
export function updateCategory(id, data) {
  const { id: _ignore, ...rest } = data
  return updateDoc(doc(db, CATEGORIES, id), rest)
}

// Elimina una categoría por su id de documento.
export function deleteCategory(id) {
  return deleteDoc(doc(db, CATEGORIES, id))
}

// Copia las categorías de una familia a otra (al desvincular).
export async function copyCategoriesToFamily(sourceFamilyId, targetFamilyId) {
  const q = query(categoriesCol(), where('familyId', '==', sourceFamilyId))
  const snap = await getDocs(q)
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach((d) => {
    const { familyId: _f, id: _i, ...data } = d.data()
    batch.set(doc(categoriesCol()), { familyId: targetFamilyId, ...data })
  })
  return batch.commit()
}
