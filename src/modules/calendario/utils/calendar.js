export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export const WEEKDAYS_FULL = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
]

// Índice de día de la semana (0 = lunes … 6 = domingo).
export function weekdayIndexOf(year, month, day) {
  return (new Date(year, month, day).getDay() + 6) % 7
}

// Número de días del mes.
export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

// Celdas del mes con relleno inicial (lunes primero). null = celda vacía.
export function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export function getISOWeek(year, month, day) {
  const date = new Date(Date.UTC(year, month, day))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = date.getTime()
  date.setUTCMonth(0, 4)
  const jan4DayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - jan4DayNum + 3)
  return 1 + Math.round((firstThursday - date.getTime()) / 604800000)
}

// Agrupa las celdas del mes en semanas de 7, con su número ISO.
export function getMonthWeeks(year, month) {
  const cells = getMonthDays(year, month)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) {
    const days = cells.slice(i, i + 7)
    const firstDay = days.find((d) => d !== null)
    weeks.push({ weekNumber: getISOWeek(year, month, firstDay), days })
  }
  return weeks
}
