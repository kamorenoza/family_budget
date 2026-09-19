import { useEffect, useRef, useState } from 'react'
import { ACCOUNT_TYPES, ACCOUNTS_ORDER_BY } from '../accounts.constants'
import FilterIcon from '../../../shared/components/icons/FilterIcon.jsx'

// Barra de búsqueda + menú de filtro (tipo y orden) para la lista de cuentas.
export default function AccountsFilter({ query, onQuery, typeFilter, onType, sortBy, onSort, onClear }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const active = typeFilter !== 'all' || sortBy !== 'name'

  return (
    <div className="acc-filter acc-filter--list">
      <div className="acc-filter__menu-wrap" ref={ref}>
        <button
          type="button"
          className={`acc-filter__btn${active ? ' acc-filter__btn--active' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Filtrar"
        >
          <FilterIcon size={18} />
          <span className="acc-filter__btn-label">Filtros</span>
        </button>

        {open && (
          <div className="acc-filter__menu">
            <label className="acc-filter__label">Tipo:</label>
            <select
              className="acc-filter__select"
              value={typeFilter}
              onChange={(e) => onType(e.target.value)}
            >
              <option value="all">Todos</option>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <label className="acc-filter__label">Ordenar por:</label>
            <select
              className="acc-filter__select"
              value={sortBy}
              onChange={(e) => onSort(e.target.value)}
            >
              {ACCOUNTS_ORDER_BY.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {active && (
              <button
                type="button"
                className="acc-filter__clear"
                onClick={() => {
                  onClear()
                  setOpen(false)
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
