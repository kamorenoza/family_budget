import { useCallback, useEffect, useState } from 'react'
import { useFamily } from '../../shared/context/FamilyContext.jsx'
import { useAuth } from '../../shared/context/AuthContext.jsx'
import {
  subscribeAccounts,
  addAccount as addAccountDoc,
  updateAccount as updateAccountDoc,
  deleteAccount as deleteAccountDoc,
  saveAccountExpenses,
  saveAccountInstallments,
} from './servicios/accountsService'
import { getInstallments } from './accounts.utils'

// Genera un id local para los movimientos anidados.
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useAccounts() {
  const { familyId } = useFamily()
  const { user } = useAuth()
  const myEmail = user?.email?.toLowerCase() || ''
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    if (!familyId) return
    return subscribeAccounts(familyId, setAccounts)
  }, [familyId])

  // Crea una cuenta validando que el nombre no exista.
  const addAccount = useCallback(
    (data) => {
      if (!familyId) return 'Espera un momento e intenta de nuevo.'
      const exists = accounts.some(
        (a) => a.name.trim().toLowerCase() === data.name.trim().toLowerCase(),
      )
      if (exists) return 'La cuenta ya existe'
      const { id: _ignore, ...rest } = data
      const scope = rest.scope === 'family' ? 'family' : 'personal'
      addAccountDoc(familyId, { ...rest, scope, owner: scope === 'family' ? null : myEmail })
      return null
    },
    [familyId, accounts, myEmail],
  )

  // Actualiza una cuenta (valida nombre duplicado excluyéndose a sí misma).
  const updateAccount = useCallback(
    (account, data) => {
      const exists = accounts.some(
        (a) =>
          a.id !== account.id &&
          a.name.trim().toLowerCase() === data.name.trim().toLowerCase(),
      )
      if (exists) return 'La cuenta ya existe'
      const scope = data.scope === 'family' ? 'family' : 'personal'
      updateAccountDoc(account.id, { ...data, scope, owner: scope === 'family' ? null : (account.owner || myEmail) })
      return null
    },
    [accounts, myEmail],
  )

  const deleteAccount = useCallback((account) => {
    deleteAccountDoc(account.id)
  }, [])

  // Movimientos anidados: agrega/edita/elimina dentro de la cuenta.
  const addExpense = useCallback((account, expense) => {
    const list = [...(account.expenses || []), { id: generateId(), ...expense }]
    saveAccountExpenses(account.id, list)
  }, [])

  const updateExpense = useCallback((account, expense) => {
    const list = (account.expenses || []).map((e) => (e.id === expense.id ? { ...e, ...expense } : e))
    saveAccountExpenses(account.id, list)
  }, [])

  const deleteExpense = useCallback((account, expenseId) => {
    const list = (account.expenses || []).filter((e) => e.id !== expenseId)
    saveAccountExpenses(account.id, list)
  }, [])

  // Cuotas de crédito: marcar pagada, editar (monto/fecha) o eliminar del plan.
  const setCuotaPaid = useCallback((account, cuota, paid) => {
    const list = getInstallments(account).map((c) => (c.id === cuota.id ? { ...c, paid } : c))
    saveAccountInstallments(account.id, list)
  }, [])

  const updateCuota = useCallback((account, cuota, data) => {
    const list = getInstallments(account).map((c) => (c.id === cuota.id ? { ...c, ...data } : c))
    saveAccountInstallments(account.id, list)
  }, [])

  const deleteCuota = useCallback((account, cuotaId) => {
    const list = getInstallments(account).filter((c) => c.id !== cuotaId)
    saveAccountInstallments(account.id, list)
  }, [])

  return {
    accounts,
    myEmail,
    addAccount,
    updateAccount,
    deleteAccount,
    addExpense,
    updateExpense,
    deleteExpense,
    setCuotaPaid,
    updateCuota,
    deleteCuota,
  }
}
