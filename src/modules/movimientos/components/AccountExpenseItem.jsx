import { CategoryGlyph } from '../../categories/categories.constants'
import { formatCurrency } from '../../presupuesto/presupuesto.utils'
import { expenseDateLabel } from '../accounts.utils'

export default function AccountExpenseItem({ expense, onEdit }) {
  const isIncome = expense.type === 'ingreso'
  const cat = expense.category

  return (
    <button type="button" className="mov-item" onClick={() => onEdit(expense)}>
      <span
        className="mov-item__icon"
        style={{ background: cat?.backgroundColor || 'var(--color-text-muted)' }}
      >
        <CategoryGlyph name={cat?.icon || 'cat1'} color="#ffffff" size={20} />
      </span>
      <span className="mov-item__body">
        <span className="mov-item__desc">{expense.description}</span>
        <span className="mov-item__meta">
          {expenseDateLabel(expense.date)}
          {expense.comments ? ` · ${expense.comments}` : ''}
        </span>
      </span>
      <span className={`mov-item__value ${isIncome ? 'mov-item__value--in' : 'mov-item__value--out'}`}>
        {isIncome ? '+' : '−'}
        {formatCurrency(expense.value)}
      </span>
      <svg className="mov-item__chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  )
}
