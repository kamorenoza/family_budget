import { useCallback, useEffect, useState } from 'react'
import { useFamily } from '../../shared/context/FamilyContext.jsx'
import {
  subscribeIncomes,
  addIncome as addIncomeDoc,
  updateIncome as updateIncomeDoc,
  deleteIncome as deleteIncomeDoc,
} from './servicios/incomeService'

export function useIncomes() {
  const { familyId } = useFamily()
  const [incomes, setIncomes] = useState([])

  useEffect(() => {
    if (!familyId) return
    return subscribeIncomes(familyId, setIncomes)
  }, [familyId])

  // `data` incluye description, amount, fixed, memberEmail, received y monthKey (mes actual).
  const addIncome = useCallback(
    (data) => {
      if (!familyId) return 'Espera un momento e intenta de nuevo.'
      const { received, monthKey, ...base } = data
      if (data.fixed) {
        // Fijo: se muestra desde `startMonth` y se marca recibido mes a mes.
        addIncomeDoc(familyId, {
          ...base,
          startMonth: monthKey,
          receivedMonths: received ? { [monthKey]: true } : {},
        })
      } else {
        // Variable: pertenece al mes elegido.
        addIncomeDoc(familyId, { ...base, monthKey, received: !!received })
      }
      return null
    },
    [familyId],
  )

  // Alterna el estado "recibido" para el mes indicado.
  const toggleReceived = useCallback((income, monthKey) => {
    if (income.fixed) {
      const months = { ...(income.receivedMonths || {}) }
      if (months[monthKey]) delete months[monthKey]
      else months[monthKey] = true
      updateIncomeDoc(income.id, { receivedMonths: months })
    } else {
      updateIncomeDoc(income.id, { received: !income.received })
    }
  }, [])

  // Edita los campos base y ajusta el modelo si cambia "fijo".
  const updateIncome = useCallback((income, data) => {
    const { received, monthKey, ...base } = data
    if (data.fixed) {
      const receivedMonths =
        income.receivedMonths || (income.received && income.monthKey ? { [income.monthKey]: true } : {})
      updateIncomeDoc(income.id, { ...base, startMonth: monthKey, receivedMonths })
    } else {
      const wasReceived = income.fixed ? !!(income.receivedMonths || {})[monthKey] : !!income.received
      updateIncomeDoc(income.id, { ...base, monthKey, received: wasReceived })
    }
    return null
  }, [])

  const deleteIncome = useCallback((income) => {
    deleteIncomeDoc(income.id)
  }, [])

  // Fijo: oculta solo el mes indicado.
  const removeFixedMonth = useCallback((income, monthKey) => {
    const excludedMonths = { ...(income.excludedMonths || {}), [monthKey]: true }
    updateIncomeDoc(income.id, { excludedMonths })
  }, [])

  // Fijo: deja de repetirse desde el mes indicado (inclusive).
  const endFixedFrom = useCallback((income, monthKey) => {
    updateIncomeDoc(income.id, { endMonth: prevMonthKey(monthKey) })
  }, [])

  return { incomes, addIncome, updateIncome, toggleReceived, deleteIncome, removeFixedMonth, endFixedFrom }
}

// Devuelve la clave YYYY-MM del mes anterior.
function prevMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
