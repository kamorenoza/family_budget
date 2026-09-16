import { useState } from 'react'
import IconColorSelector from './IconColorSelector'
import './CategoryForm.css'

export default function CategoryForm({ value, isEditing = false, onSave, onCancel }) {
  const [category, setCategory] = useState(value)

  const handleIconColor = ({ icon, iconColor, backgroundColor }) => {
    setCategory((prev) => ({ ...prev, icon, iconColor, backgroundColor }))
  }

  const save = () => {
    if (!category.name?.trim()) return
    onSave(category)
  }

  return (
    <div className="category-form">
      {!isEditing && (
        <div className="category-form__header">
          <span>Agregar categoría</span>
          <button type="button" className="category-form__close" onClick={onCancel} aria-label="Cancelar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}

      <div className="category-form__bar">
        <IconColorSelector
          icon={category.icon}
          backgroundColor={category.backgroundColor}
          onDone={handleIconColor}
        />

        <input
          className="category-form__input"
          type="text"
          placeholder="Categoría"
          maxLength={100}
          value={category.name}
          autoFocus
          onChange={(e) => setCategory((prev) => ({ ...prev, name: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') onCancel()
          }}
        />

        <button
          type="button"
          className="category-form__check"
          onClick={save}
          disabled={!category.name?.trim()}
          aria-label="Guardar"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
