import { useState } from 'react'
import DrawerHeader from '../../../shared/components/SideDrawer/DrawerHeader.jsx'
import { confirm } from '../../../shared/components/ConfirmDialog/confirm.jsx'
import { MEMBER_COLORS } from '../settings.constants'
import './EditMemberDrawer.css'

export default function EditMemberDrawer({ member, onSave, onRemove, onChangeInvite, onClose }) {
  const [name, setName] = useState(member.name)
  const [color, setColor] = useState(member.color)
  const isPending = member.status === 'pending'
  const isSelf = member.self

  const submit = () => {
    onSave(member.id, { name: name.trim() || member.name, color })
    onClose()
  }

  const unlink = async () => {
    const ok = await confirm({
      title: 'Desvincular persona',
      message:
        'Al desvincularte, cada uno conservará su propia copia del presupuesto tal como está hoy. Después, los cambios de cada quien serán independientes.',
      confirmText: 'Desvincular',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    await onRemove(member.id)
    onClose()
  }

  const cancelInvite = async () => {
    const ok = await confirm({
      title: 'Cancelar invitación',
      message: `Se cancelará la invitación enviada a ${member.email}.`,
      confirmText: 'Cancelar invitación',
      cancelText: 'Volver',
    })
    if (!ok) return
    await onRemove(member.id)
    onClose()
  }

  // Cancela la invitación actual y abre el formulario para enviar a otro correo.
  const changeInvite = async () => {
    await onRemove(member.id)
    onClose()
    onChangeInvite?.()
  }

  const initial = (name || member.name || '?').charAt(0).toUpperCase()

  return (
    <div className="edit-member">
      <DrawerHeader title={isSelf ? 'Editar mi perfil' : 'Editar persona'} onClose={onClose} />

      <div className="edit-member__body">
        <div className="edit-member__preview">
          <span className="edit-member__avatar" style={{ background: color }}>
            {member.photo ? (
              <img
                className="edit-member__avatar-img"
                src={member.photo}
                alt={name}
                referrerPolicy="no-referrer"
              />
            ) : (
              initial
            )}
          </span>
        </div>

        {isSelf ? (
          <>
            <label className="edit-member__label" htmlFor="member-name">
              Nombre
            </label>
            <input
              id="member-name"
              type="text"
              className="edit-member__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <span className="edit-member__label">Color</span>
            <div className="edit-member__colors">
              {MEMBER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`edit-member__color ${c === color ? 'edit-member__color--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>

            <button type="button" className="btn btn--primary edit-member__submit" onClick={submit}>
              Guardar
            </button>
          </>
        ) : (
          <>
            <p className="edit-member__readonly-name">{member.name}</p>
            <p className="edit-member__readonly-email">{member.email}</p>

            {onRemove &&
              (isPending ? (
                <>
                  <button type="button" className="edit-member__change" onClick={changeInvite}>
                    Cambiar correo
                  </button>
                  <button type="button" className="edit-member__unlink" onClick={cancelInvite}>
                    Cancelar invitación
                  </button>
                </>
              ) : (
                <button type="button" className="edit-member__unlink" onClick={unlink}>
                  Desvincular
                </button>
              ))}
          </>
        )}
      </div>
    </div>
  )
}
