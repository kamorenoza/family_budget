import { useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import './AddMemberDrawer.css'

export default function AddMemberDrawer({ onAdd, onClose }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    const err = await onAdd(email)
    if (err) {
      setError(err)
      setSent(false)
      return
    }
    setError('')
    setEmail('')
    onClose() // Cierra el drawer al enviar la invitación.
  }

  return (
    <div className="add-member">
      <DrawerHeader title="Agregar persona" onClose={onClose} />

      <div className="add-member__body">
        <label className="add-member__label" htmlFor="member-email">
          Correo de la persona
        </label>
        <input
          id="member-email"
          type="email"
          className="add-member__input"
          placeholder="correo@ejemplo.com"
          value={email}
          autoFocus
          onChange={(e) => {
            setEmail(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        {error && <p className="add-member__error">{error}</p>}

        <p className="add-member__hint">Ambos serán administradores por defecto.</p>

        <button type="button" className="btn btn--primary add-member__submit" onClick={submit}>
          Enviar invitación
        </button>
      </div>
    </div>
  )
}
