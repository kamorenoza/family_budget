import { useEffect, useRef, useState } from 'react'
import './Presupuesto.css'
import SearchIcon from '../../../shared/components/icons/SearchIcon.jsx'
import FilterIcon from '../../../shared/components/icons/FilterIcon.jsx'
import MonthSelector from '../../../shared/components/MonthSelector/MonthSelector.jsx'
import SideDrawer from '../../../shared/components/SideDrawer/SideDrawer.jsx'
import IncomeDrawer from '../components/IncomeDrawer.jsx'
import ExpenseDrawer from '../components/ExpenseDrawer.jsx'
import IncomeDeleteDialog from '../components/IncomeDeleteDialog.jsx'
import EditScopeDialog from '../components/EditScopeDialog.jsx'
import { confirm } from '../../../shared/components/ConfirmDialog/confirm.jsx'
import { useAuth } from '../../../shared/context/AuthContext.jsx'
import { useFamilyPrefs } from '../../../shared/hooks/useFamilyPrefs'
import { useDragOrder } from '../../../shared/hooks/useDragOrder'
import { useMembers } from '../../settings/useMembers'
import { useIncomes } from '../useIncomes'
import { useExpenses } from '../useExpenses'
import { useCategories } from '../../categories/useCategories'
import { ExpenseItem, BolsilloAccordion, CategoryAccordion, IncomeItem } from '../components/TxItems.jsx'
import { formatCurrency, dayOfDate, fullDateLabel, monthKeyOf, applyMonthOverride } from '../presupuesto.utils'
import { loadPeriod, savePeriod } from '../../../shared/utils/period'
import UserIcon from '../../../shared/components/icons/UserIcon.jsx'

export default function Presupuesto() {
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
  // Preferencias de orden compartidas por la familia (iguales para ambos miembros).
  const { prefs, setPref } = useFamilyPrefs()
  const expenseSort = prefs.budgetExpenseSort ?? 'fecha'
  const setExpenseSort = (v) => setPref('budgetExpenseSort', v)
  const groupBy = prefs.budgetGroupBy ?? 'none'
  const setGroupBy = (v) => setPref('budgetGroupBy', v)
  const [reorderMode, setReorderMode] = useState(false)
  const [expenseQuery, setExpenseQuery] = useState('')
  const filterRef = useRef(null)
  const [period, setPeriod] = useState(loadPeriod)

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
    .map((inc) => {
      const o = applyMonthOverride(inc, monthKey)
      return { ...o, isReceived: inc.fixed ? !!(inc.receivedMonths || {})[monthKey] : !!inc.received }
    })

  const memberOf = (email) => members.find((m) => m.email === email)
  const categoryOf = (id) => categories.find((c) => c.id === id)

  // Los movimientos personales descuentan del total pero no se listan en la vista familiar.
  const listIncomes = visibleIncomes.filter((i) => i.scope !== 'personal')
  // Los movimientos personales NO cuentan en los totales del presupuesto familiar.
  const familiarIncomes = listIncomes

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
    .map((exp) => {
      const o = applyMonthOverride(exp, monthKey)
      return { ...o, isPaid: exp.fixed ? !!(exp.paidMonths || {})[monthKey] : !!exp.paid }
    })

  const familiarExpenses = visibleExpenses.filter((e) => e.scope !== 'personal')

  // Ordena una lista de gastos según el criterio seleccionado (se reutiliza dentro de cada grupo).
  const sortExpensesBy = (arr) =>
    [...arr].sort((a, b) => {
      if (expenseSort === 'manual') {
        const ord = prefs.budgetExpenseOrder || []
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
  const sortedExpenses = sortExpensesBy(visibleExpenses.filter((e) => e.scope !== 'personal'))

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

  // Elementos de primer nivel (los gastos de un bolsillo se muestran dentro de su accordion).
  const topLevelExpenses = filteredExpenses.filter((e) => !(e.sourceType === 'bolsillo' && e.bolsilloId))
  const expenseById = new Map(topLevelExpenses.map((e) => [e.id, e]))

  // Guarda el orden manual (compartido con la familia) cuando se arrastra.
  const saveExpenseOrder = (visibleIds) => {
    const prev = prefs.budgetExpenseOrder || []
    const seen = new Set(visibleIds)
    setPref('budgetExpenseOrder', [...visibleIds, ...prev.filter((id) => !seen.has(id))])
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
  const catOrderPref = prefs.budgetCategoryOrder || []
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

  // En modo agrupado, categorías y bolsillos comparten un mismo orden para poder intercalarlos.
  const groupBlocks = [
    ...catIds.map((id) => ({ type: 'cat', key: `cat:${id}`, id })),
    ...groupBolsillos.map((tx) => ({ type: 'bol', key: `bol:${tx.id}`, tx })),
  ]
  const blockOrderPref = prefs.budgetGroupOrder || []
  const sortedBlocks = [...groupBlocks].sort((a, b) => {
    const ia = blockOrderPref.indexOf(a.key)
    const ib = blockOrderPref.indexOf(b.key)
    const na = ia === -1 ? Infinity : ia
    const nb = ib === -1 ? Infinity : ib
    if (na !== nb) return na - nb
    return 0
  })
  const saveBlockOrder = (keys) => {
    const prev = prefs.budgetGroupOrder || []
    const seen = new Set(keys)
    setPref('budgetGroupOrder', [...keys, ...prev.filter((k) => !seen.has(k))])
  }
  const { order: blockOrder, dragPropsFor: blockDragPropsFor } = useDragOrder(
    sortedBlocks.map((b) => b.key),
    saveBlockOrder,
    { attr: 'data-block-id' },
  )
  const blockByKey = new Map(groupBlocks.map((b) => [b.key, b]))
  const renderBlocks = reorderMode ? blockOrder.map((k) => blockByKey.get(k)).filter(Boolean) : sortedBlocks

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
      setPref('budgetExpenseOrder', [])
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
  const totalIngresos = familiarIncomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0)
  const totalGastos = familiarExpenses
    .filter((e) => e.sourceType !== 'bolsillo')
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  const disponible = totalIngresos - totalGastos

  // Disponible por persona = sus ingresos del mes - sus gastos del mes (sin los que salen de un bolsillo).
  const availableByEmail = members.reduce((acc, m) => {
    const inc = familiarIncomes
      .filter((i) => i.memberEmail === m.email)
      .reduce((s, i) => s + (Number(i.amount) || 0), 0)
    const exp = familiarExpenses
      .filter((e) => e.memberEmail === m.email && e.sourceType !== 'bolsillo')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
    acc[m.email] = inc - exp
    return acc
  }, {})

  // Comprometido por persona = sus gastos del mes (incluye la meta de sus bolsillos), sin los que salen de un bolsillo.
  const committedByEmail = members.reduce((acc, m) => {
    acc[m.email] = familiarExpenses
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
    const isBolsillo = exp.kind === 'bolsillo'
    const children = isBolsillo
      ? expenses.filter((e) => e.sourceType === 'bolsillo' && e.bolsilloId === exp.id)
      : []
    const ok = await confirm({
      title: isBolsillo ? '¿Eliminar bolsillo?' : '¿Eliminar gasto?',
      message: isBolsillo
        ? `Se eliminará "${exp.description}"${children.length ? ` y sus ${children.length} gasto(s) asociados` : ''}. Esta acción no se puede deshacer.`
        : `Se eliminará "${exp.description}". Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    children.forEach((c) => deleteExpense(c))
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
      <MonthSelector initialMonth={period.month} initialYear={period.year} onChange={(month, year) => { setPeriod({ month, year }); savePeriod({ month, year }) }} />
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
          <SearchIcon size={16} />
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
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="tx-section__add-label">Agregar ingreso</span>
            </button>
          </div>
          <div className="tx-list tx-list--income">
            {listIncomes.length === 0 ? (
              <p className="tx-empty">Sin ingresos este mes</p>
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
                  <FilterIcon size={18} />
                  <span className="tx-filter__btn-label">Ordenar</span>
                </button>
                {filterOpen && (
                  <div className="tx-filter__menu">
                    <div className="tx-filter__search">
                      <SearchIcon size={16} />
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
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
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
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="tx-section__add-label">Agregar gasto</span>
              </button>
            </div>
          </div>
          <div className="tx-list">
            {sortedExpenses.length === 0 ? (
              <p className="tx-empty">Sin gastos este mes</p>
            ) : topLevelExpenses.length === 0 ? (
              <p className="tx-empty">Sin resultados para “{expenseQuery}”.</p>
            ) : groupMode ? (
              <>
                {renderBlocks.map((block) =>
                  block.type === 'cat' ? (
                    <CategoryAccordion
                      key={block.key}
                      category={block.id === 'sin' ? null : categoryOf(block.id)}
                      expenses={orderItems(byCat.get(block.id) || [])}
                      onToggle={handleTogglePaid}
                      onEdit={openEditExpense}
                      dateLabelOf={(e) => fullDateLabel(dayOfDate(e.date), period.month, period.year)}
                      sourceOf={(e) => {
                        const mm = memberOf(e.memberEmail)
                        return mm
                          ? { name: mm.name.split(' ')[0], color: mm.color || 'var(--color-primary)', photo: mm.photo }
                          : null
                      }}
                      dragMode={reorderMode}
                      dragProps={reorderMode ? blockDragPropsFor(block.key) : null}
                      itemDragMode={reorderMode}
                      itemDragPropsFor={dragPropsFor}
                      ownerAvatar
                    />
                  ) : (
                    <BolsilloAccordion
                      key={block.key}
                      tx={block.tx}
                      used={usedByBolsillo[block.tx.id] || 0}
                      childExpenses={visibleExpenses.filter(
                        (e) => e.sourceType === 'bolsillo' && e.bolsilloId === block.tx.id,
                      )}
                      categoryOf={categoryOf}
                      source={(() => {
                        const bm = memberOf(block.tx.memberEmail)
                        return bm
                          ? { name: bm.name.split(' ')[0], color: bm.color || 'var(--color-primary)' }
                          : null
                      })()}
                      dateLabelOf={(c) => fullDateLabel(dayOfDate(c.date), period.month, period.year)}
                      onToggle={handleTogglePaid}
                      onEdit={openEditExpense}
                      dragMode={reorderMode}
                      dragProps={reorderMode ? blockDragPropsFor(block.key) : null}
                    />
                  ),
                )}
              </>
            ) : (
              renderExpenses.map((tx) => {
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
                      dragMode={reorderMode}
                      dragProps={reorderMode ? dragPropsFor(tx.id) : null}
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
