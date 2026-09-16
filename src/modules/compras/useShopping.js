import { useCallback, useEffect, useState } from 'react'
import { useFamily } from '../../shared/context/FamilyContext.jsx'
import { useAuth } from '../../shared/context/AuthContext.jsx'
import {
  subscribeShoppingLists,
  addShoppingList as addListDoc,
  updateShoppingList as updateListDoc,
  deleteShoppingList as deleteListDoc,
  saveShoppingItems,
} from './servicios/shoppingService'

// Genera un id local para los artículos anidados.
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export function useShopping() {
  const { familyId } = useFamily()
  const { user } = useAuth()
  const myEmail = user?.email?.toLowerCase() || ''
  const [lists, setLists] = useState([])

  useEffect(() => {
    if (!familyId) return
    return subscribeShoppingLists(familyId, setLists)
  }, [familyId])

  // Crea una lista validando que el nombre no exista en el mismo scope.
  const addList = useCallback(
    (data) => {
      if (!familyId) return 'Espera un momento e intenta de nuevo.'
      const scope = data.scope === 'family' ? 'family' : 'personal'
      const exists = lists.some(
        (l) =>
          l.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
          (l.scope === 'personal' ? 'personal' : 'family') === scope,
      )
      if (exists) return 'La lista ya existe'
      addListDoc(familyId, {
        name: data.name.trim(),
        scope,
        owner: scope === 'family' ? null : myEmail,
        createdDate: todayISO(),
      })
      return null
    },
    [familyId, lists, myEmail],
  )

  // Actualiza nombre y scope de una lista.
  const updateList = useCallback(
    (list, data) => {
      const scope = data.scope === 'family' ? 'family' : 'personal'
      const exists = lists.some(
        (l) =>
          l.id !== list.id &&
          l.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
          (l.scope === 'personal' ? 'personal' : 'family') === scope,
      )
      if (exists) return 'La lista ya existe'
      updateListDoc(list.id, {
        name: data.name.trim(),
        scope,
        owner: scope === 'family' ? null : myEmail,
      })
      return null
    },
    [lists, myEmail],
  )

  const deleteList = useCallback((list) => {
    deleteListDoc(list.id)
  }, [])

  // Artículos anidados dentro de la lista.
  const addItem = useCallback((list, item) => {
    const next = [
      ...(list.items || []),
      { id: generateId(), name: item.name.trim(), amount: item.amount, checked: false, checkedAt: null },
    ]
    saveShoppingItems(list.id, next)
  }, [])

  const updateItem = useCallback((list, item) => {
    const next = (list.items || []).map((i) =>
      i.id === item.id ? { ...i, name: item.name.trim(), amount: item.amount } : i,
    )
    saveShoppingItems(list.id, next)
  }, [])

  const deleteItem = useCallback((list, itemId) => {
    const next = (list.items || []).filter((i) => i.id !== itemId)
    saveShoppingItems(list.id, next)
  }, [])

  // Reordena solo los pendientes; los marcados quedan al final.
  const reorderItems = useCallback((list, orderedIds) => {
    const items = list.items || []
    const checked = items.filter((i) => i.checked)
    const pendingMap = new Map(items.filter((i) => !i.checked).map((i) => [i.id, i]))
    const reordered = orderedIds.map((id) => pendingMap.get(id)).filter(Boolean)
    saveShoppingItems(list.id, [...reordered, ...checked])
  }, [])

  // Marca/desmarca un artículo y registra la fecha para ordenarlos.
  const toggleItem = useCallback((list, itemId) => {
    const next = (list.items || []).map((i) => {
      if (i.id !== itemId) return i
      const checked = !i.checked
      return { ...i, checked, checkedAt: checked ? new Date().toISOString() : null }
    })
    saveShoppingItems(list.id, next)
  }, [])

  return { lists, myEmail, addList, updateList, deleteList, addItem, updateItem, deleteItem, toggleItem, reorderItems }
}
