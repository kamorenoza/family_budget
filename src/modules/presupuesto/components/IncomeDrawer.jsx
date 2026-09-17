import { useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import DateField from '../../../shared/components/DateField/DateField.jsx'
import './IncomeDrawer.css'

// Formatea el valor con separador de miles mientras se escribe.
function formatThousands(raw) {
  const digits = String(raw).replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('es-CO') : ''
}

// Convierte una clave YYYY-MM en { month (0-based), year }.
function parseMonthKey(key) {
  if (!key) return null
  const [y, m] = key.split('-').map(Number)
  return { month: m - 1, year: y }
}

const pad = (n) => String(n).padStart(2, '0')

export default function IncomeDrawer({ members, income, defaultMonth, defaultYear, showScope = false, selfEmail = '', onSubmit, onDelete, onClose }) {
  const editing = !!income
  const initialPeriod =
    parseMonthKey(income?.fixed ? income?.startMonth : income?.monthKey) || {
      month: defaultMonth,
      year: defaultYear,
    }
  const [scope, setScope] = useState(income?.scope || (showScope ? 'personal' : 'familiar'))
  const [description, setDescription] = useState(income?.description || '')
  const [amount, setAmount] = useState(income ? formatThousands(income.amount) : '')
  const [fixed, setFixed] = useState(income?.fixed || false)
  const [memberEmail, setMemberEmail] = useState(income?.memberEmail || members[0]?.email || '')
  const [received, setReceived] = useState(false)
  // Fecha completa; el mes/año se derivan de ella.
  const [date, setDate] = useState(
    income?.date || `${initialPeriod.year}-${pad(initialPeriod.month + 1)}-01`,
  )
  const [error, setError] = useState('')

  const submit = () => {
    const value = Number(String(amount).replace(/\D/g, ''))
    if (!description.trim()) return setError('Escribe una descripción.')
    if (!value || value <= 0) return setError('Escribe un valor válido.')
    const owner = scope === 'personal' ? selfEmail : memberEmail
    if (!owner) return setError('Selecciona de quién es.')
    const [y, m] = date.split('-')
    const monthKey = `${y}-${m}`
    const err = onSubmit({ description: description.trim(), amount: value, fixed, memberEmail: owner, scope, received, monthKey, date })
    if (err) return setError(err)
    onClose()
  }

  // Guardar solo se habilita con descripción y valor.
  const canSave = description.trim().length > 0 && Number(String(amount).replace(/\D/g, '')) > 0

  return (
    <div className="income-drawer">
      <DrawerHeader title={editing ? 'Editar ingreso' : 'Agregar ingreso'} onClose={onClose} />

      <div className="income-drawer__body">
        {showScope && (
          <label className="scope-toggle">
            <input
              type="checkbox"
              checked={scope === 'familiar'}
              onChange={(e) => {
                setScope(e.target.checked ? 'familiar' : 'personal')
                setError('')
              }}
            />
            <span className="scope-toggle__slider" />
            <span className="scope-toggle__text">
              {scope === 'familiar' ? 'Se agregará al presupuesto familiar' : 'Ingreso personal'}
            </span>
          </label>
        )}

        <div className="income-field">
          <label className="income-field__label" htmlFor="income-desc">Descripción</label>
          <input
            id="income-desc"
            type="text"
            className="income-field__input"
            placeholder="Ej. Sueldo"
            value={description}
            autoFocus
            onChange={(e) => {
              setDescription(e.target.value)
              setError('')
            }}
          />
        </div>

        <div className="income-field">
          <label className="income-field__label" htmlFor="income-amount">Valor</label>
          <div className="income-field__prefixed">
            <span className="income-field__prefix">$</span>
            <input
              id="income-amount"
              type="text"
              inputMode="numeric"
              className="income-field__input income-field__input--prefixed"
              placeholder="0"
              value={amount}
              onChange={(e) => {
                setAmount(formatThousands(e.target.value))
                setError('')
              }}
            />
          </div>
        </div>

        <div className="income-field">
          <label className="income-field__label" htmlFor="income-date">{fixed ? 'Desde la fecha' : 'Fecha'}</label>
          <DateField
            id="income-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <label className="income-switch">
          <span className="income-switch__text">Ingreso fijo (se repite cada mes)</span>
          <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
          <span className="income-switch__slider" />
        </label>

        {!editing && (
          <label className="income-switch">
            <span className="income-switch__text">Ya está recibido</span>
            <input type="checkbox" checked={received} onChange={(e) => setReceived(e.target.checked)} />
            <span className="income-switch__slider" />
          </label>
        )}

        {scope === 'familiar' && (
        <div className="income-field">
          <p className="income-field__label">¿De quién es?</p>
          <div className="income-people">
            {members.map((m) => {
              const selected = m.email === memberEmail
              const color = m.color || 'var(--color-primary)'
              return (
                <button
                  type="button"
                  key={m.email}
                  className={`income-person${selected ? ' income-person--active' : ''}`}
                  style={selected ? { borderColor: color, background: `${color}18` } : undefined}
                  onClick={() => {
                    setMemberEmail(m.email)
                    setError('')
                  }}
                >
                  {m.photo ? (
                    <img className="income-person__avatar" src={m.photo} alt={m.name} />
                  ) : (
                    <span className="income-person__avatar" style={{ background: color }}>
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="income-person__name">{m.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        </div>
        )}

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
