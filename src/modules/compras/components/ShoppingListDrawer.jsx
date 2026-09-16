import { useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import '../../presupuesto/components/IncomeDrawer.css'

// Formulario para crear o editar una lista de compras.
export default function ShoppingListDrawer({ list, defaultScope = 'personal', onSubmit, onDelete, onClose }) {
  const editing = !!list
  const [name, setName] = useState(list?.name || '')
  const [isFamily, setIsFamily] = useState(
    editing ? list?.scope !== 'personal' : defaultScope === 'family',
  )
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) return setError('Escribe un nombre para la lista.')
    const err = onSubmit({ name, scope: isFamily ? 'family' : 'personal' })
    if (err) return setError(err)
    onClose()
  }

  return (
    <div className="income-drawer">
      <DrawerHeader title={editing ? 'Editar lista' : 'Nueva lista'} onClose={onClose} />

      <div className="income-drawer__body">
        <div className="income-field">
          <label className="income-field__label" htmlFor="list-name">Nombre de la lista</label>
          <input
            id="list-name"
            type="text"
            className="income-field__input"
            placeholder="Ej. Mercado"
            value={name}
            maxLength={10}
            autoFocus
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
          />
        </div>

        <label className="scope-toggle">
          <input
            type="checkbox"
            checked={isFamily}
            onChange={(e) => setIsFamily(e.target.checked)}
          />
          <span className="scope-toggle__slider" />
          <span className="scope-toggle__text">
            {isFamily ? 'Lista familiar' : 'Lista personal'}
          </span>
        </label>

        {error && <p className="income-drawer__error">{error}</p>}

        <div className="income-drawer__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="income-drawer__submit" onClick={submit} disabled={!name.trim()}>
            Guardar
          </button>
        </div>

        {editing && (
          <button type="button" className="income-drawer__delete" onClick={onDelete}>
            Eliminar lista
          </button>
        )}
      </div>
    </div>
  )
}
