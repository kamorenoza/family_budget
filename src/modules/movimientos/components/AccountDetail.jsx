import { useEffect, useMemo, useRef, useState } from 'react'
import AccountCard from './AccountCard.jsx'
import AccountExpenseItem from './AccountExpenseItem.jsx'
import SearchIcon from '../../../shared/components/icons/SearchIcon.jsx'
import FilterIcon from '../../../shared/components/icons/FilterIcon.jsx'
import { formatCurrency } from '../../presupuesto/presupuesto.utils'
import { EXPENSE_GROUP_BY, EXPENSE_ORDER_BY } from '../accounts.constants'
import { last6MonthsHistory, monthGroupLabel, installmentSchedule, expenseDateLabel } from '../accounts.utils'
import { useUserPrefs } from '../../../shared/hooks/useUserPrefs'
import { useFamilyPrefs } from '../../../shared/hooks/useFamilyPrefs'

// Menú de búsqueda + agrupar/ordenar de los movimientos.
function MovementsFilter({ query, onQuery, groupBy, onGroup, orderBy, onOrder, onClear, defaultGroup, onAdd }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const active = groupBy !== defaultGroup || orderBy !== 'newest'

  return (
    <div className="acc-filter">
      <div className="acc-filter__menu-wrap" ref={ref}>
        <button
          type="button"
          className={`acc-filter__btn${active ? ' acc-filter__btn--active' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Filtrar"
        >
          <FilterIcon size={18} />
        </button>
        {open && (
          <div className="acc-filter__menu">
            <label className="acc-filter__label">Agrupar por:</label>
            <select
              className="acc-filter__select"
              value={groupBy}
              onChange={(e) => onGroup(e.target.value)}
            >
              {EXPENSE_GROUP_BY.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            <label className="acc-filter__label">Ordenar por:</label>
            <select
              className="acc-filter__select"
              value={orderBy}
              onChange={(e) => onOrder(e.target.value)}
            >
              {EXPENSE_ORDER_BY.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {active && (
              <button
                type="button"
                className="acc-filter__clear"
                onClick={() => {
                  onClear()
                  setOpen(false)
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="tx-search acc-filter__search">
        <SearchIcon size={16} />
        <input
          type="text"
          className="tx-search__input"
          placeholder="Buscar movimiento"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="tx-search__clear" onClick={() => onQuery('')} aria-label="Limpiar">
            ×
          </button>
        )}
      </div>

      <button type="button" className="acc-add acc-add--icon" onClick={onAdd} aria-label="Agregar movimiento">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}

function signedTotal(list) {
  return list.reduce((sum, e) => sum + (e.type === 'ingreso' ? e.value : -e.value), 0)
}

function orderExpenses(list, orderBy) {
  const arr = [...list]
  switch (orderBy) {
    case 'oldest':
      return arr.sort((a, b) => String(a.date).localeCompare(String(b.date)))
    case 'highest':
      return arr.sort((a, b) => b.value - a.value)
    case 'lowest':
      return arr.sort((a, b) => a.value - b.value)
    case 'newest':
    default:
      return arr.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }
}

// Devuelve grupos [{ key, label, color, items }] según groupBy.
function groupExpenses(list, groupBy, orderBy) {
  if (groupBy === 'none') {
    return [{ key: 'all', label: '', color: null, items: orderExpenses(list, orderBy) }]
  }
  const map = new Map()
  list.forEach((e) => {
    let key
    let label
    let color = 'var(--color-border)'
    if (groupBy === 'category') {
      key = e.category?.id || 'none'
      label = e.category?.name || 'Sin categoría'
      color = e.category?.backgroundColor || 'var(--color-border)'
    } else if (groupBy === 'type') {
      key = e.type
      label = e.type === 'ingreso' ? 'Ingresos' : 'Gastos'
      color = e.type === 'ingreso'
        ? 'color-mix(in srgb, var(--color-paid) 45%, #fff)'
        : 'color-mix(in srgb, var(--color-danger) 45%, #fff)'
    } else {
      key = String(e.date).slice(0, 7)
      label = monthGroupLabel(e.date)
    }
    if (!map.has(key)) map.set(key, { key, label, color, items: [] })
    map.get(key).items.push(e)
  })
  const groups = [...map.values()]
  groups.forEach((g) => {
    g.items = orderExpenses(g.items, orderBy)
  })
  if (groupBy === 'date') {
    groups.sort((a, b) => (orderBy === 'oldest' ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)))
  } else {
    groups.sort((a, b) => a.label.localeCompare(b.label))
  }
  return groups
}

function ExpenseGroups({ groups, collapsed, onToggle, onEdit, noCollapse }) {
  return (
    <div className="mov-groups">
      {groups.map((g) => {
        const isOpen = noCollapse ? true : !collapsed[g.key]
        const total = signedTotal(g.items)
        return (
          <div className={`mov-group${g.label ? '' : ' mov-group--flat'}`} key={g.key} style={g.color ? { borderLeftColor: g.color } : undefined}>
            {g.label && (noCollapse ? (
              <div className="mov-group__head mov-group__head--static">
                <span className="mov-group__label">{g.label}</span>
                <span className="mov-group__total">
                  {formatCurrency(Math.abs(total))}
                </span>
              </div>
            ) : (
              <button type="button" className="mov-group__head" onClick={() => onToggle(g.key)}>
                <span className="mov-group__label">{g.label}</span>
                <span className="mov-group__total">
                  {formatCurrency(Math.abs(total))}
                </span>
                <svg
                  className={`mov-group__chevron${isOpen ? ' mov-group__chevron--open' : ''}`}
                  viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            ))}
            {isOpen && (
              <div className="mov-group__items">
                {g.items.map((e) => (
                  <AccountExpenseItem key={e.id} expense={e} onEdit={onEdit} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Fila de una cuota: checkbox para pagar y cuerpo para editar/eliminar.
function CuotaRow({ cuota, onToggle, onEdit }) {
  return (
    <div className={`cuota-row${cuota.paid ? ' cuota-row--paid' : ''}`}>
      <input
        type="checkbox"
        className="cuota-row__check"
        checked={cuota.paid}
        onChange={(e) => onToggle(cuota, e.target.checked)}
      />
      <button type="button" className="cuota-row__main" onClick={() => onEdit(cuota)}>
        <span className="cuota-row__info">
          <span className="cuota-row__name">Cuota {cuota.index}</span>
          <span className="cuota-row__date">{cuota.date ? expenseDateLabel(cuota.date) : ''}</span>
        </span>
        <span className="cuota-row__value">{formatCurrency(cuota.value)}</span>
      </button>
    </div>
  )
}

// Fila de movimiento en modo cuotas: check (marcado por defecto), click abre el drawer.
function MovementRow({ expense, onToggle, onEdit }) {
  const isIncome = expense.type === 'ingreso'
  const checked = expense.paid !== false

  return (
    <div className="cuota-row">
      <input
        type="checkbox"
        className="cuota-row__check"
        checked={checked}
        onChange={(e) => onToggle(expense, e.target.checked)}
      />
      <button type="button" className="cuota-row__main" onClick={() => onEdit(expense)}>
        <span className="cuota-row__info">
          <span className="cuota-row__name">{expense.description}</span>
          <span className="cuota-row__date">{expense.date ? expenseDateLabel(expense.date) : ''}</span>
        </span>
        <span className={`cuota-row__value ${isIncome ? 'mov-item__value--in' : 'mov-item__value--out'}`}>
          {formatCurrency(expense.value)}
        </span>
      </button>
    </div>
  )
}

// Vista de una cuenta de crédito (deuda): cuotas + movimientos o solo movimientos.
function DebtView({ account, onAdd, onEditExpense, onToggleExpense, onToggleCuota, onEditCuota }) {
  const isInstallments = account.creditMode === 'cuotas'

  if (!isInstallments) {
    // Por valor: movimientos sin avatar, último agregado primero.
    const movements = [...(account.expenses || []).filter((e) => e.installmentIndex == null)].reverse()
    return (
      <div className="acc-detail__list">
        <section className="mov-section">
          <div className="mov-section__head">
            <h3 className="mov-section__title">Movimientos</h3>
            <button type="button" className="acc-add acc-add--icon" onClick={onAdd} aria-label="Agregar movimiento">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          {movements.length === 0 ? (
            <p className="acc-list__empty">No hay movimientos.</p>
          ) : (
            <div className="mov-group__items">
              {movements.map((e) => (
                <AccountExpenseItem key={e.id} expense={e} onEdit={onEditExpense} hideIcon />
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  // Por cuotas: cuotas y movimientos en una sola lista por fecha; pagadas al final.
  const cuotas = installmentSchedule(account)
  const movements = (account.expenses || []).filter((e) => e.installmentIndex == null)
  const byDate = (a, b) => String(a.date || '').localeCompare(String(b.date || ''))
  const active = [
    ...cuotas.filter((c) => !c.paid).map((c) => ({ kind: 'cuota', date: c.date, cuota: c })),
    ...movements.map((e) => ({ kind: 'mov', date: e.date, expense: e })),
  ].sort(byDate)
  const paid = cuotas
    .filter((c) => c.paid)
    .map((c) => ({ kind: 'cuota', date: c.date, cuota: c }))
    .sort(byDate)
  const rows = [...active, ...paid]

  return (
    <div className="acc-detail__list">
      <section className="mov-section">
        <div className="mov-section__head">
          <h3 className="mov-section__title">Cuotas</h3>
          <button type="button" className="acc-add acc-add--icon" onClick={onAdd} aria-label="Agregar movimiento">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="acc-list__empty">No hay cuotas.</p>
        ) : (
          <div className="cuotas">
            {rows.map((r) =>
              r.kind === 'cuota' ? (
                <CuotaRow key={`c-${r.cuota.id}`} cuota={r.cuota} onToggle={onToggleCuota} onEdit={onEditCuota} />
              ) : (
                <MovementRow key={`m-${r.expense.id}`} expense={r.expense} onToggle={onToggleExpense} onEdit={onEditExpense} />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default function AccountDetail({ account, onBack, onEdit, onDelete, onAddExpense, onEditExpense, onToggleExpense, onToggleCuota, onEditCuota }) {
  const isDebt = account.type === 'credito'
  const isNormal = account.type === 'normal'
  const canPend = isNormal && !!account.allowPending
  const defaultGroup = isNormal ? 'category' : 'none'
  const [query, setQuery] = useState('')
  const userPrefs = useUserPrefs()
  const familyPrefs = useFamilyPrefs()
  // Cuentas familiares: preferencia compartida entre miembros. Personales: propia del usuario.
  const isFamilyAccount = account.scope !== 'personal'
  const { prefs, setPref } = isFamilyAccount ? familyPrefs : userPrefs
  // Preferencias por cuenta.
  const groupKey = `movGroupBy_${account.id}`
  const orderKey = `movOrderBy_${account.id}`
  const groupBy = prefs[groupKey] ?? defaultGroup
  const orderBy = prefs[orderKey] ?? 'newest'
  const setGroupBy = (v) => setPref(groupKey, v)
  const setOrderBy = (v) => setPref(orderKey, v)
  // Grupos colapsados persistidos por cuenta.
  const collapsedKey = `movCollapsed_${account.id}`
  const collapsed = prefs[collapsedKey] || {}
  const [completedOpen, setCompletedOpen] = useState(false)

  const history = useMemo(() => last6MonthsHistory(account), [account])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (account.expenses || []).filter((e) => {
      if (!q) return true
      return (
        e.description.toLowerCase().includes(q) ||
        (e.category?.name || '').toLowerCase().includes(q)
      )
    })
  }, [account.expenses, query])

  const pending = useMemo(() => filtered.filter((e) => e.isPending), [filtered])
  const completed = useMemo(() => filtered.filter((e) => !e.isPending), [filtered])

  const completedGroups = useMemo(
    () => groupExpenses(completed, groupBy, orderBy),
    [completed, groupBy, orderBy],
  )
  // Completados en cuentas con pendientes: lista plana ordenada, sin encabezado ni borde de categoría.
  const completedFlat = useMemo(
    () => orderExpenses(completed, orderBy),
    [completed, orderBy],
  )
  const pendingGroups = useMemo(
    () => groupExpenses(pending, groupBy, orderBy),
    [pending, groupBy, orderBy],
  )
  const hasPending = canPend && pending.length > 0

  const toggle = (key) => setPref(collapsedKey, { ...collapsed, [key]: !collapsed[key] })

  return (
    <div className="acc-detail">
      <div className="acc-detail__bar">
        <button type="button" className="acc-detail__back" onClick={onBack} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="acc-detail__scroll">
        <div className="acc-detail__col acc-detail__col--left">
          <div className="acc-detail__card">
            <AccountCard
              account={account}
              onOpen={() => {}}
              onEdit={() => onEdit(account)}
              onDelete={() => onDelete(account)}
            />
          </div>

          <section className="acc-history">
            <h2 className="acc-history__title">Histórico últimos 6 meses</h2>
            <div className="acc-history__table">
              <div className="acc-history__row acc-history__row--head">
                <span>Mes</span>
                <span>Ingresos</span>
                <span>Gastos</span>
              </div>
              {history.map((m) => (
                <div className="acc-history__row" key={m.key}>
                  <span>{m.label}</span>
                  <span className="acc-history__in">{formatCurrency(m.ingresos)}</span>
                  <span className="acc-history__out">{formatCurrency(m.gastos)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="acc-detail__col acc-detail__col--right">
          {isDebt ? (
            <DebtView account={account} onAdd={onAddExpense} onEditExpense={onEditExpense} onToggleExpense={onToggleExpense} onToggleCuota={onToggleCuota} onEditCuota={onEditCuota} />
          ) : (
            <>
              <MovementsFilter
                query={query}
                onQuery={setQuery}
                groupBy={groupBy}
                onGroup={setGroupBy}
                orderBy={orderBy}
                onOrder={setOrderBy}
                defaultGroup={defaultGroup}
                onAdd={onAddExpense}
                onClear={() => {
                  setGroupBy(defaultGroup)
                  setOrderBy('newest')
                }}
              />

              {filtered.length === 0 ? (
                <p className="acc-list__empty">No hay movimientos.</p>
              ) : (
                <div className="acc-detail__list">
                  {hasPending && (
                    <section className="mov-section">
                      <h3 className="mov-section__title">Pendientes</h3>
                      <ExpenseGroups groups={pendingGroups} collapsed={collapsed} onToggle={toggle} onEdit={onEditExpense} />
                    </section>
                  )}
                  {completed.length > 0 && (hasPending ? (
                    <section className="mov-section">
                      <button
                        type="button"
                        className="mov-accordion__head"
                        onClick={() => setCompletedOpen((o) => !o)}
                      >
                        <span className="mov-accordion__title">Completados</span>
                        <span className="mov-accordion__count">{completed.length}</span>
                        <svg
                          className={`mov-group__chevron${completedOpen ? ' mov-group__chevron--open' : ''}`}
                          viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </button>
                      {completedOpen && (
                        <div className="mov-group__items">
                          {completedFlat.map((e) => (
                            <AccountExpenseItem key={e.id} expense={e} onEdit={onEditExpense} />
                          ))}
                        </div>
                      )}
                    </section>
                  ) : (
                    <section className="mov-section">
                      <ExpenseGroups groups={completedGroups} collapsed={collapsed} onToggle={toggle} onEdit={onEditExpense} />
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
