// Tipos de cuenta disponibles. "loan" existe en la app de referencia pero no se
// crea desde la UI; aquí solo exponemos ahorros (normal) y tarjeta de crédito (TC).
export const ACCOUNT_TYPES = [
  { value: 'normal', label: 'Ahorros' },
  { value: 'TC', label: 'Tarjeta de crédito' },
]

// Etiqueta legible de un tipo de cuenta.
export function accountTypeLabel(type) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label || 'Cuenta'
}

// Opciones para ordenar la lista de cuentas.
export const ACCOUNTS_ORDER_BY = [
  { value: 'name', label: 'Nombre' },
  { value: 'type', label: 'Tipo' },
]

// Opciones de agrupación de movimientos dentro del detalle.
export const EXPENSE_GROUP_BY = [
  { value: 'category', label: 'Categoría' },
  { value: 'type', label: 'Tipo' },
  { value: 'date', label: 'Fecha' },
  { value: 'none', label: 'Sin agrupar' },
]

// Opciones de orden de los movimientos.
export const EXPENSE_ORDER_BY = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'highest', label: 'Mayor valor' },
  { value: 'lowest', label: 'Menor valor' },
]
