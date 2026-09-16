import { useEffect, useRef, useState } from 'react'
import './MonthSelector.css'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export default function MonthSelector({ onChange, initialMonth, initialYear }) {
  const now = new Date()
  const [month, setMonth] = useState(initialMonth ?? now.getMonth())
  const [year, setYear] = useState(initialYear ?? now.getFullYear())
  const [open, setOpen] = useState(false)
  const [panelYear, setPanelYear] = useState(initialYear ?? now.getFullYear())
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const toggle = () => {
    setPanelYear(year)
    setOpen((o) => !o)
  }

  // Avanza o retrocede un mes con las flechas (ajusta el año en los bordes).
  const stepMonth = (delta) => {
    let m = month + delta
    let y = year
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setMonth(m)
    setYear(y)
    setPanelYear(y)
    onChange?.(m, y)
  }

  const selectMonth = (m) => {
    setMonth(m)
    setYear(panelYear)
    setOpen(false)
    onChange?.(m, panelYear)
  }

  // Salta al mes actual del sistema.
  const goToCurrent = () => {
    const n = new Date()
    setMonth(n.getMonth())
    setYear(n.getFullYear())
    setPanelYear(n.getFullYear())
    setOpen(false)
    onChange?.(n.getMonth(), n.getFullYear())
  }

  return (
    <div className="month-selector" ref={rootRef}>
      <div className="month-selector__bar">
        <button className="month-selector__step" onClick={() => stepMonth(-1)} aria-label="Mes anterior">
          <ChevronLeft />
        </button>
        <button className="month-selector__trigger" onClick={toggle} aria-haspopup="true" aria-expanded={open}>
          <span className="month-selector__label">{MONTHS[month]} {year}</span>
        </button>
        <button className="month-selector__step" onClick={() => stepMonth(1)} aria-label="Mes siguiente">
          <ChevronRight />
        </button>
      </div>

      {open && (
        <div className="month-selector__panel" role="menu">
          <div className="month-selector__years">
            <button className="month-selector__nav" onClick={() => setPanelYear((y) => y - 1)} aria-label="Año anterior">
              <ChevronLeft />
            </button>
            <span className="month-selector__year">{panelYear}</span>
            <button className="month-selector__nav" onClick={() => setPanelYear((y) => y + 1)} aria-label="Año siguiente">
              <ChevronRight />
            </button>
          </div>
          <button className="month-selector__today" onClick={goToCurrent}>Mes actual</button>
          <div className="month-selector__grid">
            {MONTHS_SHORT.map((label, i) => {
              const isActive = i === month && panelYear === year
              return (
                <button
                  key={label}
                  className={`month-selector__month${isActive ? ' month-selector__month--active' : ''}`}
                  onClick={() => selectMonth(i)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
