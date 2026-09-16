import { useEffect, useMemo, useRef, useState } from 'react'
import AccountCard from './AccountCard.jsx'
import AccountExpenseItem from './AccountExpenseItem.jsx'
import { formatCurrency } from '../../presupuesto/presupuesto.utils'
import { EXPENSE_GROUP_BY, EXPENSE_ORDER_BY } from '../accounts.constants'
import { last6MonthsHistory, monthGroupLabel } from '../accounts.utils'
import { useUserPrefs } from '../../../shared/hooks/useUserPrefs'

// Menú de búsqueda + agrupar/ordenar de los movimientos.
function MovementsFilter({ query, onQuery, groupBy, onGroup, orderBy, onOrder, onClear, defaultGroup }) {
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
      <div className="tx-search acc-filter__search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
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

      <div className="acc-filter__menu-wrap" ref={ref}>
        <button
          type="button"
          className={`acc-filter__btn${active ? ' acc-filter__btn--active' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Filtrar"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5h18M6 12h12M10 19h4" />
          </svg>
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

function ExpenseGroups({ groups, collapsed, onToggle, onEdit }) {
  return (
    <div className="mov-groups">
      {groups.map((g) => {
        const isOpen = !collapsed[g.key]
        const total = signedTotal(g.items)
        return (
          <div className={`mov-group${g.label ? '' : ' mov-group--flat'}`} key={g.key} style={g.color ? { borderLeftColor: g.color } : undefined}>
            {g.label && (
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
            )}
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

export default function AccountDetail({ account, onBack, onEdit, onDelete, onAddExpense, onEditExpense }) {
  const isNormal = account.type === 'normal'
  const canPend = isNormal && !!account.allowPending
  const defaultGroup = isNormal ? 'category' : 'none'
  const [query, setQuery] = useState('')
  const { prefs, setPref } = useUserPrefs()
  // Preferencias por cuenta (personales del usuario).
  const groupKey = `movGroupBy_${account.id}`
  const orderKey = `movOrderBy_${account.id}`
  const groupBy = prefs[groupKey] ?? defaultGroup
  const orderBy = prefs[orderKey] ?? 'newest'
  const setGroupBy = (v) => setPref(groupKey, v)
  const setOrderBy = (v) => setPref(orderKey, v)
  const [collapsed, setCollapsed] = useState({})

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
  const pendingGroups = useMemo(
    () => groupExpenses(pending, 'none', orderBy),
    [pending, orderBy],
  )

  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }))

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
          <div className="acc-detail__movhead">
            <h2 className="acc-detail__movtitle">Movimientos</h2>
            <button type="button" className="acc-add" onClick={onAddExpense} aria-label="Agregar movimiento">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="acc-add__label">Agregar</span>
            </button>
          </div>

          <MovementsFilter
            query={query}
            onQuery={setQuery}
            groupBy={groupBy}
            onGroup={setGroupBy}
            orderBy={orderBy}
            onOrder={setOrderBy}
            defaultGroup={defaultGroup}
            onClear={() => {
              setGroupBy(defaultGroup)
              setOrderBy('newest')
            }}
          />

          {filtered.length === 0 ? (
            <p className="acc-list__empty">No hay movimientos.</p>
          ) : (
            <>
              {canPend && pending.length > 0 && (
                <section className="mov-section">
                  <h3 className="mov-section__title">Pendientes</h3>
                  <ExpenseGroups groups={pendingGroups} collapsed={collapsed} onToggle={toggle} onEdit={onEditExpense} />
                </section>
              )}
              {completed.length > 0 && (
                <section className="mov-section">
                  {canPend && pending.length > 0 && <h3 className="mov-section__title">Completados</h3>}
                  <ExpenseGroups groups={completedGroups} collapsed={collapsed} onToggle={toggle} onEdit={onEditExpense} />
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
