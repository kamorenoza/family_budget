import { useCallback, useEffect, useState } from 'react'
import { useFamily } from '../../shared/context/FamilyContext.jsx'
import {
  subscribeExpenses,
  addExpense as addExpenseDoc,
  updateExpense as updateExpenseDoc,
  deleteExpense as deleteExpenseDoc,
} from './servicios/expenseService'

export function useExpenses() {
  const { familyId } = useFamily()
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    if (!familyId) return
    return subscribeExpenses(familyId, setExpenses)
  }, [familyId])

  // `data` incluye description, amount, categoryId, memberEmail, fixed, paid, monthKey y repeatMonths.
  const addExpense = useCallback(
    (data) => {
      if (!familyId) return 'Espera un momento e intenta de nuevo.'
      const { paid, monthKey, repeatMonths, ...base } = data
      // Marca de tiempo de creación para ordenar por fecha (desempata mismo día).
      base.createdAt = Date.now()
      if (data.fixed) {
        // Fijo: se muestra desde `startMonth`; si hay repetición, se corta en `endMonth`.
        const doc = { ...base, startMonth: monthKey, paidMonths: paid ? { [monthKey]: true } : {} }
        const end = endMonthFor(monthKey, repeatMonths)
        if (end) doc.endMonth = end
        addExpenseDoc(familyId, doc)
      } else {
        // Variable: pertenece al mes elegido.
        addExpenseDoc(familyId, { ...base, monthKey, paid: !!paid })
      }
      return null
    },
    [familyId],
  )

  // Edita los campos base y ajusta el modelo si cambia "fijo".
  const updateExpense = useCallback((expense, data) => {
    const { paid, monthKey, repeatMonths, ...base } = data
    if (data.fixed) {
      const paidMonths =
        expense.paidMonths || (expense.paid && expense.monthKey ? { [expense.monthKey]: true } : {})
      // "Todos": los datos nuevos aplican a todos los meses, se descartan los ajustes por mes.
      const doc = { ...base, startMonth: monthKey, paidMonths, monthOverrides: {} }
      const end = endMonthFor(monthKey, repeatMonths)
      doc.endMonth = end || null
      updateExpenseDoc(expense.id, doc)
    } else {
      const wasPaid = expense.fixed ? !!(expense.paidMonths || {})[monthKey] : !!expense.paid
      updateExpenseDoc(expense.id, { ...base, monthKey, paid: wasPaid })
    }
    return null
  }, [])

  // Alterna el estado "pagado" para el mes indicado.
  const togglePaid = useCallback((expense, monthKey) => {
    if (expense.fixed) {
      const months = { ...(expense.paidMonths || {}) }
      if (months[monthKey]) delete months[monthKey]
      else months[monthKey] = true
      updateExpenseDoc(expense.id, { paidMonths: months })
    } else {
      updateExpenseDoc(expense.id, { paid: !expense.paid })
    }
  }, [])

  const deleteExpense = useCallback((expense) => {
    deleteExpenseDoc(expense.id)
  }, [])

  // Fijo: oculta solo el mes indicado.
  const removeFixedMonth = useCallback((expense, monthKey) => {
    const excludedMonths = { ...(expense.excludedMonths || {}), [monthKey]: true }
    updateExpenseDoc(expense.id, { excludedMonths })
  }, [])

  // Fijo: deja de repetirse desde el mes indicado (inclusive).
  const endFixedFrom = useCallback((expense, monthKey) => {
    updateExpenseDoc(expense.id, { endMonth: prevMonthKey(monthKey) })
  }, [])

  // Fijo: ajusta valor/nombre solo en el mes indicado, sin tocar los demás meses.
  const overrideExpenseMonth = useCallback((expense, monthKey, patch) => {
    const monthOverrides = { ...(expense.monthOverrides || {}) }
    monthOverrides[monthKey] = { ...(monthOverrides[monthKey] || {}), ...patch }
    updateExpenseDoc(expense.id, { monthOverrides })
  }, [])

  // Fijo: corta el actual en el mes previo y crea uno nuevo desde monthKey con los datos nuevos.
  const splitExpenseFrom = useCallback(
    (expense, monthKey, data) => {
      if (!familyId) return
      updateExpenseDoc(expense.id, { endMonth: prevMonthKey(monthKey) })
      const { paid, monthKey: _mk, repeatMonths, ...base } = data
      const doc = { ...base, fixed: true, startMonth: monthKey, paidMonths: {}, createdAt: Date.now() }
      if (expense.endMonth && expense.endMonth >= monthKey) doc.endMonth = expense.endMonth
      else {
        const end = endMonthFor(monthKey, repeatMonths)
        if (end) doc.endMonth = end
      }
      addExpenseDoc(familyId, doc)
    },
    [familyId],
  )

  return {
    expenses,
    addExpense,
    updateExpense,
    togglePaid,
    deleteExpense,
    removeFixedMonth,
    endFixedFrom,
    overrideExpenseMonth,
    splitExpenseFrom,
  }
}

// Devuelve la clave YYYY-MM del mes anterior.
function prevMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Último mes (YYYY-MM) al repetir `count` meses desde `startKey`; null si no hay límite.
function endMonthFor(startKey, count) {
  const n = Number(count)
  if (!n || n < 1) return null
  const [y, m] = startKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() + (n - 1))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
