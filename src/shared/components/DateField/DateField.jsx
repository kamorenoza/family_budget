import './DateField.css'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Muestra una fecha YYYY-MM-DD como "01 sep 2026".
function formatDate(value) {
  if (!value) return ''
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`
}

export default function DateField({ id, value, onChange, className = '' }) {
  // En desktop el picker no abre al tocar el cuerpo del input; lo forzamos.
  const openPicker = (e) => {
    try {
      e.currentTarget.showPicker()
    } catch {
      /* navegadores sin showPicker: el input abre solo */
    }
  }

  return (
    <div className={`date-field ${className}`.trim()}>
      <span className="date-field__value">{formatDate(value)}</span>
      <input
        id={id}
        type="date"
        className="date-field__native"
        value={value}
        onChange={onChange}
        onClick={openPicker}
        onFocus={openPicker}
      />
    </div>
  )
}
