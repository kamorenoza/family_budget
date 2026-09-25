// Helpers puros compartidos por las vistas de presupuesto y personal.

// Da formato de moneda a un número (es-CO usa puntos de miles).
export function formatCurrency(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`
}

// Convierte "YYYY-MM" en "Jun 2027".
export function monthKeyLabel(key) {
  if (!key) return ''
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const [y, m] = key.split('-').map(Number)
  return `${months[m - 1]} ${y}`
}

// Día guardado de una fecha "YYYY-MM-DD" (o 1 por defecto).
export function dayOfDate(dateStr, fallback = 1) {
  if (!dateStr) return fallback
  const d = Number(String(dateStr).split('-')[2])
  return d || fallback
}

// Fecha completa "D MMM YYYY" con el día guardado y el mes visible.
export function fullDateLabel(day, month0, year) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${day} ${months[month0]} ${year}`
}

// Clave de mes YYYY-MM.
export function monthKeyOf(month, year) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

// Aplica el ajuste de "solo este mes" (valor/nombre/origen) guardado en monthOverrides.
export function applyMonthOverride(item, monthKey) {
  const ov = item.monthOverrides && item.monthOverrides[monthKey]
  if (!ov) return item
  const next = { ...item }
  // Campos que pueden ajustarse solo para el mes indicado (valor, nombre y origen del movimiento).
  for (const key of ['amount', 'description', 'memberEmail', 'sourceType', 'bolsilloId', 'categoryId']) {
    if (key in ov) next[key] = ov[key]
  }
  return next
}

// ¿El movimiento fijo/variable está visible en el mes indicado?
export function isVisibleInMonth(item, monthKey) {
  if (item.fixed) {
    if (item.startMonth && monthKey < item.startMonth) return false
    if ((item.excludedMonths || {})[monthKey]) return false
    if (item.endMonth && monthKey > item.endMonth) return false
    return true
  }
  return item.monthKey === monthKey
}
