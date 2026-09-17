import { useEffect, useState } from 'react'
import './IncomeDeleteDialog.css'

const OPTIONS = [
  { value: 'month', label: 'Solo este mes' },
  { value: 'from', label: 'De este mes en adelante' },
  { value: 'all', label: 'Todos los meses' },
]

// Modal para elegir a qué meses aplica un cambio en un movimiento fijo.
export default function EditScopeDialog({ onConfirm, onCancel }) {
  const [scope, setScope] = useState('month')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="confirm-title">¿A qué meses aplica el cambio?</h2>

        <div className="income-del__options">
          {OPTIONS.map((opt) => (
            <label key={opt.value} className="income-del__option">
              <input
                type="radio"
                name="edit-scope"
                value={opt.value}
                checked={scope === opt.value}
                onChange={() => setScope(opt.value)}
              />
              <span className="income-del__radio" />
              <span className="income-del__label">{opt.label}</span>
            </label>
          ))}
        </div>

        <p className="confirm-message">Elige si el cambio afecta solo este mes, de aquí en adelante o todos los meses.</p>

        <div className="confirm-actions">
          <button type="button" className="btn-label" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn-label btn-label--confirm" onClick={() => onConfirm(scope)}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
