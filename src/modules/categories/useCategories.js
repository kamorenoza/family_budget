import { useCallback, useEffect, useState } from 'react'
import { colorPalette } from './categories.constants'
import { useFamily } from '../../shared/context/FamilyContext.jsx'
import {
  subscribeCategories,
  addCategory as addCategoryDoc,
  updateCategory as updateCategoryDoc,
  deleteCategory as deleteCategoryDoc,
} from './servicios/categoriesService'

export function useCategories() {
  const { familyId } = useFamily()
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (!familyId) return
    return subscribeCategories(familyId, setCategories)
  }, [familyId])

  const addCategory = useCallback(
    (category) => {
      if (!familyId) return 'Espera un momento e intenta de nuevo.'
      const exists = categories.some(
        (c) => c.name.trim().toLowerCase() === category.name.trim().toLowerCase(),
      )
      if (exists) return 'La categoría ya existe'
      const { id: _ignore, ...data } = category
      addCategoryDoc(familyId, data)
      return null
    },
    [familyId, categories],
  )

  const updateCategory = useCallback(
    (category) => {
      if (!familyId) return
      updateCategoryDoc(category.id, category)
    },
    [familyId],
  )

  const deleteCategory = useCallback(
    (category) => {
      if (!familyId) return
      deleteCategoryDoc(category.id)
    },
    [familyId],
  )

  return { categories, addCategory, updateCategory, deleteCategory }
}

export const DEFAULT_BACKGROUND = colorPalette[8]
