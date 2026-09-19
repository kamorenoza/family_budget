import { useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import DateField from '../../../shared/components/DateField/DateField.jsx'
import '../../presupuesto/components/IncomeDrawer.css'
import '../../presupuesto/components/ExpenseDrawer.css'

function formatThousands(raw) {
  const digits = String(raw).replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('es-CO') : ''
}

// Edita el monto y la fecha de una cuota, o la elimina del plan.
export default function CuotaDrawer({ cuota, onSubmit, onDelete, onClose }) {
  const [value, setValue] = useState(cuota ? formatThousands(cuota.value) : '')
  const [date, setDate] = useState(cuota?.date ? String(cuota.date).slice(0, 10) : '')
  const [error, setError] = useState('')

  const submit = () => {
    const amount = Number(String(value).replace(/\D/g, ''))
    if (!amount || amount <= 0) return setError('Escribe un valor válido.')
    onSubmit({ value: amount, date })
    onClose()
  }

  const canSave = Number(String(value).replace(/\D/g, '')) > 0

  return (
    <div className="income-drawer">
      <DrawerHeader title={`Cuota ${cuota?.index ?? ''}`} onClose={onClose} />

      <div className="income-drawer__body">
        <div className="income-field">
          <label className="income-field__label" htmlFor="cuota-value">Valor</label>
          <div className="income-field__prefixed">
            <span className="income-field__prefix">$</span>
            <input
              id="cuota-value"
              type="text"
              inputMode="numeric"
              className="income-field__input income-field__input--prefixed"
              placeholder="0"
              value={value}
              onChange={(e) => {
                setValue(formatThousands(e.target.value))
                setError('')
              }}
            />
          </div>
        </div>

        <div className="income-field">
          <label className="income-field__label" htmlFor="cuota-date">Fecha</label>
          <DateField id="cuota-date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {error && <p className="income-drawer__error">{error}</p>}

        <div className="income-drawer__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="income-drawer__submit" onClick={submit} disabled={!canSave}>
            Guardar
          </button>
        </div>

        <button type="button" className="income-drawer__delete" onClick={onDelete}>
          Eliminar
        </button>
      </div>
    </div>
  )
}
