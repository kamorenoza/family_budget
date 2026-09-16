import { useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import '../../presupuesto/components/IncomeDrawer.css'

function formatThousands(raw) {
  const digits = String(raw).replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('es-CO') : ''
}

// Formulario para crear o editar un artículo de la lista.
export default function ShoppingItemDrawer({ item, onSubmit, onDelete, onClose }) {
  const editing = !!item
  const [name, setName] = useState(item?.name || '')
  const [value, setValue] = useState(item ? formatThousands(item.amount) : '')
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) return setError('Escribe un nombre.')
    const amount = Number(String(value).replace(/\D/g, '')) || 0
    onSubmit({ id: item?.id, name, amount })
    onClose()
  }

  const canSave = name.trim().length > 0

  return (
    <div className="income-drawer">
      <DrawerHeader title={editing ? 'Editar artículo' : 'Nuevo artículo'} onClose={onClose} />

      <div className="income-drawer__body">
        <div className="income-field">
          <label className="income-field__label" htmlFor="item-name">Nombre</label>
          <input
            id="item-name"
            type="text"
            className="income-field__input"
            placeholder="Ej. Leche"
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
          />
        </div>

        <div className="income-field">
          <label className="income-field__label" htmlFor="item-value">Valor (opcional)</label>
          <div className="income-field__prefixed">
            <span className="income-field__prefix">$</span>
            <input
              id="item-value"
              type="text"
              inputMode="numeric"
              className="income-field__input income-field__input--prefixed"
              placeholder="0"
              value={value}
              onChange={(e) => {
                setValue(formatThousands(e.target.value))
                setError('')
              }}
            />
          </div>
        </div>

        {error && <p className="income-drawer__error">{error}</p>}

        <div className="income-drawer__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="income-drawer__submit" onClick={submit} disabled={!canSave}>
            Guardar
          </button>
        </div>

        {editing && (
          <button type="button" className="income-drawer__delete" onClick={onDelete}>
            Eliminar artículo
          </button>
        )}
      </div>
    </div>
  )
}
