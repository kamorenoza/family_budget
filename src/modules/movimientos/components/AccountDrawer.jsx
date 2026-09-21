import { useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import DateField from '../../../shared/components/DateField/DateField.jsx'
import { confirm } from '../../../shared/components/ConfirmDialog/confirm.jsx'
import { ACCOUNT_TYPES } from '../accounts.constants'
import '../../presupuesto/components/IncomeDrawer.css'
import '../../presupuesto/components/ExpenseDrawer.css'

function formatThousands(raw) {
  const digits = String(raw).replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('es-CO') : ''
}

const todayISO = () => new Date().toISOString().slice(0, 10)

// Genera el arreglo de cuotas (mensuales desde la primera fecha).
function buildInstallments(count, value, firstDue) {
  const parts = String(firstDue || '').slice(0, 10).split('-').map(Number)
  const start = parts.length === 3 && parts[0] ? new Date(parts[0], parts[1] - 1, parts[2]) : null
  const rows = []
  for (let i = 0; i < count; i += 1) {
    let date = ''
    if (start && !Number.isNaN(start.getTime())) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate())
      date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    rows.push({ id: `c${i + 1}`, index: i + 1, date, value, paid: false })
  }
  return rows
}

// Recalcula las fechas de las cuotas conservando pagos y valores por índice.
function rebuildInstallments(existing, count, value, firstDue) {
  const prev = new Map((existing || []).map((c) => [c.index, c]))
  return buildInstallments(count, value, firstDue).map((c) => {
    const old = prev.get(c.index)
    return old ? { ...c, value: Number(old.value) || value, paid: !!old.paid } : c
  })
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
  const [creditMode, setCreditMode] = useState(account?.creditMode || 'cuotas')
  const [installmentsCount, setInstallmentsCount] = useState(
    account?.installmentsCount ? String(account.installmentsCount) : '',
  )
  const [installmentValue, setInstallmentValue] = useState(
    account?.installmentValue ? formatThousands(account.installmentValue) : '',
  )
  const [firstDueDate, setFirstDueDate] = useState(
    account?.firstDueDate ? String(account.firstDueDate).slice(0, 10) : todayISO(),
  )
  const [debtValue, setDebtValue] = useState(
    account?.debtValue ? formatThousands(account.debtValue) : '',
  )
  const [error, setError] = useState('')

  const submit = async () => {
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
    } else if (type === 'credito') {
      data.creditMode = creditMode
      if (creditMode === 'cuotas') {
        const count = Number(String(installmentsCount).replace(/\D/g, ''))
        const cval = Number(String(installmentValue).replace(/\D/g, ''))
        if (!count || count <= 0) return setError('Indica cuántas cuotas.')
        if (!cval || cval <= 0) return setError('Indica el valor de la cuota.')
        if (!firstDueDate) return setError('Indica la fecha de la primera cuota.')
        data.installmentsCount = count
        data.installmentValue = cval
        data.firstDueDate = firstDueDate
        if (!editing) {
          data.installments = buildInstallments(count, cval, firstDueDate)
        } else if (firstDueDate !== String(account.firstDueDate || '').slice(0, 10)) {
          const ok = await confirm({
            title: '¿Recalcular fechas?',
            message: 'Cambiaste la fecha de la primera cuota. Se recalcularán las fechas de todas las cuotas.',
            confirmText: 'Recalcular',
            cancelText: 'Cancelar',
          })
          if (!ok) return
          data.installments = rebuildInstallments(account.installments, count, cval, firstDueDate)
        }
      } else {
        const dval = Number(String(debtValue).replace(/\D/g, ''))
        if (!dval || dval <= 0) return setError('Indica el valor de la deuda.')
        data.debtValue = dval
      }
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
          <select
            className="income-field__input acc-drawer__select"
            value={type}
            disabled={editing}
            onChange={(e) => {
              setType(e.target.value)
              setError('')
            }}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
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

        {type === 'credito' && (
          <>
            <div className="income-field">
              <p className="income-field__label">Modalidad</p>
              <div className="expense-tabs">
                <button
                  type="button"
                  className={`expense-tab${creditMode === 'cuotas' ? ' expense-tab--active' : ''}`}
                  disabled={editing}
                  onClick={() => {
                    setCreditMode('cuotas')
                    setError('')
                  }}
                >
                  Por cuotas
                </button>
                <button
                  type="button"
                  className={`expense-tab${creditMode === 'valor' ? ' expense-tab--active' : ''}`}
                  disabled={editing}
                  onClick={() => {
                    setCreditMode('valor')
                    setError('')
                  }}
                >
                  Por valor
                </button>
              </div>
            </div>

            {creditMode === 'cuotas' ? (
              <>
                <div className="acc-drawer__row">
                  <div className="income-field">
                    <label className="income-field__label" htmlFor="acc-count">N.º de cuotas</label>
                    <input
                      id="acc-count"
                      type="text"
                      inputMode="numeric"
                      className="income-field__input"
                      placeholder="0"
                      value={installmentsCount}
                      onChange={(e) => {
                        setInstallmentsCount(e.target.value.replace(/\D/g, ''))
                        setError('')
                      }}
                    />
                  </div>
                  <div className="income-field">
                    <label className="income-field__label" htmlFor="acc-cuota">Valor cuota</label>
                    <div className="income-field__prefixed">
                      <span className="income-field__prefix">$</span>
                      <input
                        id="acc-cuota"
                        type="text"
                        inputMode="numeric"
                        className="income-field__input income-field__input--prefixed"
                        placeholder="0"
                        value={installmentValue}
                        onChange={(e) => {
                          setInstallmentValue(formatThousands(e.target.value))
                          setError('')
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="income-field">
                  <label className="income-field__label" htmlFor="acc-first-due">Fecha primera cuota</label>
                  <DateField
                    id="acc-first-due"
                    value={firstDueDate}
                    onChange={(e) => {
                      setFirstDueDate(e.target.value)
                      setError('')
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="income-field">
                <label className="income-field__label" htmlFor="acc-debt">Valor de la deuda</label>
                <div className="income-field__prefixed">
                  <span className="income-field__prefix">$</span>
                  <input
                    id="acc-debt"
                    type="text"
                    inputMode="numeric"
                    className="income-field__input income-field__input--prefixed"
                    placeholder="0"
                    value={debtValue}
                    onChange={(e) => {
                      setDebtValue(formatThousands(e.target.value))
                      setError('')
                    }}
                  />
                </div>
              </div>
            )}
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
