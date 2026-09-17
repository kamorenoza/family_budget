import { useState } from 'react'
import CategoryItem from './CategoryItem'
import CategoryForm from './CategoryForm'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader'
import { confirm } from '../../../shared/components/ConfirmDialog/confirm.jsx'
import { useCategories } from '../useCategories'
import { colorPalette } from '../categories.constants'
import './CategoryDrawer.css'

export default function CategoryDrawer({ onClose }) {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()
  const [newCategory, setNewCategory] = useState(null)
  const [editingId, setEditingId] = useState(null)

  const startAdd = () => {
    setEditingId(null)
    setNewCategory({ name: '', icon: 'cat1', iconColor: '#ffffff', backgroundColor: colorPalette[8] })
  }

  const saveNew = (category) => {
    const error = addCategory(category)
    if (!error) setNewCategory(null)
  }

  const saveEdit = (category) => {
    updateCategory(category)
    setEditingId(null)
  }

  const handleEdit = (category) => {
    setNewCategory(null)
    setEditingId(category.id)
  }

  const handleDelete = async (category) => {
    const ok = await confirm({
      title: '¿Eliminar categoría?',
      message: `Se eliminará la categoría "${category.name}". Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })
    if (ok) deleteCategory(category)
  }

  return (
    <div className="category-drawer">
      <DrawerHeader title="Categorías" onClose={onClose}>
        <button type="button" className="category-drawer__add" onClick={startAdd} aria-label="Agregar categoría">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </DrawerHeader>

      {newCategory && (
        <CategoryForm value={newCategory} onSave={saveNew} onCancel={() => setNewCategory(null)} />
      )}

      <div className="category-drawer__list">
        {!newCategory && categories.length === 0 ? (
          <p className="category-drawer__empty">Aún no tienes categorías</p>
        ) : (
          categories.map((cat) =>
            editingId === cat.id ? (
              <CategoryForm
                key={cat.id}
                value={cat}
                isEditing
                onSave={saveEdit}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <CategoryItem key={cat.id} category={cat} onEdit={handleEdit} onDelete={handleDelete} />
            ),
          )
        )}
      </div>
    </div>
  )
}
