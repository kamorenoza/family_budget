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
      // Marca de tiempo de creación para ordenar por fecha (desempata mismo día).
      base.createdAt = Date.now()
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

  // Fijo: ajusta valor/nombre solo en el mes indicado, sin tocar los demás meses.
  const overrideIncomeMonth = useCallback((income, monthKey, patch) => {
    const monthOverrides = { ...(income.monthOverrides || {}) }
    monthOverrides[monthKey] = { ...(monthOverrides[monthKey] || {}), ...patch }
    updateIncomeDoc(income.id, { monthOverrides })
  }, [])

  // Fijo: corta el actual en el mes previo y crea uno nuevo desde monthKey con los datos nuevos.
  const splitIncomeFrom = useCallback(
    (income, monthKey, data) => {
      if (!familyId) return
      // El fijo original conserva solo lo anterior al corte: sus ajustes "solo este mes"
      // de meses previos se mantienen y se limpian los de monthKey en adelante (se sobreescriben).
      updateIncomeDoc(income.id, {
        endMonth: prevMonthKey(monthKey),
        monthOverrides: monthsBefore(income.monthOverrides, monthKey),
        receivedMonths: monthsBefore(income.receivedMonths, monthKey),
      })
      const { received, monthKey: _mk, repeatMonths, ...base } = data
      const doc = { ...base, fixed: true, startMonth: monthKey, receivedMonths: {}, createdAt: Date.now() }
      if (income.endMonth && income.endMonth >= monthKey) doc.endMonth = income.endMonth
      else {
        const end = endMonthFor(monthKey, repeatMonths)
        if (end) doc.endMonth = end
      }
      addIncomeDoc(familyId, doc)
    },
    [familyId],
  )

  return {
    incomes,
    addIncome,
    updateIncome,
    toggleReceived,
    deleteIncome,
    removeFixedMonth,
    endFixedFrom,
    overrideIncomeMonth,
    splitIncomeFrom,
  }
}

// Filtra un mapa {YYYY-MM: ...} dejando solo las claves anteriores a monthKey.
function monthsBefore(map, monthKey) {
  const out = {}
  for (const k of Object.keys(map || {})) if (k < monthKey) out[k] = map[k]
  return out
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
