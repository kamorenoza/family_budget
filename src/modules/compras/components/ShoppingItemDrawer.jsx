import { useEffect, useRef, useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import '../../presupuesto/components/IncomeDrawer.css'

function formatThousands(raw) {
  const digits = String(raw).replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('es-CO') : ''
}

// Formulario para crear o editar un artículo de la lista.
export default function ShoppingItemDrawer({ item, groups = [], onSubmit, onDelete, onClose }) {
  const editing = !!item
  const [name, setName] = useState(item?.name || '')
  const [value, setValue] = useState(item ? formatThousands(item.amount) : '')
  const [group, setGroup] = useState(item?.group || '')
  const [groupOpen, setGroupOpen] = useState(false)
  const groupBoxRef = useRef(null)
  const [error, setError] = useState('')

  // Cierra el menú de grupos al tocar fuera.
  useEffect(() => {
    if (!groupOpen) return
    const onDoc = (e) => {
      if (groupBoxRef.current && !groupBoxRef.current.contains(e.target)) setGroupOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [groupOpen])

  const gq = group.trim().toLowerCase()
  const filteredGroups = gq ? groups.filter((g) => g.toLowerCase().includes(gq)) : groups

  const submit = () => {
    if (!name.trim()) return setError('Escribe un nombre.')
    const amount = Number(String(value).replace(/\D/g, '')) || 0
    onSubmit({ id: item?.id, name, amount, group: group.trim() || null })
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

        <div className="income-field">
          <label className="income-field__label" htmlFor="item-group">Grupo (opcional)</label>
          <div className="shop-combo" ref={groupBoxRef}>
            <div className="shop-combo__control">
              <input
                id="item-group"
                type="text"
                className="income-field__input shop-combo__input"
                placeholder="Ej. Frutas"
                autoComplete="off"
                value={group}
                onChange={(e) => {
                  setGroup(e.target.value)
                  setGroupOpen(true)
                }}
                onFocus={() => setGroupOpen(true)}
              />
              {groups.length > 0 && (
                <button
                  type="button"
                  className="shop-combo__arrow"
                  tabIndex={-1}
                  aria-label="Ver grupos"
                  onClick={() => setGroupOpen((v) => !v)}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              )}
            </div>
            {groupOpen && filteredGroups.length > 0 && (
              <ul className="shop-combo__menu">
                {filteredGroups.map((g) => (
                  <li key={g}>
                    <button
                      type="button"
                      className="shop-combo__option"
                      onClick={() => {
                        setGroup(g)
                        setGroupOpen(false)
                      }}
                    >
                      {g}
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
