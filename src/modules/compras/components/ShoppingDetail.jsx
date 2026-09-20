import { useEffect, useMemo, useRef, useState } from 'react'
import ShoppingItemRow from './ShoppingItemRow.jsx'
import SearchIcon from '../../../shared/components/icons/SearchIcon.jsx'
import { formatCurrency } from '../../presupuesto/presupuesto.utils'

const NONE = '__none__'
const groupKeyOf = (item) => (item.group || '').trim() || NONE

// Vista de detalle de una lista: estadísticas, búsqueda, grupos y artículos.
export default function ShoppingDetail({ list, onBack, onEdit, onDelete, onAddItem, onEditItem, onDeleteItem, onToggleItem, onReorder }) {
  const items = list.items || []
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = (i) => !q || i.name.toLowerCase().includes(q) || (i.group || '').toLowerCase().includes(q)

  const stats = useMemo(() => {
    const completed = items.filter((i) => i.checked)
    const pend = items.filter((i) => !i.checked)
    return {
      total: items.length,
      completedCount: completed.length,
      pendingTotal: pend.reduce((s, i) => s + (Number(i.amount) || 0), 0),
      completedTotal: completed.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    }
  }, [items])

  // Pendientes (reordenables) y marcados (al final por fecha de marcado).
  const pending = useMemo(() => items.filter((i) => !i.checked && matches(i)), [items, q])
  const checked = useMemo(
    () =>
      items
        .filter((i) => i.checked && matches(i))
        .sort((a, b) => {
          const da = a.checkedAt ? new Date(a.checkedAt).getTime() : 0
          const db = b.checkedAt ? new Date(b.checkedAt).getTime() : 0
          return db - da
        }),
    [items, q],
  )

  const pendingById = useMemo(() => new Map(pending.map((i) => [i.id, i])), [pending])

  const [reorderMode, setReorderMode] = useState(false)
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [order, setOrder] = useState([])
  const orderRef = useRef([])
  const draggingId = useRef(null)
  const draggingGroup = useRef(null)

  // Al buscar no se reordena (evita perder artículos ocultos).
  useEffect(() => {
    if (q) setReorderMode(false)
  }, [q])

  // Orden plano de los ids pendientes; se reconstruye al cambiar la lista.
  const signature = pending.map((i) => i.id).join(',')
  useEffect(() => {
    const ids = signature ? signature.split(',') : []
    orderRef.current = ids
    setOrder(ids)
  }, [signature])

  const applyOrder = (next) => {
    orderRef.current = next
    setOrder(next)
  }

  const toggleCollapse = (key) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Grupos: el orden del grupo es estable (primera aparición en la lista completa);
  // dentro de cada grupo van los pendientes y luego los marcados, sin mover el grupo.
  const groups = useMemo(() => {
    const groupOrder = []
    const seen = new Set()
    const pendingByGroup = {}
    const checkedByGroup = {}
    // Posición del grupo: se fija por la lista persistida, no cambia al marcar.
    for (const it of items) {
      const k = groupKeyOf(it)
      if (!seen.has(k)) {
        seen.add(k)
        groupOrder.push(k)
      }
    }
    for (const id of order) {
      const it = pendingById.get(id)
      if (!it) continue
      const k = groupKeyOf(it)
      if (!seen.has(k)) {
        seen.add(k)
        groupOrder.push(k)
      }
      if (!pendingByGroup[k]) pendingByGroup[k] = []
      pendingByGroup[k].push(it)
    }
    for (const it of checked) {
      const k = groupKeyOf(it)
      if (!seen.has(k)) {
        seen.add(k)
        groupOrder.push(k)
      }
      if (!checkedByGroup[k]) checkedByGroup[k] = []
      checkedByGroup[k].push(it)
    }
    return { groupOrder, pendingByGroup, checkedByGroup }
  }, [items, order, pendingById, checked])

  // Con grupos, los sueltos se muestran bajo un grupo por defecto "Sin grupo".
  const hasNamedGroups = groups.groupOrder.some((k) => k !== NONE)

  // Arrastre de un artículo dentro de su grupo (mouse y toque).
  const startItemDrag = (id) => (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    draggingId.current = id
    const dragItem = pendingById.get(id)
    const dragKey = dragItem ? groupKeyOf(dragItem) : NONE
    const block = e.currentTarget.closest('[data-group-block]')
    const move = (ev) => {
      if (!draggingId.current || !block) return
      ev.preventDefault()
      // Destino por posición vertical entre las filas del grupo (fiable en móvil).
      const rows = block.querySelectorAll('[data-item-id]')
      let overId = null
      for (const row of rows) {
        const rect = row.getBoundingClientRect()
        if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          overId = row.getAttribute('data-item-id')
          break
        }
      }
      if (!overId && rows.length) {
        const first = rows[0].getBoundingClientRect()
        const last = rows[rows.length - 1].getBoundingClientRect()
        if (ev.clientY < first.top) overId = rows[0].getAttribute('data-item-id')
        else if (ev.clientY > last.bottom) overId = rows[rows.length - 1].getAttribute('data-item-id')
      }
      if (!overId || overId === draggingId.current) return
      const overItem = pendingById.get(overId)
      if (!overItem || groupKeyOf(overItem) !== dragKey) return
      const cur = orderRef.current
      const from = cur.indexOf(draggingId.current)
      const to = cur.indexOf(overId)
      if (from === -1 || to === -1 || from === to) return
      const nx = [...cur]
      nx.splice(to, 0, nx.splice(from, 1)[0])
      applyOrder(nx)
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

  // Arrastre de un grupo completo (mueve todo su bloque de ids).
  const startGroupDrag = (key) => (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    draggingGroup.current = key
    const move = (ev) => {
      if (!draggingGroup.current) return
      ev.preventDefault()
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const block = el && el.closest('[data-group-block]')
      const overKey = block && block.getAttribute('data-group-block')
      if (!overKey || overKey === draggingGroup.current) return
      // Reconstruye el orden de grupos y sus bloques desde el orden plano.
      const groupOrder = []
      const byGroup = {}
      for (const id of orderRef.current) {
        const it = pendingById.get(id)
        if (!it) continue
        const k = groupKeyOf(it)
        if (!byGroup[k]) {
          byGroup[k] = []
          groupOrder.push(k)
        }
        byGroup[k].push(id)
      }
      const from = groupOrder.indexOf(draggingGroup.current)
      const to = groupOrder.indexOf(overKey)
      if (from === -1 || to === -1 || from === to) return
      groupOrder.splice(to, 0, groupOrder.splice(from, 1)[0])
      const nx = []
      for (const k of groupOrder) for (const id of byGroup[k]) nx.push(id)
      applyOrder(nx)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (draggingGroup.current) {
        draggingGroup.current = null
        onReorder(orderRef.current)
      }
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const renderGroup = (key) => {
    const pend = groups.pendingByGroup[key] || []
    const chk = groups.checkedByGroup[key] || []
    if (pend.length === 0 && chk.length === 0) return null
    const name = key === NONE ? (hasNamedGroups ? 'Sin grupo' : null) : key
    const isCollapsed = collapsed.has(key)
    return (
      <div className="shop-group" key={key} data-group-block={key}>
        {name && (
          <div className="shop-group__head">
            {reorderMode && (
              <span
                className="shop-group__handle"
                aria-hidden="true"
                onPointerDown={startGroupDrag(key)}
                onClick={(e) => e.stopPropagation()}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <circle cx="9" cy="6" r="1.6" />
                  <circle cx="15" cy="6" r="1.6" />
                  <circle cx="9" cy="12" r="1.6" />
                  <circle cx="15" cy="12" r="1.6" />
                  <circle cx="9" cy="18" r="1.6" />
                  <circle cx="15" cy="18" r="1.6" />
                </svg>
              </span>
            )}
            <button type="button" className="shop-group__toggle" onClick={() => toggleCollapse(key)}>
              <span className="shop-group__name">{name}</span>
            </button>
          </div>
        )}
        {!isCollapsed && (
          <div className="shop-group__items">
            {pend.map((item) => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                onToggle={onToggleItem}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
                dragMode={reorderMode}
                dragProps={
                  reorderMode
                    ? {
                        'data-item-id': item.id,
                        handleProps: { onPointerDown: startItemDrag(item.id) },
                      }
                    : undefined
                }
              />
            ))}
            {chk.map((item) => (
              <ShoppingItemRow key={item.id} item={item} onToggle={onToggleItem} onEdit={onEditItem} onDelete={onDeleteItem} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const canReorder = pending.length > 1 && !q

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
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M20.5001 6H3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path
                d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M9.5 11L10 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M14.5 11L14 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path
                d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6"
                stroke="currentColor"
                strokeWidth="1.5"
              />
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
            <div className="shop-search">
              <SearchIcon size={16} />
              <input
                type="text"
                className="shop-search__input"
                placeholder="Buscar artículo"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="shop-search__clear" onClick={() => setQuery('')} aria-label="Limpiar">
                  ×
                </button>
              )}
            </div>
            {canReorder && (
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
              </button>
            )}
            <button type="button" className="shop-detail__add" onClick={onAddItem} aria-label="Agregar artículo">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {items.length === 0 ? (
            <p className="shop-detail__empty">No hay artículos en esta lista.</p>
          ) : pending.length === 0 && checked.length === 0 ? (
            <p className="shop-detail__empty">Sin resultados.</p>
          ) : (
            <div className="shop-detail__items">
              {groups.groupOrder.map(renderGroup)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
