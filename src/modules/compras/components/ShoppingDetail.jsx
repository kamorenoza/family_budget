import { useEffect, useMemo, useRef, useState } from 'react'
import ShoppingItemRow from './ShoppingItemRow.jsx'
import { formatCurrency } from '../../presupuesto/presupuesto.utils'

// Vista de detalle de una lista: estadísticas, alta rápida y artículos.
export default function ShoppingDetail({ list, onBack, onEdit, onDelete, onAddItem, onEditItem, onDeleteItem, onToggleItem, onReorder }) {
  const items = list.items || []

  const stats = useMemo(() => {
    const completed = items.filter((i) => i.checked)
    const pending = items.filter((i) => !i.checked)
    return {
      total: items.length,
      completedCount: completed.length,
      pendingTotal: pending.reduce((s, i) => s + (Number(i.amount) || 0), 0),
      completedTotal: completed.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    }
  }, [items])

  // Pendientes (reordenables) y marcados (al final por fecha de marcado).
  const pending = useMemo(() => items.filter((i) => !i.checked), [items])
  const checked = useMemo(
    () =>
      items
        .filter((i) => i.checked)
        .sort((a, b) => {
          const da = a.checkedAt ? new Date(a.checkedAt).getTime() : 0
          const db = b.checkedAt ? new Date(b.checkedAt).getTime() : 0
          return db - da
        }),
    [items],
  )

  const [reorderMode, setReorderMode] = useState(false)
  const [order, setOrder] = useState([])
  const draggingId = useRef(null)
  const orderRef = useRef([])

  const pendingIds = pending.map((i) => i.id).join(',')
  useEffect(() => {
    const ids = pendingIds ? pendingIds.split(',') : []
    setOrder(ids)
    orderRef.current = ids
  }, [pendingIds])

  const pendingById = useMemo(() => new Map(pending.map((i) => [i.id, i])), [pending])
  const pendingOrdered = order.map((id) => pendingById.get(id)).filter(Boolean)

  const applyOrder = (next) => {
    orderRef.current = next
    setOrder(next)
  }

  const moveOver = (overId) => {
    const from = orderRef.current.indexOf(draggingId.current)
    const to = orderRef.current.indexOf(overId)
    if (from === -1 || to === -1 || from === to) return
    const next = [...orderRef.current]
    next.splice(to, 0, next.splice(from, 1)[0])
    applyOrder(next)
  }

  // Reordenar con pointer events: funciona con mouse y con toque (PWA/móvil).
  const startPointerDrag = (id) => (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    draggingId.current = id
    const move = (ev) => {
      if (!draggingId.current) return
      ev.preventDefault()
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const row = el && el.closest('[data-item-id]')
      const overId = row && row.getAttribute('data-item-id')
      if (overId) moveOver(overId)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (draggingId.current) {
        draggingId.current = null
        onReorder(orderRef.current)
      }
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const dragPropsFor = (id) => ({
    'data-item-id': id,
    handleProps: { onPointerDown: startPointerDrag(id) },
  })

  return (
    <div className="shop-detail">
      <div className="shop-detail__head">
        <button type="button" className="shop-detail__back" onClick={onBack} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="shop-detail__title">{list.name}</h1>
        <div className="shop-detail__actions">
          <button type="button" className="shop-detail__act shop-detail__act--edit" onClick={() => onEdit(list)} aria-label="Editar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M12 8.00012L4 16.0001V20.0001L8 20.0001L16 12.0001M12 8.00012L14.8686 5.13146L14.8704 5.12976C15.2652 4.73488 15.463 4.53709 15.691 4.46301C15.8919 4.39775 16.1082 4.39775 16.3091 4.46301C16.5369 4.53704 16.7345 4.7346 17.1288 5.12892L18.8686 6.86872C19.2646 7.26474 19.4627 7.46284 19.5369 7.69117C19.6022 7.89201 19.6021 8.10835 19.5369 8.3092C19.4628 8.53736 19.265 8.73516 18.8695 9.13061L18.8686 9.13146L16 12.0001M12 8.00012L16 12.0001"
                stroke="currentColor"
                strokeWidth="1.296"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="shop-detail__btn-label">Editar</span>
          </button>
          <button type="button" className="shop-detail__act shop-detail__act--delete" onClick={() => onDelete(list)} aria-label="Eliminar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
            <span className="shop-detail__btn-label">Eliminar</span>
          </button>
        </div>
      </div>

      <div className="shop-detail__body">
        <div className="shop-detail__side">
          <div className="shop-stats">
            <div className="shop-stats__card">
              <span className="shop-stats__label">Items</span>
              <span className="shop-stats__value">{stats.total}</span>
              <span className="shop-stats__total">Total</span>
              <span className="shop-stats__amount">{formatCurrency(stats.pendingTotal)}</span>
            </div>
            <div className="shop-stats__card">
              <span className="shop-stats__label">Completados</span>
              <span className="shop-stats__value">{stats.completedCount}</span>
              <span className="shop-stats__total">Total</span>
              <span className="shop-stats__amount">{formatCurrency(stats.completedTotal)}</span>
            </div>
          </div>
        </div>

        <div className="shop-detail__main">
          <div className="shop-detail__items-head">
            <div className="shop-detail__items-actions">
              {pending.length > 1 && (
                <button
                  type="button"
                  className={`shop-detail__reorder${reorderMode ? ' shop-detail__reorder--on' : ''}`}
                  onClick={() => setReorderMode((v) => !v)}
                  aria-label={reorderMode ? 'Listo' : 'Reordenar'}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {reorderMode ? (
                      <path d="M6 6l12 12M18 6L6 18" />
                    ) : (
                      <path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" />
                    )}
                  </svg>
                  <span className="shop-detail__btn-label">{reorderMode ? 'Listo' : 'Reordenar'}</span>
                </button>
              )}
              <button type="button" className="shop-detail__add" onClick={onAddItem} aria-label="Agregar artículo">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="shop-detail__btn-label">Agregar</span>
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="shop-detail__empty">No hay artículos en esta lista.</p>
          ) : (
            <div className="shop-detail__items">
              {pendingOrdered.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  onToggle={onToggleItem}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  dragMode={reorderMode}
                  dragProps={dragPropsFor(item.id)}
                />
              ))}
              {checked.map((item) => (
                <ShoppingItemRow key={item.id} item={item} onToggle={onToggleItem} onEdit={onEditItem} onDelete={onDeleteItem} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
