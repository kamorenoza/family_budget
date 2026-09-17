import { useEffect, useRef, useState } from 'react'
import './Calendario.css'
import MonthSelector from '../../../shared/components/MonthSelector/MonthSelector.jsx'
import SideDrawer from '../../../shared/components/SideDrawer/SideDrawer.jsx'
import IncomeDrawer from '../../presupuesto/components/IncomeDrawer.jsx'
import ExpenseDrawer from '../../presupuesto/components/ExpenseDrawer.jsx'
import IncomeDeleteDialog from '../../presupuesto/components/IncomeDeleteDialog.jsx'
import EditScopeDialog from '../../presupuesto/components/EditScopeDialog.jsx'
import { confirm } from '../../../shared/components/ConfirmDialog/confirm.jsx'
import {
  MONTHS,
  WEEKDAYS,
  WEEKDAYS_FULL,
  getMonthDays,
  weekdayIndexOf,
  daysInMonth,
} from '../utils/calendar'
import { useAuth } from '../../../shared/context/AuthContext.jsx'
import { useMembers } from '../../settings/useMembers'
import { useIncomes } from '../../presupuesto/useIncomes'
import { useExpenses } from '../../presupuesto/useExpenses'
import { useCategories } from '../../categories/useCategories'
import { IncomeItem, ExpenseItem } from '../../presupuesto/components/TxItems.jsx'
import { dayOfDate, monthKeyOf, isVisibleInMonth, formatCurrency, applyMonthOverride } from '../../presupuesto/presupuesto.utils'

// Punticos indicadores bajo el número del día (verde = ingreso, color de categoría/bolsillo = gasto).
const INCOME_MARK = '#57bd85'
const MARK_SIZE = 5
const LINE_HEIGHT = 4

// Versión clarita del color para el fondo de la card.
function softBg(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, 0.18)`
}

function stripeGradient(colors) {
  const n = colors.length
  const stops = colors.map((c, i) => {
    const from = ((i / n) * 100).toFixed(2)
    const to = (((i + 1) / n) * 100).toFixed(2)
    return `${c} ${from}% ${to}%`
  })
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

// Detecta viewport móvil para alternar entre la rejilla completa y el mini calendario.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 959px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 959px)')
    const onChange = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

// Eventos (ingresos/gastos) dentro de una celda; muestra elipsis abajo si desbordan.
function DayEvents({ items, memberOf, expenseColor }) {
  const ref = useRef(null)
  const [overflow, setOverflow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflow(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [items])
  if (!items || items.length === 0) return null
  return (
    <div className={`cal__events${overflow ? ' cal__events--overflow' : ''}`} ref={ref}>
      {items.map(({ kind, tx }) => {
        const isIncome = kind === 'income'
        const m = memberOf(tx.memberEmail)
        const owner = m ? m.name.split(' ')[0] : 'Sin persona'
        return (
          <div
            key={`${kind}-${tx.id}`}
            className={`cal__event cal__event--${isIncome ? 'income' : 'expense'}`}
            style={{ background: softBg(isIncome ? INCOME_MARK : expenseColor(tx)) }}
          >
            <div className="cal__event-row">
              <span className="cal__event-title">{tx.description}</span>
              <span className="cal__event-value">{formatCurrency(tx.amount)}</span>
            </div>
            <span className="cal__event-owner">{owner}</span>
          </div>
        )
      })}
    </div>
  )
}

// Rejilla completa (iPad / desktop).
function MonthDesktop({ year, month, todayDay, itemsByDay, memberOf, expenseColor, onDayClick }) {
  const cells = getMonthDays(year, month)
  return (
    <div className="cal__calendar">
      <div className="cal__weekdays">
        {WEEKDAYS.map((wd, i) => (
          <span key={i} className="cal__weekday">{wd}</span>
        ))}
      </div>
      <div className="cal__days">
        {cells.map((day, i) => {
          const dayItems = day ? (itemsByDay[day] || []) : []
          const hasItems = dayItems.length > 0
          return (
            <div
              key={i}
              className={`cal__day${day ? '' : ' cal__day--empty'}${
                day && day === todayDay ? ' cal__day--today' : ''
              }${hasItems ? ' cal__day--clickable' : ''}`}
              onClick={hasItems ? () => onDayClick(day) : undefined}
            >
              {day && (
                <>
                  <span
                    className={`cal__day-number${
                      day === todayDay ? ' cal__day-number--today' : ''
                    }`}
                  >
                    {day}
                  </span>
                  <DayEvents items={itemsByDay[day]} memberOf={memberOf} expenseColor={expenseColor} />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Modal con todos los movimientos de un día (ingresos y gastos).
function DayExpensesModal({ year, month, day, items, memberOf, categoryOf, bolsilloById, onToggle, onEditIncome, onEditExpense, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="cal__modal-overlay" onClick={onClose}>
      <div className="cal__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="cal__modal-header">
          <span className="cal__modal-title">
            {WEEKDAYS_FULL[weekdayIndexOf(year, month, day)]} {day} de {MONTHS[month]}
          </span>
          <button type="button" className="cal__modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="tx-list">
          {items.map(({ kind, tx }) => {
            if (kind === 'income') {
              const m = memberOf(tx.memberEmail)
              return (
                <IncomeItem
                  key={`i-${tx.id}`}
                  tx={tx}
                  member={m}
                  memberName={m ? m.name.split(' ')[0] : 'Sin persona'}
                  memberColor={m?.color || 'var(--color-primary)'}
                  dateLabel=""
                  onEdit={onEditIncome}
                />
              )
            }
            const m = memberOf(tx.memberEmail)
            const source = m
              ? { name: m.name.split(' ')[0], color: m.color || 'var(--color-primary)' }
              : null
            const bolsilloTag =
              tx.sourceType === 'bolsillo' && tx.bolsilloId
                ? bolsilloById[tx.bolsilloId] || null
                : null
            return (
              <ExpenseItem
                key={`e-${tx.id}`}
                tx={tx}
                category={categoryOf(tx.categoryId)}
                source={source}
                dateLabel=""
                bolsilloTag={bolsilloTag}
                onToggle={onToggle}
                onEdit={onEditExpense}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Mini calendario + lista día a día (mobile). Al tocar un día se hace scroll a su tarjeta.
function MonthMobile({ year, month, todayDay, itemsByDay, marksByDay, memberOf, categoryOf, bolsilloById, onToggle, onEditIncome, onEditExpense }) {
  const cells = getMonthDays(year, month)
  const totalDays = daysInMonth(year, month)
  const dayRefs = useRef({})
  const dayStoreKey = `calDay:${year}-${month}`
  const [selectedDay, setSelectedDay] = useState(() => Number(localStorage.getItem(dayStoreKey)) || todayDay || 1)

  // Al cambiar de mes, resalta el día guardado (o el de hoy) y hace scroll a su tarjeta (sin animación).
  useEffect(() => {
    const saved = Number(localStorage.getItem(`calDay:${year}-${month}`))
    const target = saved || todayDay || 1
    setSelectedDay(target)
    requestAnimationFrame(() => {
      const node = dayRefs.current[target]
      if (node) node.scrollIntoView({ block: 'start' })
    })
  }, [year, month, todayDay])

  const selectDay = (day) => {
    setSelectedDay(day)
    localStorage.setItem(`calDay:${year}-${month}`, String(day))
    const node = dayRefs.current[day]
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="cal__mobile">
      <div className="cal__mobile-calendar">
        <div className="cal__mobile-weekdays">
          {WEEKDAYS.map((wd, i) => (
            <span key={i} className="cal__mobile-weekday">{wd}</span>
          ))}
        </div>
        <div className="cal__mobile-days">
          {cells.map((day, i) => {
            const marks = day ? (marksByDay[day] || []) : []
            return (
              <button
                key={i}
                type="button"
                className={`cal__mobile-day${day ? '' : ' cal__mobile-day--empty'}${
                  day && day === todayDay ? ' cal__mobile-day--today' : ''
                }${day && day === selectedDay ? ' cal__mobile-day--selected' : ''}`}
                onClick={() => day && selectDay(day)}
                disabled={!day}
              >
                <span className="cal__mobile-day-num">{day || ''}</span>
                {marks.length === 1 && (
                  <span
                    className="cal__mark"
                    style={{ background: marks[0], width: `${MARK_SIZE}px`, height: `${MARK_SIZE}px` }}
                  />
                )}
                {marks.length > 1 && (
                  <span
                    className="cal__mark cal__mark--line"
                    style={{
                      background: stripeGradient(marks),
                      width: `${marks.length * MARK_SIZE}px`,
                      height: `${LINE_HEIGHT}px`,
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="cal__list">
        {Array.from({ length: totalDays }, (_, idx) => {
          const day = idx + 1
          const items = itemsByDay[day] || []
          const isToday = day === todayDay
          return (
            <div
              key={day}
              ref={(node) => { dayRefs.current[day] = node }}
              className={`cal__day-card${isToday ? ' cal__day-card--today' : ''}${
                day === selectedDay ? ' cal__day-card--selected' : ''
              }`}
            >
              <div className="cal__day-card-header">
                <span className="cal__day-card-title">
                  {WEEKDAYS_FULL[weekdayIndexOf(year, month, day)]} {day} de {MONTHS[month]}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="cal__day-card-empty">Sin movimientos</p>
              ) : (
                <div className="tx-list">
                  {items.map(({ kind, tx }) => {
                    if (kind === 'income') {
                      const m = memberOf(tx.memberEmail)
                      return (
                        <IncomeItem
                          key={`i-${tx.id}`}
                          tx={tx}
                          member={m}
                          memberName={m ? m.name.split(' ')[0] : 'Sin persona'}
                          memberColor={m?.color || 'var(--color-primary)'}
                          dateLabel=""
                          onEdit={onEditIncome}
                        />
                      )
                    }
                    const m = memberOf(tx.memberEmail)
                    const source = m
                      ? { name: m.name.split(' ')[0], color: m.color || 'var(--color-primary)' }
                      : null
                    const bolsilloTag =
                      tx.sourceType === 'bolsillo' && tx.bolsilloId
                        ? bolsilloById[tx.bolsilloId] || null
                        : null
                    return (
                      <ExpenseItem
                        key={`e-${tx.id}`}
                        tx={tx}
                        category={categoryOf(tx.categoryId)}
                        source={source}
                        dateLabel=""
                        bolsilloTag={bolsilloTag}
                        onToggle={onToggle}
                        onEdit={onEditExpense}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Botón cuadrado de filtros: abre un menú para filtrar los movimientos por persona y estado.
function MemberFilter({ members, selected, status, onToggle, onStatus, onClear }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const anySelected = selected.length > 0 || status !== null

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="cal__filter" ref={ref}>
      <button
        type="button"
        className={`cal__filter-btn${anySelected ? ' cal__filter-btn--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Filtrar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span className="cal__filter-btn-label">Filtrar</span>
      </button>
      {open && (
        <div className="cal__filter-menu">
          <span className="cal__filter-title">Filtrar por:</span>
          <div className="cal__filter-people">
            {members.map((m) => {
              const on = selected.includes(m.email)
              const firstName = m.name.split(' ')[0]
              return (
                <button
                  key={m.email}
                  type="button"
                  className={`cal__filter-person${on ? ' cal__filter-person--on' : ''}${
                    anySelected && !on ? ' cal__filter-person--dim' : ''
                  }`}
                  onClick={() => { onToggle(m.email); setOpen(false) }}
                >
                  {m.photo ? (
                    <img className="cal__filter-avatar" src={m.photo} alt={firstName} referrerPolicy="no-referrer" />
                  ) : (
                    <span className="cal__filter-avatar" style={{ background: m.color || 'var(--color-primary)' }}>
                      {firstName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="cal__filter-name">{firstName}</span>
                </button>
              )
            })}
          </div>
          <span className="cal__filter-title">Estado:</span>
          <div className="cal__filter-status">
            {[
              { key: 'pendiente', label: 'Pendiente' },
              { key: 'pagado', label: 'Pagado' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`cal__filter-chip${status === opt.key ? ' cal__filter-chip--on' : ''}`}
                onClick={() => { onStatus(status === opt.key ? null : opt.key); setOpen(false) }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {anySelected && (
            <button type="button" className="cal__filter-clear" onClick={() => { onClear(); setOpen(false) }}>
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Calendario() {
  const now = new Date()
  const [period, setPeriod] = useState({ month: now.getMonth(), year: now.getFullYear() })
  const isMobile = useIsMobile()
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
  const [filterEmails, setFilterEmails] = useState([])
  const [statusFilter, setStatusFilter] = useState(null)
  const [modalDay, setModalDay] = useState(null)

  const toggleFilter = (email) =>
    setFilterEmails((prev) => (prev.includes(email) ? [] : [email]))
  const clearFilter = () => {
    setFilterEmails([])
    setStatusFilter(null)
  }
  const passesFilter = (email) => filterEmails.length === 0 || filterEmails.includes(email)
  const passesStatus = (paid) =>
    statusFilter === null || (statusFilter === 'pagado' ? paid : !paid)

  const todayDay =
    now.getFullYear() === period.year && now.getMonth() === period.month
      ? now.getDate()
      : null

  const monthKey = monthKeyOf(period.month, period.year)
  const myEmail = user?.email
  const memberOf = (email) => members.find((m) => m.email === email)
  const categoryOf = (id) => categories.find((c) => c.id === id)

  // Un movimiento personal solo lo ve el usuario logueado (su dueño).
  const canSeePersonal = (tx) => tx.scope !== 'personal' || tx.memberEmail === myEmail

  // Ingresos y gastos visibles del mes, con su estado recibido/pagado (igual que Presupuesto).
  const visibleIncomes = incomes
    .filter((inc) => isVisibleInMonth(inc, monthKey))
    .map((inc) => {
      const o = applyMonthOverride(inc, monthKey)
      return { ...o, isReceived: inc.fixed ? !!(inc.receivedMonths || {})[monthKey] : !!inc.received }
    })
  const visibleExpenses = expenses
    .filter((exp) => isVisibleInMonth(exp, monthKey))
    .map((exp) => {
      const o = applyMonthOverride(exp, monthKey)
      return { ...o, isPaid: exp.fixed ? !!(exp.paidMonths || {})[monthKey] : !!exp.paid }
    })

  // Agrupa por día (según la fecha guardada); ingresos primero, luego gastos.
  const itemsByDay = {}
  const addItem = (day, entry) => {
    if (!itemsByDay[day]) itemsByDay[day] = []
    itemsByDay[day].push(entry)
  }
  visibleIncomes
    .filter((tx) => canSeePersonal(tx) && passesFilter(tx.memberEmail) && passesStatus(tx.isReceived))
    .forEach((tx) => addItem(dayOfDate(tx.date), { kind: 'income', tx }))
  // Los gastos asociados a un bolsillo se muestran como un movimiento más;
  // se excluyen solo las metas de bolsillo (que no son un gasto con fecha).
  visibleExpenses
    .filter((tx) => tx.kind !== 'bolsillo' && canSeePersonal(tx) && passesFilter(tx.memberEmail) && passesStatus(tx.isPaid))
    .forEach((tx) => addItem(dayOfDate(tx.date), { kind: 'expense', tx }))

  // Bolsillos del mes y disponible por persona (para el drawer de gastos).
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

  // Nombre y color de cada bolsillo (para el tag del gasto y los punticos).
  const bolsilloById = bolsillos.reduce((acc, b) => {
    acc[b.id] = { name: b.description, color: b.color || '#2d7797' }
    return acc
  }, {})
  const expenseColor = (tx) => {
    if (tx.sourceType === 'bolsillo' && tx.bolsilloId && bolsilloById[tx.bolsilloId]) {
      return bolsilloById[tx.bolsilloId].color
    }
    return categoryOf(tx.categoryId)?.backgroundColor || '#c4c4cc'
  }
  // Colores indicadores por día (máx. 6: verde por ingreso, categoría/bolsillo por gasto).
  const marksByDay = {}
  Object.entries(itemsByDay).forEach(([day, entries]) => {
    marksByDay[day] = entries
      .slice(0, 6)
      .map(({ kind, tx }) => (kind === 'income' ? INCOME_MARK : expenseColor(tx)))
  })
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
      return null
    }
    return editingExpense ? updateExpense(editingExpense, data) : addExpense(data)
  }
  const applyExpenseScope = (scope) => {
    const p = pendingExpense
    if (!p) return
    if (scope === 'month')
      overrideExpenseMonth(p.item, monthKey, { amount: p.data.amount, description: p.data.description })
    else if (scope === 'from') splitExpenseFrom(p.item, monthKey, p.data)
    else updateExpense(p.item, p.data)
    setExpenseScopeOpen(false)
    setPendingExpense(null)
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
    <section className="cal">
      <header className="cal__header">
        <h1 className="cal__title">Calendario</h1>
        <div className="cal__controls">
          <MonthSelector onChange={(month, year) => setPeriod({ month, year })} />
          <MemberFilter
            members={members}
            selected={filterEmails}
            status={statusFilter}
            onToggle={toggleFilter}
            onStatus={setStatusFilter}
            onClear={clearFilter}
          />
        </div>
      </header>

      {isMobile ? (
        <MonthMobile
          year={period.year}
          month={period.month}
          todayDay={todayDay}
          itemsByDay={itemsByDay}
          marksByDay={marksByDay}
          memberOf={memberOf}
          categoryOf={categoryOf}
          bolsilloById={bolsilloById}
          onToggle={handleTogglePaid}
          onEditIncome={openEditIncome}
          onEditExpense={openEditExpense}
        />
      ) : (
        <MonthDesktop
          year={period.year}
          month={period.month}
          todayDay={todayDay}
          itemsByDay={itemsByDay}
          memberOf={memberOf}
          expenseColor={expenseColor}
          onDayClick={setModalDay}
        />
      )}

      {modalDay != null && (
        <DayExpensesModal
          year={period.year}
          month={period.month}
          day={modalDay}
          items={itemsByDay[modalDay] || []}
          memberOf={memberOf}
          categoryOf={categoryOf}
          bolsilloById={bolsilloById}
          onToggle={handleTogglePaid}
          onEditIncome={openEditIncome}
          onEditExpense={openEditExpense}
          onClose={() => setModalDay(null)}
        />
      )}

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
