import { useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import DateField from '../../../shared/components/DateField/DateField.jsx'
import { CategoryGlyph } from '../../categories/categories.constants'
import '../../presupuesto/components/IncomeDrawer.css'
import '../../presupuesto/components/ExpenseDrawer.css'

function formatThousands(raw) {
  const digits = String(raw).replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('es-CO') : ''
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function AccountExpenseDrawer({ account, categories, expense, onSubmit, onDelete, onClose }) {
  const editing = !!expense
  const isNormal = account.type === 'normal'
  const canPend = isNormal && !!account.allowPending
  const [type, setType] = useState(expense?.type || 'gasto')
  const [description, setDescription] = useState(expense?.description || '')
  const [value, setValue] = useState(expense ? formatThousands(expense.value) : '')
  const [categoryId, setCategoryId] = useState(expense?.category?.id || '')
  const [catOpen, setCatOpen] = useState(false)
  const [isPending, setIsPending] = useState(expense?.isPending || false)
  const [comments, setComments] = useState(expense?.comments || '')
  const [date, setDate] = useState(expense?.date ? String(expense.date).slice(0, 10) : todayISO())
  const [error, setError] = useState('')

  const selectedCat = categories.find((c) => c.id === categoryId) || null

  const submit = () => {
    const amount = Number(String(value).replace(/\D/g, ''))
    if (!description.trim()) return setError('Escribe una descripción.')
    if (!amount || amount <= 0) return setError('Escribe un valor válido.')
    const cat = selectedCat
      ? { id: selectedCat.id, name: selectedCat.name, icon: selectedCat.icon, backgroundColor: selectedCat.backgroundColor }
      : null
    onSubmit({
      description: description.trim(),
      value: amount,
      type,
      isPending: canPend ? isPending : false,
      comments: comments.trim(),
      date,
      category: cat,
    })
    onClose()
  }

  const canSave = description.trim().length > 0 && Number(String(value).replace(/\D/g, '')) > 0

  return (
    <div className="income-drawer">
      <DrawerHeader title={editing ? 'Editar movimiento' : 'Agregar movimiento'} onClose={onClose} />

      <div className="income-drawer__body">
        <div className={`expense-tabs acc-movtabs acc-movtabs--${type}`}>
          <button
            type="button"
            className={`expense-tab${type === 'gasto' ? ' expense-tab--active' : ''}`}
            onClick={() => {
              setType('gasto')
              setError('')
            }}
          >
            Gasto
          </button>
          <button
            type="button"
            className={`expense-tab${type === 'ingreso' ? ' expense-tab--active' : ''}`}
            onClick={() => {
              setType('ingreso')
              setError('')
            }}
          >
            Ingreso
          </button>
        </div>

        <div className="income-field">
          <label className="income-field__label" htmlFor="mov-desc">Descripción</label>
          <input
            id="mov-desc"
            type="text"
            className="income-field__input"
            placeholder="Ej. Mercado"
            value={description}
            autoFocus
            onChange={(e) => {
              setDescription(e.target.value)
              setError('')
            }}
          />
        </div>

        <div className="income-field">
          <label className="income-field__label" htmlFor="mov-value">Valor</label>
          <div className="income-field__prefixed">
            <span className="income-field__prefix">$</span>
            <input
              id="mov-value"
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
          <p className="income-field__label">Categoría</p>
          <div className="expense-select">
              <button type="button" className="expense-select__trigger" onClick={() => setCatOpen((v) => !v)}>
                {selectedCat ? (
                  <span className="expense-select__value">
                    <span className="expense-cat__icon" style={{ background: selectedCat.backgroundColor }}>
                      <CategoryGlyph name={selectedCat.icon} color="#ffffff" size={18} />
                    </span>
                    <span className="expense-cat__name">{selectedCat.name}</span>
                  </span>
                ) : (
                  <span className="expense-select__placeholder">
                    {categories.length === 0 ? '' : 'Sin categoría'}
                  </span>
                )}
                <svg
                  className={`expense-select__chevron${catOpen ? ' expense-select__chevron--open' : ''}`}
                  viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {catOpen && (
                <ul className="expense-select__menu">
                  <li>
                    <button
                      type="button"
                      className={`expense-select__option${!categoryId ? ' expense-select__option--active' : ''}`}
                      onClick={() => {
                        setCategoryId('')
                        setCatOpen(false)
                      }}
                    >
                      <span className="expense-select__placeholder">Sin categoría</span>
                    </button>
                  </li>
                  {categories.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={`expense-select__option${c.id === categoryId ? ' expense-select__option--active' : ''}`}
                        onClick={() => {
                          setCategoryId(c.id)
                          setCatOpen(false)
                        }}
                      >
                        <span className="expense-cat__icon" style={{ background: c.backgroundColor }}>
                          <CategoryGlyph name={c.icon} color="#ffffff" size={18} />
                        </span>
                        <span className="expense-cat__name">{c.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        </div>

        <div className="income-field">
          <label className="income-field__label" htmlFor="mov-date">Fecha</label>
          <DateField
            id="mov-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {canPend && (
          <label className="income-switch">
            <span className="income-switch__text">Pendiente</span>
            <input type="checkbox" checked={isPending} onChange={(e) => setIsPending(e.target.checked)} />
            <span className="income-switch__slider" />
          </label>
        )}

        <div className="income-field">
          <label className="income-field__label" htmlFor="mov-comments">Comentarios (opcional)</label>
          <input
            id="mov-comments"
            type="text"
            className="income-field__input"
            placeholder="Notas"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
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
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}
