import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '../../presupuesto/presupuesto.utils'

// Menú de tres puntos con Editar / Eliminar (igual al de las cuentas).
function DotMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="acc-card__menu" ref={ref}>
      <button
        type="button"
        className="acc-card__dots"
        onClick={(e) => {
          e.stopPropagation()
          // Si no cabe abajo, el menú se abre hacia arriba.
          if (!open) {
            const rect = e.currentTarget.getBoundingClientRect()
            setDropUp(window.innerHeight - rect.bottom < 130)
          }
          setOpen((v) => !v)
        }}
        aria-label="Opciones"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <ul className={`acc-card__menu-list${dropUp ? ' acc-card__menu-list--up' : ''}`}>
          <li>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onEdit()
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="M12 8.00012L4 16.0001V20.0001L8 20.0001L16 12.0001M12 8.00012L14.8686 5.13146L14.8704 5.12976C15.2652 4.73488 15.463 4.53709 15.691 4.46301C15.8919 4.39775 16.1082 4.39775 16.3091 4.46301C16.5369 4.53704 16.7345 4.7346 17.1288 5.12892L18.8686 6.86872C19.2646 7.26474 19.4627 7.46284 19.5369 7.69117C19.6022 7.89201 19.6021 8.10835 19.5369 8.3092C19.4628 8.53736 19.265 8.73516 18.8695 9.13061L18.8686 9.13146L16 12.0001M12 8.00012L16 12.0001"
                  stroke="currentColor"
                  strokeWidth="1.296"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Editar
            </button>
          </li>
          <li>
            <button
              type="button"
              className="acc-card__menu-danger"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onDelete()
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M20.5001 6H3.5" stroke="currentColor" strokeWidth="1.152" strokeLinecap="round" />
                <path
                  d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5"
                  stroke="currentColor"
                  strokeWidth="1.152"
                  strokeLinecap="round"
                />
                <path d="M9.5 11L10 16" stroke="currentColor" strokeWidth="1.152" strokeLinecap="round" />
                <path d="M14.5 11L14 16" stroke="currentColor" strokeWidth="1.152" strokeLinecap="round" />
                <path
                  d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6"
                  stroke="currentColor"
                  strokeWidth="1.152"
                />
              </svg>
              Eliminar
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

// Fila de un artículo con checkbox, nombre, valor y menú de opciones.
// En modo reordenar muestra un handle y se puede arrastrar.
export default function ShoppingItemRow({ item, onToggle, onEdit, onDelete, dragMode = false, dragProps }) {
  const { handleProps, ...rowProps } = dragProps || {}
  return (
    <div
      className={`shop-item${item.checked ? ' shop-item--checked' : ''}${dragMode ? ' shop-item--drag' : ''}`}
      {...(dragMode ? rowProps : {})}
    >
      {dragMode ? (
        <span className="shop-item__handle" aria-hidden="true" {...(handleProps || {})}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
        </span>
      ) : (
        <button
          type="button"
          className={`shop-item__check${item.checked ? ' shop-item__check--on' : ''}`}
          onClick={() => onToggle(item.id)}
          aria-label={item.checked ? 'Desmarcar' : 'Marcar'}
        >
          {item.checked && (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>
      )}

      <p className="shop-item__name">
        {item.name}
        {Number(item.amount) > 0 && (
          <span className="shop-item__value">{formatCurrency(item.amount)}</span>
        )}
      </p>

      {!dragMode && <DotMenu onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />}
    </div>
  )
}
