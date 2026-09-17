import { useEffect, useRef, useState } from 'react'
import './Personal.css'
import '../../presupuesto/pages/Presupuesto.css'
import MonthSelector from '../../../shared/components/MonthSelector/MonthSelector.jsx'
import SideDrawer from '../../../shared/components/SideDrawer/SideDrawer.jsx'
import IncomeDrawer from '../../presupuesto/components/IncomeDrawer.jsx'
import ExpenseDrawer from '../../presupuesto/components/ExpenseDrawer.jsx'
import IncomeDeleteDialog from '../../presupuesto/components/IncomeDeleteDialog.jsx'
import EditScopeDialog from '../../presupuesto/components/EditScopeDialog.jsx'
import { ExpenseItem, BolsilloAccordion, CategoryAccordion, IncomeItem } from '../../presupuesto/components/TxItems.jsx'
import { confirm } from '../../../shared/components/ConfirmDialog/confirm.jsx'
import { useAuth } from '../../../shared/context/AuthContext.jsx'
import { useUserPrefs } from '../../../shared/hooks/useUserPrefs'
import { useDragOrder } from '../../../shared/hooks/useDragOrder'
import { useMembers } from '../../settings/useMembers'
import { useIncomes } from '../../presupuesto/useIncomes'
import { useExpenses } from '../../presupuesto/useExpenses'
import { useCategories } from '../../categories/useCategories'
import {
  formatCurrency,
  dayOfDate,
  fullDateLabel,
  monthKeyOf,
  isVisibleInMonth,
  applyMonthOverride,
} from '../../presupuesto/presupuesto.utils'

export default function Personal() {
  const { user } = useAuth()
  const { members } = useMembers(user)
  const { incomes, addIncome, updateIncome, deleteIncome, removeFixedMonth, endFixedFrom, overrideIncomeMonth, splitIncomeFrom } = useIncomes()
  const {
    expenses,
    addExpense,
    updateExpense,
    togglePaid,
    deleteExpense,
    removeFixedMonth: removeExpenseMonth,
    endFixedFrom: endExpenseFrom,
    overrideExpenseMonth,
    splitExpenseFrom,
  } = useExpenses()
  const { categories } = useCategories()

  const [incomeOpen, setIncomeOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [expenseDeleteOpen, setExpenseDeleteOpen] = useState(false)
  const [incomeScopeOpen, setIncomeScopeOpen] = useState(false)
  const [pendingIncome, setPendingIncome] = useState(null)
  const [expenseScopeOpen, setExpenseScopeOpen] = useState(false)
  const [pendingExpense, setPendingExpense] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  // Preferencia de orden personal (propia de cada usuario, no se comparte).
  const { prefs, setPref } = useUserPrefs()
  const expenseSort = prefs.personalExpenseSort ?? 'fecha'
  const setExpenseSort = (v) => setPref('personalExpenseSort', v)
  const groupBy = prefs.personalGroupBy ?? 'none'
  const setGroupBy = (v) => setPref('personalGroupBy', v)
  const [reorderMode, setReorderMode] = useState(false)
  const [expenseQuery, setExpenseQuery] = useState('')
  const filterRef = useRef(null)
  const now = new Date()
  const [period, setPeriod] = useState({ month: now.getMonth(), year: now.getFullYear() })

  const monthKey = monthKeyOf(period.month, period.year)
  const email = user?.email
  const self = members.find((m) => m.self)
  const displayName = self?.name || email?.split('@')[0] || 'Personal'

  // Cierra el menú de filtros al hacer click fuera.
  useEffect(() => {
    if (!filterOpen) return
    const onDocClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [filterOpen])

  const memberOf = (memberEmail) => members.find((m) => m.email === memberEmail)
  const categoryOf = (id) => categories.find((c) => c.id === id)

  // Solo lo de esta persona (origen = usuario) y visible en el mes.
  const myIncomes = incomes
    .filter((inc) => inc.memberEmail === email && isVisibleInMonth(inc, monthKey))
    .map((inc) => {
      const o = applyMonthOverride(inc, monthKey)
      return { ...o, isReceived: inc.fixed ? !!(inc.receivedMonths || {})[monthKey] : !!inc.received }
    })

  const myExpenses = expenses
    .filter((exp) => exp.memberEmail === email && isVisibleInMonth(exp, monthKey))
    .map((exp) => {
      const o = applyMonthOverride(exp, monthKey)
      return { ...o, isPaid: exp.fixed ? !!(exp.paidMonths || {})[monthKey] : !!exp.paid }
    })

  // Ordena una lista de gastos según el criterio seleccionado (se reutiliza dentro de cada grupo).
  const sortExpensesBy = (arr) =>
    [...arr].sort((a, b) => {
      if (expenseSort === 'manual') {
        const ord = prefs.personalExpenseOrder || []
        const ia = ord.indexOf(a.id)
        const ib = ord.indexOf(b.id)
        const na = ia === -1 ? Infinity : ia
        const nb = ib === -1 ? Infinity : ib
        if (na !== nb) return na - nb
        return String(a.date).localeCompare(String(b.date))
      }
      if (expenseSort === 'categoria') {
        return (categoryOf(a.categoryId)?.name || '').localeCompare(categoryOf(b.categoryId)?.name || '')
      }
      if (expenseSort === 'tipo') {
        return (a.kind === 'bolsillo' ? 0 : 1) - (b.kind === 'bolsillo' ? 0 : 1)
      }
      if (expenseSort === 'fechaDesc') {
        const byDate = String(b.date).localeCompare(String(a.date))
        return byDate !== 0 ? byDate : (b.createdAt || 0) - (a.createdAt || 0)
      }
      // 'fecha': ascendente, del primero al último agregado.
      const byDate = String(a.date).localeCompare(String(b.date))
      return byDate !== 0 ? byDate : (a.createdAt || 0) - (b.createdAt || 0)
    })

  // Orden del listado según el filtro seleccionado.
  const sortedExpenses = sortExpensesBy(myExpenses)

  const query = expenseQuery.trim().toLowerCase()
  const queryDigits = expenseQuery.replace(/\D/g, '')
  const filteredExpenses = query
    ? sortedExpenses.filter(
        (e) =>
          (e.description || '').toLowerCase().includes(query) ||
          (queryDigits && String(Math.round(Number(e.amount) || 0)).includes(queryDigits)),
      )
    : sortedExpenses

  // Elementos de primer nivel (los gastos de un bolsillo se muestran dentro de su accordion).
  const topLevelExpenses = filteredExpenses.filter((e) => !(e.sourceType === 'bolsillo' && e.bolsilloId))
  const expenseById = new Map(topLevelExpenses.map((e) => [e.id, e]))

  // Guarda el orden manual personal cuando se arrastra.
  const saveExpenseOrder = (visibleIds) => {
    const prev = prefs.personalExpenseOrder || []
    const seen = new Set(visibleIds)
    setPref('personalExpenseOrder', [...visibleIds, ...prev.filter((id) => !seen.has(id))])
  }
  const { order: dragOrder, dragPropsFor } = useDragOrder(
    topLevelExpenses.map((e) => e.id),
    saveExpenseOrder,
  )

  // Agrupación por categoría: los bolsillos van aparte y los gastos normales se agrupan.
  const groupMode = groupBy === 'categoria'
  const groupBolsillos = topLevelExpenses.filter((e) => e.kind === 'bolsillo')
  const groupNormal = topLevelExpenses.filter((e) => e.kind !== 'bolsillo')
  const byCat = new Map()
  groupNormal.forEach((e) => {
    const key = e.categoryId || 'sin'
    if (!byCat.has(key)) byCat.set(key, [])
    byCat.get(key).push(e)
  })
  const catOrderPref = prefs.personalCategoryOrder || []
  const catIds = [...byCat.keys()].sort((a, b) => {
    const ia = catOrderPref.indexOf(a)
    const ib = catOrderPref.indexOf(b)
    const na = ia === -1 ? Infinity : ia
    const nb = ib === -1 ? Infinity : ib
    if (na !== nb) return na - nb
    return String(a).localeCompare(String(b))
  })
  // Dentro de cada categoría, los gastos se ordenan con el mismo criterio elegido.
  const orderItems = (arr) => sortExpensesBy(arr)
  const saveCatOrder = (ids) => {
    const prev = prefs.personalCategoryOrder || []
    const seen = new Set(ids)
    setPref('personalCategoryOrder', [...ids, ...prev.filter((id) => !seen.has(id))])
  }
  const { order: catDragOrder, dragPropsFor: catDragPropsFor } = useDragOrder(catIds, saveCatOrder, {
    attr: 'data-cat-id',
  })
  const renderCatIds = reorderMode ? catDragOrder.filter((id) => byCat.has(id)) : catIds

  // Cambia el criterio de orden; avisa si se perderá el orden personalizado.
  const changeSort = async (value) => {
    if (value === expenseSort) {
      setFilterOpen(false)
      return
    }
    if (expenseSort === 'manual' && value !== 'manual') {
      const ok = await confirm({
        title: '¿Cambiar el orden?',
        message: 'Se perderá el orden personalizado que definiste.',
        confirmText: 'Cambiar',
        cancelText: 'Cancelar',
      })
      if (!ok) {
        setFilterOpen(false)
        return
      }
      setPref('personalExpenseOrder', [])
      setReorderMode(false)
    }
    setExpenseSort(value)
    setFilterOpen(false)
  }

  // Cambia el agrupamiento sin afectar el criterio de orden.
  const changeGroupBy = (value) => {
    setGroupBy(value)
    // Al agrupar por categoría, ordenar por categoría/tipo no aplica: se vuelve a fecha.
    if (value === 'categoria' && (expenseSort === 'categoria' || expenseSort === 'tipo')) {
      setExpenseSort('fecha')
    }
    setFilterOpen(false)
  }

  const renderExpenses = reorderMode
    ? dragOrder.map((id) => expenseById.get(id)).filter(Boolean)
    : topLevelExpenses

  // Activa/desactiva el modo reordenar. Al activarlo, fija el orden manual.
  const toggleReorder = () => {
    setReorderMode((on) => {
      const next = !on
      if (next && expenseSort !== 'manual') setExpenseSort('manual')
      return next
    })
  }

  // Bolsillos de la persona y consumo de cada uno.
  const bolsillos = myExpenses.filter((e) => e.kind === 'bolsillo')
  const usedByBolsillo = myExpenses.reduce((acc, e) => {
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

  // Totales de la persona (los gastos con origen bolsillo ya están en la meta del bolsillo).
  const totalIngresos = myIncomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0)
  const totalComprometido = myExpenses
    .filter((e) => e.sourceType !== 'bolsillo')
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  const disponible = totalIngresos - totalComprometido

  const availableByEmail = { [email]: disponible }

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
  // Al editar el valor o el nombre de un ingreso fijo, se pregunta a qué meses aplica.
  const handleSubmitIncome = (data) => {
    if (
      editingIncome &&
      editingIncome.fixed &&
      data.fixed &&
      (Number(data.amount) !== Number(editingIncome.amount) ||
        data.description !== editingIncome.description)
    ) {
      setPendingIncome({ item: editingIncome, data })
      setIncomeScopeOpen(true)
      return null
    }
    return editingIncome ? updateIncome(editingIncome, data) : addIncome(data)
  }

  // Aplica el cambio del ingreso fijo según el alcance elegido.
  const applyIncomeScope = (scope) => {
    const p = pendingIncome
    if (!p) return
    if (scope === 'month')
      overrideIncomeMonth(p.item, monthKey, { amount: p.data.amount, description: p.data.description })
    else if (scope === 'from') splitIncomeFrom(p.item, monthKey, p.data)
    else updateIncome(p.item, p.data)
    setIncomeScopeOpen(false)
    setPendingIncome(null)
  }

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
  // Al editar el valor o el nombre de un gasto fijo, se pregunta a qué meses aplica.
  const handleSubmitExpense = (data) => {
    if (
      editingExpense &&
      editingExpense.fixed &&
      data.fixed &&
      (Number(data.amount) !== Number(editingExpense.amount) ||
        data.description !== editingExpense.description)
    ) {
      setPendingExpense({ item: editingExpense, data })
      setExpenseScopeOpen(true)
      return { keepOpen: true }
    }
    return editingExpense ? updateExpense(editingExpense, data) : addExpense(data)
  }

  // Aplica el cambio del gasto fijo según el alcance elegido.
  const applyExpenseScope = (scope) => {
    const p = pendingExpense
    if (!p) return
    if (scope === 'month')
      overrideExpenseMonth(p.item, monthKey, { amount: p.data.amount, description: p.data.description })
    else if (scope === 'from') splitExpenseFrom(p.item, monthKey, p.data)
    else updateExpense(p.item, p.data)
    setExpenseScopeOpen(false)
    setPendingExpense(null)
    closeExpense()
  }

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
    <section className="personal">
      <header className="personal__header">
        <h1 className="personal__title">{displayName}</h1>
      </header>

      <div className="personal__side">
      <MonthSelector onChange={(month, year) => setPeriod({ month, year })} />
      <article className="card personal-summary">
        <div className="personal-summary__top">
          <p className="personal-summary__label">Disponible</p>
          <p className="personal-summary__value">{formatCurrency(disponible)}</p>
        </div>
        <div className="personal-summary__grid">
          <div className="personal-summary__item">
            <span className="personal-summary__item-label">Ingresos</span>
            <span className="personal-summary__item-value">{formatCurrency(totalIngresos)}</span>
          </div>
          <div className="personal-summary__item">
            <span className="personal-summary__item-label">Comprometido</span>
            <span className="personal-summary__item-value personal-summary__item-value--rojo">
              {formatCurrency(totalComprometido)}
            </span>
          </div>
        </div>
      </article>
      </div>

      <div className="personal__scroll">
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
          {myIncomes.length === 0 ? (
            <p className="tx-empty">Sin ingresos este mes</p>
          ) : (
            myIncomes.map((tx) => {
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
                  <p className="tx-filter__label">Agrupar por</p>
                  <select
                    className="tx-filter__select"
                    value={groupBy}
                    onChange={(e) => changeGroupBy(e.target.value)}
                  >
                    <option value="none">Sin agrupar</option>
                    <option value="categoria">Categoría</option>
                  </select>
                  <p className="tx-filter__label">Ordenar por</p>
                  <select
                    className="tx-filter__select"
                    value={expenseSort}
                    onChange={(e) => changeSort(e.target.value)}
                  >
                    <option value="fecha">Fecha (más antiguo)</option>
                    <option value="fechaDesc">Fecha (más reciente)</option>
                    {!groupMode && <option value="categoria">Categoría</option>}
                    {!groupMode && <option value="tipo">Tipo (bolsillo o normal)</option>}
                    <option value="manual">Personalizado</option>
                  </select>
                </div>
              )}
            </div>
            {topLevelExpenses.length > 1 && (
              <button
                type="button"
                className={`tx-reorder${reorderMode ? ' tx-reorder--on' : ''}`}
                onClick={toggleReorder}
                aria-label={reorderMode ? 'Listo' : 'Reordenar'}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {reorderMode ? (
                    <path d="M5 12l5 5L20 7" />
                  ) : (
                    <path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" />
                  )}
                </svg>
                <span className="tx-reorder__label">{reorderMode ? 'Listo' : 'Reordenar'}</span>
              </button>
            )}
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
          {myExpenses.length === 0 ? (
            <p className="tx-empty">Sin gastos este mes</p>
          ) : topLevelExpenses.length === 0 ? (
            <p className="tx-empty">Sin resultados para “{expenseQuery}”.</p>
          ) : groupMode ? (
            <>
              {renderCatIds.map((catId) => (
                <CategoryAccordion
                  key={catId}
                  category={catId === 'sin' ? null : categoryOf(catId)}
                  expenses={orderItems(byCat.get(catId) || [])}
                  onToggle={handleTogglePaid}
                  onEdit={openEditExpense}
                  dateLabelOf={(e) => fullDateLabel(dayOfDate(e.date), period.month, period.year)}
                  sourceOf={() => null}
                  dragMode={reorderMode}
                  dragProps={reorderMode ? catDragPropsFor(catId) : null}
                  itemDragMode={reorderMode}
                  itemDragPropsFor={dragPropsFor}
                />
              ))}
              {groupBolsillos.map((tx) => {
                const childExpenses = myExpenses.filter(
                  (e) => e.sourceType === 'bolsillo' && e.bolsilloId === tx.id,
                )
                return (
                  <BolsilloAccordion
                    key={tx.id}
                    tx={tx}
                    used={usedByBolsillo[tx.id] || 0}
                    childExpenses={childExpenses}
                    categoryOf={categoryOf}
                    source={null}
                    dateLabelOf={(c) => fullDateLabel(dayOfDate(c.date), period.month, period.year)}
                    onToggle={handleTogglePaid}
                    onEdit={openEditExpense}
                  />
                )
              })}
            </>
          ) : (
            renderExpenses.map((tx) => {
              if (tx.kind === 'bolsillo') {
                const childExpenses = myExpenses.filter(
                  (e) => e.sourceType === 'bolsillo' && e.bolsilloId === tx.id,
                )
                return (
                  <BolsilloAccordion
                    key={tx.id}
                    tx={tx}
                    used={usedByBolsillo[tx.id] || 0}
                    childExpenses={childExpenses}
                    categoryOf={categoryOf}
                    source={null}
                    dateLabelOf={(c) => fullDateLabel(dayOfDate(c.date), period.month, period.year)}
                    onToggle={handleTogglePaid}
                    onEdit={openEditExpense}
                    dragMode={reorderMode}
                    dragProps={reorderMode ? dragPropsFor(tx.id) : null}
                  />
                )
              }
              return (
                <ExpenseItem
                  key={tx.id}
                  tx={tx}
                  category={categoryOf(tx.categoryId)}
                  source={null}
                  dateLabel={fullDateLabel(dayOfDate(tx.date), period.month, period.year)}
                  onToggle={handleTogglePaid}
                  onEdit={openEditExpense}
                  dragMode={reorderMode}
                  dragProps={reorderMode ? dragPropsFor(tx.id) : null}
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
          showScope
          selfEmail={email}
          onSubmit={handleSubmitIncome}
          onDelete={handleDeleteIncome}
          onClose={closeIncome}
        />
      </SideDrawer>

      {deleteOpen && (
        <IncomeDeleteDialog onConfirm={confirmDeleteScope} onCancel={() => setDeleteOpen(false)} />
      )}

      {incomeScopeOpen && (
        <EditScopeDialog
          onConfirm={applyIncomeScope}
          onCancel={() => {
            setIncomeScopeOpen(false)
            setPendingIncome(null)
          }}
        />
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
          showScope
          selfEmail={email}
          onSubmit={handleSubmitExpense}
          onDelete={handleDeleteExpense}
          onClose={closeExpense}
        />
      </SideDrawer>

      {expenseDeleteOpen && (
        <IncomeDeleteDialog onConfirm={confirmDeleteExpenseScope} onCancel={() => setExpenseDeleteOpen(false)} />
      )}

      {expenseScopeOpen && (
        <EditScopeDialog
          onConfirm={applyExpenseScope}
          onCancel={() => {
            setExpenseScopeOpen(false)
            setPendingExpense(null)
          }}
        />
      )}
    </section>
  )
}
