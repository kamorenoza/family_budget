import { useEffect, useRef, useState } from 'react'
import './Presupuesto.css'
import MonthSelector from '../../../shared/components/MonthSelector/MonthSelector.jsx'
import SideDrawer from '../../../shared/components/SideDrawer/SideDrawer.jsx'
import IncomeDrawer from '../components/IncomeDrawer.jsx'
import ExpenseDrawer from '../components/ExpenseDrawer.jsx'
import IncomeDeleteDialog from '../components/IncomeDeleteDialog.jsx'
import { confirm } from '../../../shared/components/ConfirmDialog/confirm.jsx'
import { useAuth } from '../../../shared/context/AuthContext.jsx'
import { useUserPrefs } from '../../../shared/hooks/useUserPrefs'
import { useMembers } from '../../settings/useMembers'
import { useIncomes } from '../useIncomes'
import { useExpenses } from '../useExpenses'
import { useCategories } from '../../categories/useCategories'
import { ExpenseItem, BolsilloAccordion, IncomeItem } from '../components/TxItems.jsx'
import { formatCurrency, dayOfDate, fullDateLabel, monthKeyOf } from '../presupuesto.utils'
import UserIcon from '../../../shared/components/icons/UserIcon.jsx'

export default function Presupuesto() {
  const { user } = useAuth()
  const { members } = useMembers(user)
  const { incomes, addIncome, updateIncome, deleteIncome, removeFixedMonth, endFixedFrom } = useIncomes()
  const {
    expenses,
    addExpense,
    updateExpense,
    togglePaid,
    deleteExpense,
    removeFixedMonth: removeExpenseMonth,
    endFixedFrom: endExpenseFrom,
  } = useExpenses()
  const { categories } = useCategories()
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [expenseDeleteOpen, setExpenseDeleteOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const { prefs, setPref } = useUserPrefs()
  const expenseSort = prefs.budgetExpenseSort ?? 'fecha'
  const setExpenseSort = (v) => setPref('budgetExpenseSort', v)
  const [expenseQuery, setExpenseQuery] = useState('')
  const filterRef = useRef(null)
  const now = new Date()
  const [period, setPeriod] = useState({ month: now.getMonth(), year: now.getFullYear() })

  const monthKey = monthKeyOf(period.month, period.year)

  // Cierra el menú de filtros al hacer click fuera.
  useEffect(() => {
    if (!filterOpen) return
    const onDocClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [filterOpen])

  // Fijos: desde startMonth, salvo excluidos o posteriores al corte. Variables: solo en su mes.
  const visibleIncomes = incomes
    .filter((inc) => {
      if (inc.fixed) {
        if (inc.startMonth && monthKey < inc.startMonth) return false
        if ((inc.excludedMonths || {})[monthKey]) return false
        if (inc.endMonth && monthKey > inc.endMonth) return false
        return true
      }
      return inc.monthKey === monthKey
    })
    .map((inc) => ({
      ...inc,
      isReceived: inc.fixed ? !!(inc.receivedMonths || {})[monthKey] : !!inc.received,
    }))

  const memberOf = (email) => members.find((m) => m.email === email)
  const categoryOf = (id) => categories.find((c) => c.id === id)

  // Los movimientos personales descuentan del total pero no se listan en la vista familiar.
  const listIncomes = visibleIncomes.filter((i) => i.scope !== 'personal')

  // Fijos: desde startMonth, salvo excluidos o posteriores al corte. Variables: solo en su mes.
  const visibleExpenses = expenses
    .filter((exp) => {
      if (exp.fixed) {
        if (exp.startMonth && monthKey < exp.startMonth) return false
        if ((exp.excludedMonths || {})[monthKey]) return false
        if (exp.endMonth && monthKey > exp.endMonth) return false
        return true
      }
      return exp.monthKey === monthKey
    })
    .map((exp) => ({
      ...exp,
      isPaid: exp.fixed ? !!(exp.paidMonths || {})[monthKey] : !!exp.paid,
    }))

  // Orden del listado según el filtro seleccionado.
  const sortedExpenses = [...visibleExpenses.filter((e) => e.scope !== 'personal')].sort((a, b) => {
    if (expenseSort === 'categoria') {
      return (categoryOf(a.categoryId)?.name || '').localeCompare(categoryOf(b.categoryId)?.name || '')
    }
    if (expenseSort === 'tipo') {
      return (a.kind === 'bolsillo' ? 0 : 1) - (b.kind === 'bolsillo' ? 0 : 1)
    }
    return dayOfDate(a.date) - dayOfDate(b.date)
  })

  // Búsqueda por nombre o valor del gasto.
  const query = expenseQuery.trim().toLowerCase()
  const queryDigits = expenseQuery.replace(/\D/g, '')
  const filteredExpenses = query
    ? sortedExpenses.filter(
        (e) =>
          (e.description || '').toLowerCase().includes(query) ||
          (queryDigits && String(Math.round(Number(e.amount) || 0)).includes(queryDigits)),
      )
    : sortedExpenses

  // Bolsillos del mes y cuánto se ha consumido de cada uno (gastos con origen bolsillo).
  const bolsillos = visibleExpenses.filter((e) => e.kind === 'bolsillo')
  const usedByBolsillo = visibleExpenses.reduce((acc, e) => {
    if (e.sourceType === 'bolsillo' && e.bolsilloId) {
      acc[e.bolsilloId] = (acc[e.bolsilloId] || 0) + (Number(e.amount) || 0)
    }
    return acc
  }, {})
  const bolsilloSources = bolsillos.map((b) => ({
    id: b.id,
    description: b.description,
    color: b.color,
    available: (Number(b.amount) || 0) - (usedByBolsillo[b.id] || 0),
  }))

  // Totales del mes (los gastos con origen bolsillo ya están cubiertos por la meta del bolsillo).
  const totalIngresos = visibleIncomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0)
  const totalGastos = visibleExpenses
    .filter((e) => e.sourceType !== 'bolsillo')
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  const disponible = totalIngresos - totalGastos

  // Disponible por persona = sus ingresos del mes - sus gastos del mes (sin los que salen de un bolsillo).
  const availableByEmail = members.reduce((acc, m) => {
    const inc = visibleIncomes
      .filter((i) => i.memberEmail === m.email)
      .reduce((s, i) => s + (Number(i.amount) || 0), 0)
    const exp = visibleExpenses
      .filter((e) => e.memberEmail === m.email && e.sourceType !== 'bolsillo')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
    acc[m.email] = inc - exp
    return acc
  }, {})

  // Comprometido por persona = sus gastos del mes (incluye la meta de sus bolsillos), sin los que salen de un bolsillo.
  const committedByEmail = members.reduce((acc, m) => {
    acc[m.email] = visibleExpenses
      .filter((e) => e.memberEmail === m.email && e.sourceType !== 'bolsillo')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
    return acc
  }, {})

  const openNewIncome = () => {
    setEditingIncome(null)
    setIncomeOpen(true)
  }

  const openEditIncome = (tx) => {
    setEditingIncome(tx)
    setIncomeOpen(true)
  }

  const closeIncome = () => {
    setIncomeOpen(false)
    setEditingIncome(null)
    setDeleteOpen(false)
  }

  const handleSubmitIncome = (data) =>
    editingIncome ? updateIncome(editingIncome, data) : addIncome(data)

  const handleDeleteIncome = async () => {
    const inc = editingIncome
    if (!inc) return
    if (inc.fixed) {
      setDeleteOpen(true)
      return
    }
    const ok = await confirm({
      title: '¿Eliminar ingreso?',
      message: `Se eliminará "${inc.description}". Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    deleteIncome(inc)
    closeIncome()
  }

  // Aplica el alcance elegido en el modal (solo ingresos fijos).
  const confirmDeleteScope = (scope) => {
    const inc = editingIncome
    if (!inc) return
    if (scope === 'month') removeFixedMonth(inc, monthKey)
    else if (scope === 'from') endFixedFrom(inc, monthKey)
    else deleteIncome(inc)
    closeIncome()
  }

  const openNewExpense = () => {
    setEditingExpense(null)
    setExpenseOpen(true)
  }

  const openEditExpense = (tx) => {
    setEditingExpense(tx)
    setExpenseOpen(true)
  }

  const closeExpense = () => {
    setExpenseOpen(false)
    setEditingExpense(null)
    setExpenseDeleteOpen(false)
  }

  const handleSubmitExpense = (data) =>
    editingExpense ? updateExpense(editingExpense, data) : addExpense(data)

  const handleDeleteExpense = async () => {
    const exp = editingExpense
    if (!exp) return
    if (exp.fixed) {
      setExpenseDeleteOpen(true)
      return
    }
    const ok = await confirm({
      title: '¿Eliminar gasto?',
      message: `Se eliminará "${exp.description}". Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    deleteExpense(exp)
    closeExpense()
  }

  // Aplica el alcance elegido en el modal (solo gastos fijos).
  const confirmDeleteExpenseScope = (scope) => {
    const exp = editingExpense
    if (!exp) return
    if (scope === 'month') removeExpenseMonth(exp, monthKey)
    else if (scope === 'from') endExpenseFrom(exp, monthKey)
    else deleteExpense(exp)
    closeExpense()
  }

  const handleTogglePaid = async (tx) => {
    const willPay = !tx.isPaid
    const ok = await confirm({
      title: willPay ? '¿Marcar como pagado?' : '¿Marcar como pendiente?',
      message: willPay
        ? '¿Este gasto ya fue pagado?'
        : '¿Este gasto vuelve a estar pendiente de pago?',
      confirmText: 'Sí',
      cancelText: 'No',
    })
    if (!ok) return
    togglePaid(tx, monthKey)
  }

  return (
    <section className="presupuesto">
      <header className="presupuesto__header">
        <h1 className="presupuesto__title">Presupuesto familiar</h1>
      </header>

      <div className="presupuesto__side">
      <MonthSelector onChange={(month, year) => setPeriod({ month, year })} />
      <article className="card summary-card">
        <div className="summary-card__head">
          <span className="summary-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <div>
            <p className="summary-card__label">Disponible familiar</p>
            <p className="summary-card__value">{formatCurrency(disponible)}</p>
          </div>
        </div>
        <div className="summary-card__grid">
          <div className="summary-card__item">
            <span className="summary-card__item-label">Ingresos</span>
            <span className="summary-card__item-value">{formatCurrency(totalIngresos)}</span>
          </div>
          <div className="summary-card__item">
            <span className="summary-card__item-label">Gastos</span>
            <span className="summary-card__item-value summary-card__item-value--gasto">{formatCurrency(totalGastos)}</span>
          </div>
        </div>
      </article>

      <div className="members">
        {[0, 1].map((i) => {
          const member = members[i]
          const firstName = member ? member.name.split(' ')[0] : `Persona ${i + 1}`
          return (
            <article
              key={member?.id || i}
              className="card member-card"
              style={{
                background: member
                  ? `color-mix(in srgb, ${member.color} 14%, #fff)`
                  : 'color-mix(in srgb, var(--color-text-muted) 10%, #fff)',
              }}
            >
              <div className="member-card__head">
                {member ? (
                  <span className="member-card__avatar" style={{ background: member.color }}>
                    {member.photo ? (
                      <img
                        className="member-card__avatar-img"
                        src={member.photo}
                        alt={firstName}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      firstName.charAt(0).toUpperCase()
                    )}
                  </span>
                ) : (
                  <span className="member-card__avatar member-card__avatar--empty">
                    <UserIcon className="member-card__avatar-icon" />
                  </span>
                )}
                <span className="member-card__name">{firstName}</span>
              </div>
              {member ? (
                <div className="member-card__stats">
                  <div className="member-card__stat">
                    <p className="member-card__label">Disponible</p>
                    <p className="member-card__value">{formatCurrency(availableByEmail[member.email] || 0)}</p>
                  </div>
                  <div className="member-card__stat">
                    <p className="member-card__label">Comprometido</p>
                    <p className="member-card__value member-card__value--muted">{formatCurrency(committedByEmail[member.email] || 0)}</p>
                  </div>
                </div>
              ) : (
                <p className="member-card__empty">Agrega una persona en configuración</p>
              )}
            </article>
          )
        })}
      </div>
      </div>

      <div className="presupuesto__scroll">
        <div className="tx-search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            className="tx-search__input"
            placeholder="Buscar gasto por nombre o valor"
            value={expenseQuery}
            onChange={(e) => setExpenseQuery(e.target.value)}
          />
          {expenseQuery && (
            <button
              type="button"
              className="tx-search__clear"
              onClick={() => setExpenseQuery('')}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>
        <section className="tx-section">
          <div className="tx-section__head">
            <h2 className="tx-section__title">Ingresos</h2>
            <button
              type="button"
              className="tx-section__add tx-section__add--income"
              onClick={openNewIncome}
              aria-label="Agregar ingreso"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="tx-section__add-label">Agregar ingreso</span>
            </button>
          </div>
          <div className="tx-list tx-list--income">
            {listIncomes.length === 0 ? (
              <p className="tx-empty">Sin ingresos este mes. Toca + para agregar.</p>
            ) : (
              listIncomes.map((tx) => {
                const m = memberOf(tx.memberEmail)
                const dateLabel = fullDateLabel(dayOfDate(tx.date), period.month, period.year)
                return (
                  <IncomeItem
                    key={tx.id}
                    tx={tx}
                    member={m}
                    memberName={m ? m.name.split(' ')[0] : 'Sin persona'}
                    memberColor={m?.color || 'var(--color-primary)'}
                    dateLabel={dateLabel}
                    onEdit={openEditIncome}
                  />
                )
              })
            )}
          </div>
        </section>

        <section className="tx-section">
          <div className="tx-section__head">
            <h2 className="tx-section__title">Gastos</h2>
            <div className="tx-section__actions">
              <div className="tx-filter" ref={filterRef}>
                <button
                  type="button"
                  className="tx-filter__btn"
                  onClick={() => setFilterOpen((o) => !o)}
                  aria-label="Ordenar"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M6 12h12M10 18h4" />
                  </svg>
                  <span className="tx-filter__btn-label">Ordenar</span>
                </button>
                {filterOpen && (
                  <div className="tx-filter__menu">
                    <div className="tx-filter__search">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M21 21l-4.3-4.3" />
                      </svg>
                      <input
                        type="text"
                        className="tx-filter__search-input"
                        placeholder="Buscar por nombre o valor"
                        value={expenseQuery}
                        onChange={(e) => setExpenseQuery(e.target.value)}
                      />
                      {expenseQuery && (
                        <button
                          type="button"
                          className="tx-filter__search-clear"
                          onClick={() => setExpenseQuery('')}
                          aria-label="Limpiar búsqueda"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <p className="tx-filter__label">Ordenar por</p>
                    <select
                      className="tx-filter__select"
                      value={expenseSort}
                      onChange={(e) => {
                        setExpenseSort(e.target.value)
                        setFilterOpen(false)
                      }}
                    >
                      <option value="categoria">Categoría</option>
                      <option value="fecha">Fecha</option>
                      <option value="tipo">Tipo (bolsillo o normal)</option>
                    </select>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="tx-section__add tx-section__add--gasto"
                onClick={openNewExpense}
                aria-label="Agregar gasto"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="tx-section__add-label">Agregar gasto</span>
              </button>
            </div>
          </div>
          <div className="tx-list">
            {sortedExpenses.length === 0 ? (
              <p className="tx-empty">Sin gastos este mes. Toca + para agregar.</p>
            ) : filteredExpenses.length === 0 ? (
              <p className="tx-empty">Sin resultados para “{expenseQuery}”.</p>
            ) : (
              filteredExpenses.map((tx) => {
                // Los gastos que salen de un bolsillo se muestran dentro de su accordion.
                if (tx.sourceType === 'bolsillo' && tx.bolsilloId) return null
                if (tx.kind === 'bolsillo') {
                  const childExpenses = visibleExpenses.filter(
                    (e) => e.sourceType === 'bolsillo' && e.bolsilloId === tx.id,
                  )
                  const bm = memberOf(tx.memberEmail)
                  const bolsilloSource = bm
                    ? { name: bm.name.split(' ')[0], color: bm.color || 'var(--color-primary)' }
                    : null
                  return (
                    <BolsilloAccordion
                      key={tx.id}
                      tx={tx}
                      used={usedByBolsillo[tx.id] || 0}
                      childExpenses={childExpenses}
                      categoryOf={categoryOf}
                      source={bolsilloSource}
                      dateLabelOf={(c) => fullDateLabel(dayOfDate(c.date), period.month, period.year)}
                      onToggle={handleTogglePaid}
                      onEdit={openEditExpense}
                    />
                  )
                }
                const m = memberOf(tx.memberEmail)
                const source = m
                  ? { name: m.name.split(' ')[0], color: m.color || 'var(--color-primary)' }
                  : null
                return (
                  <ExpenseItem
                    key={tx.id}
                    tx={tx}
                    category={categoryOf(tx.categoryId)}
                    source={source}
                    dateLabel={fullDateLabel(dayOfDate(tx.date), period.month, period.year)}
                    onToggle={handleTogglePaid}
                    onEdit={openEditExpense}
                  />
                )
              })
            )}
          </div>
        </section>
      </div>

      <SideDrawer open={incomeOpen} onClose={closeIncome} title={editingIncome ? 'Editar ingreso' : 'Agregar ingreso'}>
        <IncomeDrawer
          key={editingIncome?.id || 'new'}
          members={members}
          income={editingIncome}
          defaultMonth={period.month}
          defaultYear={period.year}
          onSubmit={handleSubmitIncome}
          onDelete={handleDeleteIncome}
          onClose={closeIncome}
        />
      </SideDrawer>

      {deleteOpen && (
        <IncomeDeleteDialog onConfirm={confirmDeleteScope} onCancel={() => setDeleteOpen(false)} />
      )}

      <SideDrawer open={expenseOpen} onClose={closeExpense} title={editingExpense ? 'Editar gasto' : 'Agregar gasto'}>
        <ExpenseDrawer
          key={editingExpense?.id || 'new'}
          members={members}
          categories={categories}
          bolsillos={bolsilloSources}
          availableByEmail={availableByEmail}
          expense={editingExpense}
          defaultMonth={period.month}
          defaultYear={period.year}
          onSubmit={handleSubmitExpense}
          onDelete={handleDeleteExpense}
          onClose={closeExpense}
        />
      </SideDrawer>

      {expenseDeleteOpen && (
        <IncomeDeleteDialog onConfirm={confirmDeleteExpenseScope} onCancel={() => setExpenseDeleteOpen(false)} />
      )}
    </section>
  )
}
