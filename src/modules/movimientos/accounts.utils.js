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
