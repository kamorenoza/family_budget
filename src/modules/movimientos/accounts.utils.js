// Helpers puros para las cuentas.

// Suma con signo: ingreso suma, gasto resta.
function signedTotal(expenses, { onlyCompleted = false } = {}) {
  return (expenses || []).reduce((sum, e) => {
    if (onlyCompleted && e.isPending) return sum
    const value = Number(e.value) || 0
    return sum + (e.type === 'ingreso' ? value : -value)
  }, 0)
}

// Saldo de una cuenta de ahorros: solo movimientos NO pendientes.
export function savingsBalance(account) {
  return signedTotal(account.expenses, { onlyCompleted: true })
}

// Saldo real (incluye pendientes).
export function savingsRealBalance(account) {
  return signedTotal(account.expenses)
}

// Deuda de una tarjeta de crédito (valor absoluto del total con signo).
export function creditUsed(account) {
  return Math.abs(signedTotal(account.expenses))
}

// Cupo libre = límite + total con signo (los gastos reducen el disponible).
export function creditFree(account) {
  return (Number(account.creditLimit) || 0) + signedTotal(account.expenses)
}

// ===== Deuda tipo crédito =====

// Genera cuotas desde los campos base (cuentas sin arreglo `installments`).
function buildInstallments(account) {
  const count = Number(account.installmentsCount) || 0
  const value = Number(account.installmentValue) || 0
  const paidSet = new Set(
    (account.expenses || [])
      .filter((e) => e.installmentIndex != null)
      .map((e) => Number(e.installmentIndex)),
  )
  const parts = String(account.firstDueDate || '').slice(0, 10).split('-').map(Number)
  const start = parts.length === 3 && parts[0] ? new Date(parts[0], parts[1] - 1, parts[2]) : null
  const rows = []
  for (let i = 0; i < count; i += 1) {
    let date = ''
    if (start && !Number.isNaN(start.getTime())) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate())
      date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    rows.push({ id: `c${i + 1}`, index: i + 1, date, value, paid: paidSet.has(i + 1) })
  }
  return rows
}

// Cuotas de la cuenta: el arreglo persistido o el derivado de los campos base.
export function getInstallments(account) {
  if (Array.isArray(account.installments)) return account.installments
  return buildInstallments(account)
}

// Neto de movimientos extra (sin cuotas): gasto aumenta la deuda, ingreso la reduce.
function movementsNet(account) {
  return (account.expenses || [])
    .filter((e) => e.installmentIndex == null)
    .reduce((s, e) => s + (e.type === 'ingreso' ? -(Number(e.value) || 0) : (Number(e.value) || 0)), 0)
}

// Deuda base: cuotas => suma de cuotas; valor => valor único.
export function debtBase(account) {
  if (account.creditMode === 'cuotas') {
    return getInstallments(account).reduce((s, c) => s + (Number(c.value) || 0), 0)
  }
  return Number(account.debtValue) || 0
}

// Saldo pendiente de la deuda (lo que se debe).
export function debtBalance(account) {
  if (account.creditMode === 'cuotas') {
    const unpaid = getInstallments(account)
      .filter((c) => !c.paid)
      .reduce((s, c) => s + (Number(c.value) || 0), 0)
    return unpaid + movementsNet(account)
  }
  const net = (account.expenses || []).reduce((s, e) => {
    const v = Number(e.value) || 0
    return s + (e.type === 'ingreso' ? v : -v)
  }, 0)
  return (Number(account.debtValue) || 0) - net
}

// Cuotas pagadas / pendientes.
export function debtPaidInstallments(account) {
  return getInstallments(account).filter((c) => c.paid).length
}

export function debtPendingInstallments(account) {
  return getInstallments(account).filter((c) => !c.paid).length
}

// Calendario de cuotas (ordenado por índice).
export function installmentSchedule(account) {
  return [...getInstallments(account)].sort((a, b) => a.index - b.index)
}

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Histórico de los últimos 6 meses (incluye el actual) con ingresos y gastos.
export function last6MonthsHistory(account) {
  const now = new Date()
  const rows = []
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    rows.push({ key, label: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`, ingresos: 0, gastos: 0 })
  }
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
  ;(account.expenses || []).forEach((e) => {
    const iso = String(e.date || '').slice(0, 7)
    const row = byKey[iso]
    if (!row) return
    const value = Number(e.value) || 0
    if (e.type === 'ingreso') row.ingresos += value
    else row.gastos += value
  })
  return rows
}

// Fecha "D MMM YYYY" a partir de un ISO "YYYY-MM-DD".
export function expenseDateLabel(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  if (!y || !m) return ''
  return `${d || 1} ${MONTHS_SHORT[m - 1]} ${y}`
}

// Clave de mes "MMM YYYY" para agrupar por fecha.
export function monthGroupLabel(iso) {
  const [y, m] = String(iso || '').slice(0, 7).split('-').map(Number)
  if (!y || !m) return 'Sin fecha'
  return `${MONTHS_SHORT[m - 1]} ${y}`
}
