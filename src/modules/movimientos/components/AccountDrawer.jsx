import { useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import { ACCOUNT_TYPES } from '../accounts.constants'
import '../../presupuesto/components/IncomeDrawer.css'
import '../../presupuesto/components/ExpenseDrawer.css'

function formatThousands(raw) {
  const digits = String(raw).replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('es-CO') : ''
}

// Restringe un día a 1..31.
function clampDay(raw) {
  const n = Number(String(raw).replace(/\D/g, ''))
  if (!n) return ''
  return String(Math.min(31, Math.max(1, n)))
}

export default function AccountDrawer({ account, defaultScope = 'personal', onSubmit, onDelete, onClose }) {
  const editing = !!account
  const [name, setName] = useState(account?.name || '')
  const [type, setType] = useState(account?.type || 'normal')
  const [isFamily, setIsFamily] = useState(
    editing ? account?.scope !== 'personal' : defaultScope === 'family',
  )
  const [allowPending, setAllowPending] = useState(account?.allowPending || false)
  const [creditLimit, setCreditLimit] = useState(account ? formatThousands(account.creditLimit) : '')
  const [cutoffDate, setCutoffDate] = useState(account?.cutoffDate ? String(account.cutoffDate) : '')
  const [dueDate, setDueDate] = useState(account?.dueDate ? String(account.dueDate) : '')
  const [error, setError] = useState('')

  const submit = () => {
    if (!name.trim()) return setError('Escribe un nombre.')
    const data = { name: name.trim(), type, scope: isFamily ? 'family' : 'personal' }
    if (type === 'TC') {
      const limit = Number(String(creditLimit).replace(/\D/g, ''))
      if (!limit || limit <= 0) return setError('Escribe el cupo.')
      if (!cutoffDate) return setError('Indica la fecha de corte.')
      if (!dueDate) return setError('Indica la fecha de pago.')
      data.creditLimit = limit
      data.cutoffDate = Number(cutoffDate)
      data.dueDate = Number(dueDate)
    } else {
      data.allowPending = allowPending
    }
    const err = onSubmit(data)
    if (err) return setError(err)
    onClose()
  }

  return (
    <div className="income-drawer">
      <DrawerHeader title={editing ? 'Editar cuenta' : 'Agregar cuenta'} onClose={onClose} />

      <div className="income-drawer__body">
        <div className="income-field">
          <label className="income-field__label" htmlFor="acc-name">Nombre</label>
          <input
            id="acc-name"
            type="text"
            className="income-field__input"
            placeholder="Ej. Ahorros"
            value={name}
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
            {isFamily ? 'Cuenta familiar' : 'Cuenta personal'}
          </span>
        </label>

        <div className="income-field">
          <p className="income-field__label">Tipo</p>
          <div className="expense-tabs">
            {ACCOUNT_TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                className={`expense-tab${type === t.value ? ' expense-tab--active' : ''}`}
                disabled={editing}
                onClick={() => {
                  setType(t.value)
                  setError('')
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {type === 'normal' && (
          <label className="income-switch">
            <span className="income-switch__text">Acepta movimientos pendientes</span>
            <input type="checkbox" checked={allowPending} onChange={(e) => setAllowPending(e.target.checked)} />
            <span className="income-switch__slider" />
          </label>
        )}

        {type === 'TC' && (
          <>
            <div className="income-field">
              <label className="income-field__label" htmlFor="acc-limit">Cupo</label>
              <div className="income-field__prefixed">
                <span className="income-field__prefix">$</span>
                <input
                  id="acc-limit"
                  type="text"
                  inputMode="numeric"
                  className="income-field__input income-field__input--prefixed"
                  placeholder="0"
                  value={creditLimit}
                  onChange={(e) => {
                    setCreditLimit(formatThousands(e.target.value))
                    setError('')
                  }}
                />
              </div>
            </div>

            <div className="acc-drawer__row">
              <div className="income-field">
                <label className="income-field__label" htmlFor="acc-cutoff">Fecha de corte</label>
                <input
                  id="acc-cutoff"
                  type="text"
                  inputMode="numeric"
                  className="income-field__input"
                  placeholder="Día (1-31)"
                  value={cutoffDate}
                  onChange={(e) => {
                    setCutoffDate(clampDay(e.target.value))
                    setError('')
                  }}
                />
              </div>
              <div className="income-field">
                <label className="income-field__label" htmlFor="acc-due">Fecha de pago</label>
                <input
                  id="acc-due"
                  type="text"
                  inputMode="numeric"
                  className="income-field__input"
                  placeholder="Día (1-31)"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(clampDay(e.target.value))
                    setError('')
                  }}
                />
              </div>
            </div>
          </>
        )}

        {error && <p className="income-drawer__error">{error}</p>}

        <div className="income-drawer__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="income-drawer__submit"
            onClick={submit}
            disabled={!name.trim()}
          >
            {editing ? 'Guardar' : 'Crear'}
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
