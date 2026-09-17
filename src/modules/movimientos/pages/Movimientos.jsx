import { useEffect, useMemo, useRef, useState } from 'react'
import SideDrawer from '../../../shared/components/SideDrawer/SideDrawer.jsx'
import { confirm } from '../../../shared/components/ConfirmDialog/confirm.jsx'
import { useAccounts } from '../useAccounts'
import { useCategories } from '../../categories/useCategories'
import AccountsList from '../components/AccountsList.jsx'
import AccountDetail from '../components/AccountDetail.jsx'
import AccountDrawer from '../components/AccountDrawer.jsx'
import AccountExpenseDrawer from '../components/AccountExpenseDrawer.jsx'
import '../components/Movimientos.css'

export default function Movimientos() {
  const { accounts, myEmail, addAccount, updateAccount, deleteAccount, addExpense, updateExpense, deleteExpense } = useAccounts()
  const { categories } = useCategories()

  const [selectedId, setSelectedId] = useState(null)
  const [scope, setScope] = useState(() => localStorage.getItem('movimientosScope') || 'personal')
  const [accountDrawer, setAccountDrawer] = useState(null)
  const [editingAccount, setEditingAccount] = useState(null)
  const [expenseDrawer, setExpenseDrawer] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  const selected = useMemo(
    () => accounts.find((a) => a.id === selectedId) || null,
    [accounts, selectedId],
  )

  // Al cargar por primera vez elige la pestaña con cuentas: personales si tengo, si no familiares.
  // Si ya hay una pestaña guardada, se respeta y no se auto-elige.
  const pickedDefault = useRef(!!localStorage.getItem('movimientosScope'))
  useEffect(() => {
    if (pickedDefault.current || accounts.length === 0) return
    pickedDefault.current = true
    const hasPersonal = accounts.some((a) => a.scope === 'personal' && a.owner === myEmail)
    if (!hasPersonal && accounts.some((a) => a.scope !== 'personal')) setScope('family')
  }, [accounts, myEmail])

  // Recuerda la pestaña elegida.
  useEffect(() => {
    localStorage.setItem('movimientosScope', scope)
  }, [scope])

  // Personales: solo mías. Familiares (o cuentas antiguas sin scope): de todos.
  const visibleAccounts = useMemo(
    () =>
      accounts.filter((a) => {
        const isPersonal = a.scope === 'personal'
        return scope === 'personal' ? isPersonal && a.owner === myEmail : !isPersonal
      }),
    [accounts, scope, myEmail],
  )

  const openAddAccount = () => {
    setEditingAccount(null)
    setAccountDrawer(true)
  }
  const openEditAccount = (account) => {
    setEditingAccount(account)
    setAccountDrawer(true)
  }
  const closeAccountDrawer = () => {
    setAccountDrawer(null)
    setEditingAccount(null)
  }

  const submitAccount = (data) => {
    if (editingAccount) return updateAccount(editingAccount, data)
    return addAccount(data)
  }

  const removeAccount = async (account) => {
    if (!account) return
    const ok = await confirm({
      title: 'Eliminar cuenta',
      message: `¿Eliminar "${account.name}" y todos sus movimientos?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    deleteAccount(account)
    if (selectedId === account.id) setSelectedId(null)
    closeAccountDrawer()
  }

  const openAddExpense = () => {
    setEditingExpense(null)
    setExpenseDrawer(true)
  }
  const openEditExpense = (expense) => {
    setEditingExpense(expense)
    setExpenseDrawer(true)
  }
  const closeExpenseDrawer = () => {
    setExpenseDrawer(false)
    setEditingExpense(null)
  }

  const submitExpense = (data) => {
    if (!selected) return
    if (editingExpense) updateExpense(selected, { ...editingExpense, ...data })
    else addExpense(selected, data)
  }

  const removeExpense = async () => {
    if (!selected || !editingExpense) return
    const ok = await confirm({
      title: 'Eliminar movimiento',
      message: '¿Eliminar este movimiento?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    deleteExpense(selected, editingExpense.id)
    closeExpenseDrawer()
  }

  return (
    <section className="movimientos">
      {selected ? (
        <AccountDetail
          account={selected}
          onBack={() => setSelectedId(null)}
          onEdit={openEditAccount}
          onDelete={removeAccount}
          onAddExpense={openAddExpense}
          onEditExpense={openEditExpense}
        />
      ) : (
        <AccountsList
          accounts={visibleAccounts}
          scope={scope}
          onScope={setScope}
          onOpen={(a) => setSelectedId(a.id)}
          onEdit={openEditAccount}
          onDelete={removeAccount}
          onAdd={openAddAccount}
        />
      )}

      <SideDrawer open={!!accountDrawer} onClose={closeAccountDrawer} title="Cuenta">
        <AccountDrawer
          account={editingAccount}
          defaultScope={scope}
          onSubmit={submitAccount}
          onDelete={() => removeAccount(editingAccount)}
          onClose={closeAccountDrawer}
        />
      </SideDrawer>

      <SideDrawer open={expenseDrawer} onClose={closeExpenseDrawer} title="Movimiento">
        {selected && (
          <AccountExpenseDrawer
            account={selected}
            categories={categories}
            expense={editingExpense}
            onSubmit={submitExpense}
            onDelete={removeExpense}
            onClose={closeExpenseDrawer}
          />
        )}
      </SideDrawer>
    </section>
  )
}
