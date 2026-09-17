import { useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import DateField from '../../../shared/components/DateField/DateField.jsx'
import { CategoryGlyph, categoryIconKeys, colorPalette } from '../../categories/categories.constants'
import './IncomeDrawer.css'
import './ExpenseDrawer.css'

// Formatea el valor con separador de miles mientras se escribe.
function formatThousands(raw) {
  const digits = String(raw).replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('es-CO') : ''
}

function money(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`
}

// Convierte una clave YYYY-MM en { month (0-based), year }.
function parseMonthKey(key) {
  if (!key) return null
  const [y, m] = key.split('-').map(Number)
  return { month: m - 1, year: y }
}

const pad = (n) => String(n).padStart(2, '0')

// Cuenta cuántos meses cubre un fijo con inicio/fin (para precargar "repetir").
function monthsBetween(startKey, endKey) {
  if (!startKey || !endKey) return ''
  const [sy, sm] = startKey.split('-').map(Number)
  const [ey, em] = endKey.split('-').map(Number)
  return (ey - sy) * 12 + (em - sm) + 1
}

export default function ExpenseDrawer({
  members,
  categories,
  bolsillos,
  availableByEmail,
  expense,
  defaultMonth,
  defaultYear,
  showScope = false,
  selfEmail = '',
  onSubmit,
  onDelete,
  onClose,
}) {
  const editing = !!expense
  // La pestaña Bolsillo solo crea; al editar se conserva el tipo original.
  const [mode, setMode] = useState(expense?.kind === 'bolsillo' ? 'bolsillo' : 'normal')
  const [scope, setScope] = useState(expense?.scope || (showScope ? 'personal' : 'familiar'))
  const initialPeriod =
    parseMonthKey(expense?.fixed ? expense?.startMonth : expense?.monthKey) || {
      month: defaultMonth,
      year: defaultYear,
    }
  const [description, setDescription] = useState(expense?.description || '')
  const [amount, setAmount] = useState(expense ? formatThousands(expense.amount) : '')
  const [categoryId, setCategoryId] = useState(expense?.categoryId || '')
  const [catOpen, setCatOpen] = useState(false)
  const [color, setColor] = useState(expense?.color || colorPalette[8])
  const [icon, setIcon] = useState(expense?.icon || categoryIconKeys[0])
  const [colorOpen, setColorOpen] = useState(false)
  const [iconOpen, setIconOpen] = useState(false)
  const [fixed, setFixed] = useState(expense?.fixed || false)
  const [repeatMonths, setRepeatMonths] = useState(
    expense?.fixed ? String(monthsBetween(expense.startMonth, expense.endMonth) || '') : '',
  )
  const [memberEmail, setMemberEmail] = useState(expense?.memberEmail || members[0]?.email || '')
  const [sourceType, setSourceType] = useState(expense?.sourceType === 'bolsillo' ? 'bolsillo' : 'person')
  const [sourceBolsilloId, setSourceBolsilloId] = useState(expense?.bolsilloId || '')
  const [paid, setPaid] = useState(false)
  // Fecha completa; el mes/año se derivan de ella.
  const [date, setDate] = useState(
    expense?.date || `${initialPeriod.year}-${pad(initialPeriod.month + 1)}-01`,
  )
  const [error, setError] = useState('')

  const submit = () => {
    const value = Number(String(amount).replace(/\D/g, ''))
    if (!description.trim()) return setError('Escribe una descripción.')
    if (!value || value <= 0) return setError('Escribe un valor válido.')
    const [y, m] = date.split('-')
    const monthKey = `${y}-${m}`
    const owner = scope === 'personal' ? selfEmail : memberEmail

    if (mode === 'bolsillo') {
      if (!owner) return setError('Selecciona de dónde sale.')
      const err = onSubmit({
        kind: 'bolsillo',
        description: description.trim(),
        amount: value,
        color,
        icon,
        fixed,
        repeatMonths: fixed ? repeatMonths : '',
        memberEmail: owner,
        scope,
        paid,
        monthKey,
        date,
      })
      if (err) return setError(err)
      return onClose()
    }

    // Gasto normal: el origen es una persona o un bolsillo.    if (sourceType === 'bolsillo' && !sourceBolsilloId) return setError('Selecciona de dónde sale.')
    if (sourceType === 'person' && !owner) return setError('Selecciona de dónde sale.')
    const err = onSubmit({
      description: description.trim(),
      amount: value,
      categoryId,
      fixed,
      repeatMonths: fixed ? repeatMonths : '',
      sourceType,
      memberEmail: sourceType === 'person' ? owner : null,
      bolsilloId: sourceType === 'bolsillo' ? sourceBolsilloId : null,
      scope,
      paid,
      monthKey,
      date,
    })
    // El padre pide mantener el drawer abierto (p. ej. para elegir a qué meses aplica).
    if (err && err.keepOpen) return
    if (err) return setError(err)
    onClose()
  }

  // Guardar solo se habilita con descripción y valor.
  const canSave = description.trim().length > 0 && Number(String(amount).replace(/\D/g, '')) > 0

  const selectedCat = categories.find((c) => c.id === categoryId) || null

  return (
    <div className="income-drawer">
      <DrawerHeader
        title={
          mode === 'bolsillo'
            ? editing ? 'Editar bolsillo' : 'Agregar bolsillo'
            : editing ? 'Editar gasto' : 'Agregar gasto'
        }
        onClose={onClose}
      />

      <div className="income-drawer__body">
        {/* La pestaña Bolsillo solo aparece al crear */}
        {!editing && (
          <div className="expense-tabs">
            <button
              type="button"
              className={`expense-tab${mode === 'normal' ? ' expense-tab--active' : ''}`}
              onClick={() => {
                setMode('normal')
                setError('')
              }}
            >
              Normal
            </button>
            <button
              type="button"
              className={`expense-tab${mode === 'bolsillo' ? ' expense-tab--active' : ''}`}
              onClick={() => {
                setMode('bolsillo')
                setError('')
              }}
            >
              Bolsillo
            </button>
          </div>
        )}

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
              {scope === 'familiar' ? 'Se agregará al presupuesto familiar' : 'Gasto personal'}
            </span>
          </label>
        )}

        <div className="income-field">
          <label className="income-field__label" htmlFor="expense-desc">
            {mode === 'bolsillo' ? 'Nombre' : 'Descripción'}
          </label>
          <input
            id="expense-desc"
            type="text"
            className="income-field__input"
            placeholder={mode === 'bolsillo' ? 'Ej. Mercado' : 'Ej. Internet'}
            value={description}
            autoFocus
            onChange={(e) => {
              setDescription(e.target.value)
              setError('')
            }}
          />
        </div>

        <div className="income-field">
          <label className="income-field__label" htmlFor="expense-amount">
            {mode === 'bolsillo' ? 'Meta' : 'Valor'}
          </label>
          <div className="income-field__prefixed">
            <span className="income-field__prefix">$</span>
            <input
              id="expense-amount"
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

        {mode === 'normal' ? (
          <div className="income-field">
            <p className="income-field__label">Categoría</p>
            <div className="expense-select">
                <button
                  type="button"
                  className="expense-select__trigger"
                  onClick={() => setCatOpen((v) => !v)}
                >
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
        ) : (
          <>
            <div className="income-field">
              <p className="income-field__label">Color</p>
              <div className="expense-select">
                <button
                  type="button"
                  className="expense-select__trigger"
                  onClick={() => {
                    setColorOpen((v) => !v)
                    setIconOpen(false)
                  }}
                >
                  <span className="expense-select__value">
                    <span className="expense-color-swatch" style={{ background: color }} />
                    <span className="expense-cat__name">Color</span>
                  </span>
                  <svg
                    className={`expense-select__chevron${colorOpen ? ' expense-select__chevron--open' : ''}`}
                    viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {colorOpen && (
                  <div className="expense-select__menu">
                    <div className="expense-colors">
                      {colorPalette.map((c) => (
                        <button
                          type="button"
                          key={c}
                          className={`expense-color${c === color ? ' expense-color--active' : ''}`}
                          style={{ background: c }}
                          onClick={() => {
                            setColor(c)
                            setColorOpen(false)
                          }}
                          aria-label={`Color ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="income-field">
              <p className="income-field__label">Icono</p>
              <div className="expense-select">
                <button
                  type="button"
                  className="expense-select__trigger"
                  onClick={() => {
                    setIconOpen((v) => !v)
                    setColorOpen(false)
                  }}
                >
                  <span className="expense-select__value">
                    <span className="expense-cat__icon" style={{ background: color }}>
                      <CategoryGlyph name={icon} color="#ffffff" size={18} />
                    </span>
                    <span className="expense-cat__name">Icono</span>
                  </span>
                  <svg
                    className={`expense-select__chevron${iconOpen ? ' expense-select__chevron--open' : ''}`}
                    viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {iconOpen && (
                  <div className="expense-select__menu">
                    <div className="expense-icons">
                      {categoryIconKeys.map((key) => (
                        <button
                          type="button"
                          key={key}
                          className={`expense-icon${key === icon ? ' expense-icon--active' : ''}`}
                          style={key === icon ? { background: color, borderColor: color } : undefined}
                          onClick={() => {
                            setIcon(key)
                            setIconOpen(false)
                          }}
                          aria-label={`Icono ${key}`}
                        >
                          <CategoryGlyph name={key} color={key === icon ? '#ffffff' : 'var(--color-text-secondary)'} size={18} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="income-field">
          <label className="income-field__label" htmlFor="expense-date">{fixed ? 'Desde la fecha' : 'Fecha'}</label>
          <DateField
            id="expense-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <label className="income-switch">
          <span className="income-switch__text">Gasto fijo (se repite cada mes)</span>
          <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
          <span className="income-switch__slider" />
        </label>

        {fixed && (
          <div className="income-field">
            <label className="income-field__label" htmlFor="expense-repeat">
              ¿Cuántos meses se repite? (opcional)
            </label>
            <input
              id="expense-repeat"
              type="text"
              inputMode="numeric"
              className="income-field__input"
              placeholder="Sin límite"
              value={repeatMonths}
              onChange={(e) => setRepeatMonths(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        )}

        {!editing && mode === 'normal' && (
          <label className="income-switch">
            <span className="income-switch__text">Ya está pagado</span>
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            <span className="income-switch__slider" />
          </label>
        )}

        {scope === 'familiar' && (
        <div className="income-field">
          <p className="income-field__label">¿De dónde sale?</p>
          <div className="income-people">
            {members.map((m) => {
              const selected = sourceType === 'person' && m.email === memberEmail
              const color = m.color || 'var(--color-primary)'
              return (
                <button
                  type="button"
                  key={m.email}
                  className={`income-person expense-person${selected ? ' income-person--active' : ''}`}
                  style={selected ? { borderColor: color, background: `${color}18` } : undefined}
                  onClick={() => {
                    setSourceType('person')
                    setMemberEmail(m.email)
                    setError('')
                  }}
                >
                  {m.photo ? (
                    <img className="income-person__avatar" src={m.photo} alt={m.name} referrerPolicy="no-referrer" />
                  ) : (
                    <span className="income-person__avatar" style={{ background: color }}>
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="expense-person__info">
                    <span className="income-person__name">{m.name.split(' ')[0]}</span>
                    <span className="expense-person__avail">Disponible {money(availableByEmail?.[m.email] || 0)}</span>
                  </span>
                </button>
              )
            })}

            {mode === 'normal' &&
              (bolsillos || []).map((b) => {
                const selected = sourceType === 'bolsillo' && b.id === sourceBolsilloId
                const bcolor = b.color || 'var(--color-primary)'
                return (
                  <button
                    type="button"
                    key={b.id}
                    className={`income-person expense-person${selected ? ' income-person--active' : ''}`}
                    style={selected ? { borderColor: bcolor, background: `${bcolor}18` } : undefined}
                    onClick={() => {
                      setSourceType('bolsillo')
                      setSourceBolsilloId(b.id)
                      setError('')
                    }}
                  >
                    <span className="income-person__avatar" style={{ background: bcolor }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8h16a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1z" />
                        <path d="M3 8l2.2-3.2A2 2 0 0 1 6.8 4h8.4a2 2 0 0 1 1.6.8L19 8" />
                        <circle cx="16" cy="13.5" r="1.2" />
                      </svg>
                    </span>
                    <span className="expense-person__info">
                      <span className="income-person__name">{b.description}</span>
                      <span className="expense-person__avail">Disponible {money(b.available || 0)}</span>
                    </span>
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
