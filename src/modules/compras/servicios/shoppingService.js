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

// Cada lista de compras es un documento de una familia.
// Los artículos se guardan en el arreglo `items` del propio documento.
const LISTS = 'shoppingLists'
const listsCol = () => collection(db, LISTS)

// Escucha las listas de compras de una familia.
export function subscribeShoppingLists(familyId, onChange) {
  const q = query(listsCol(), where('familyId', '==', familyId))
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Crea una lista vinculada a la familia.
export function addShoppingList(familyId, data) {
  return addDoc(listsCol(), { familyId, items: [], ...data })
}

// Actualiza una lista por su id de documento.
export function updateShoppingList(id, data) {
  const { id: _ignore, familyId: _f, ...rest } = data
  return updateDoc(doc(db, LISTS, id), rest)
}

// Elimina una lista por su id de documento.
export function deleteShoppingList(id) {
  return deleteDoc(doc(db, LISTS, id))
}

// Reemplaza el arreglo de artículos de una lista.
export function saveShoppingItems(id, items) {
  return updateDoc(doc(db, LISTS, id), { items })
}
