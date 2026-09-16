import { formatCurrency } from '../../presupuesto/presupuesto.utils'

// Tarjeta de una lista en el listado principal.
export default function ShoppingListCard({ list, onOpen }) {
  const items = list.items || []
  const completed = items.filter((i) => i.checked).length
  const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)

  return (
    <button type="button" className="shop-card" onClick={() => onOpen(list)}>
      <div className="shop-card__info">
        <p className="shop-card__name">{list.name}</p>
        <span className="shop-card__meta">Total: {formatCurrency(total)}</span>
      </div>
      <div className="shop-card__right">
        {items.length > 0 && (
          <span className="shop-card__badge">
            {completed}/{items.length}
          </span>
        )}
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </button>
  )
}
