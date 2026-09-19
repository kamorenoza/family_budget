// Mes/año seleccionado compartido entre vistas (Presupuesto, Personal, Calendario).
const KEY = 'selectedPeriod'

export function loadPeriod() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (typeof p?.month === 'number' && typeof p?.year === 'number') return p
    }
  } catch {
    // Ignora datos corruptos y usa el mes actual.
  }
  const now = new Date()
  return { month: now.getMonth(), year: now.getFullYear() }
}

export function savePeriod(period) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ month: period.month, year: period.year }))
  } catch {
    // Si no hay almacenamiento disponible, simplemente no persiste.
  }
}
