import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMembers } from '../useMembers'
import { useAuth } from '../../../shared/context/AuthContext.jsx'
import { useFamily } from '../../../shared/context/FamilyContext.jsx'
import { confirm } from '../../../shared/components/ConfirmDialog/confirm.jsx'
import { getFamily } from '../../../shared/services/familyService'
import {
  notificationsSupported,
  notificationPermission,
  enableNotifications,
  disableNotifications,
} from '../../../database/messaging'
import { downloadJson } from '../../../shared/utils/download'
import SideDrawer from '../../../shared/components/SideDrawer/SideDrawer.jsx'
import AddMemberDrawer from '../components/AddMemberDrawer.jsx'
import EditMemberDrawer from '../components/EditMemberDrawer.jsx'
import './Configuracion.css'

export default function Configuracion() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { pendingFamilyId, familyId, pendingInviter, acceptInvitation, declineInvitation } =
    useFamily()
  const { members, addMember, updateMember, removeMember } = useMembers(user)
  const [openAdd, setOpenAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [notif, setNotif] = useState({ supported: false, permission: 'default', on: false, busy: false })

  const inviterName = pendingInviter?.name || pendingInviter?.email || 'Alguien'

  // Refleja el soporte y permiso de notificaciones al abrir la pantalla.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const supported = await notificationsSupported()
      if (!alive) return
      const permission = notificationPermission()
      setNotif((s) => ({ ...s, supported, permission, on: permission === 'granted' }))
    })()
    return () => {
      alive = false
    }
  }, [])

  // Activa (pide permiso + registra token) o desactiva el recordatorio de pagos.
  const handleToggleNotif = async () => {
    if (notif.busy || !notif.supported) return
    setNotif((s) => ({ ...s, busy: true }))
    try {
      if (!notif.on) {
        const token = await enableNotifications(user?.email)
        setNotif((s) => ({ ...s, on: !!token, permission: notificationPermission(), busy: false }))
      } else {
        await disableNotifications(user?.email)
        setNotif((s) => ({ ...s, on: false, busy: false }))
      }
    } catch {
      setNotif((s) => ({ ...s, busy: false }))
    }
  }

  // Al aceptar, comparto el presupuesto de quien invita (su data persiste).
  const handleAccept = async () => {
    const ok = await confirm({
      title: `Unirte a ${inviterName}`,
      message: `Compartirás el presupuesto de ${inviterName}. A partir de ahora gestionarán juntos esa información.`,
      confirmText: 'Unirme',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    await acceptInvitation()
  }

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Cerrar sesión',
      message: '¿Seguro que quieres cerrar sesión?',
      confirmText: 'Cerrar sesión',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    await logout()
    navigate('/login')
  }

  // Descarga un respaldo del presupuesto (por si se pierde el acceso al correo).
  const handleExport = async () => {
    if (!familyId) return
    const data = await getFamily(familyId)
    downloadJson(`presupuesto-${new Date().toISOString().slice(0, 10)}.json`, data || {})
  }

  return (
    <section className="settings">
      <header className="settings__header">
        <button
          type="button"
          className="settings__back"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="settings__title">Configuración</h1>
      </header>

      <div className="settings__field">
        <span className="settings__label">Email</span>
        <p className="settings__email">{user?.email}</p>
      </div>

      {pendingFamilyId && (
        <div className="settings__invite">
          <p className="settings__invite-text">
            <strong>{inviterName}</strong> te invitó a compartir su presupuesto.
          </p>
          <div className="settings__invite-actions">
            <button type="button" className="btn btn--primary" onClick={handleAccept}>
              Aceptar
            </button>
            <button type="button" className="btn btn--ghost" onClick={declineInvitation}>
              Rechazar
            </button>
          </div>
        </div>
      )}

      <section className="settings__section">
        <h2 className="settings__section-title">Personas</h2>
        <div className="settings__members">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              className="member-row member-row--edit"
              onClick={() => setEditing(m)}
            >
              <span className="member-row__avatar" style={{ background: m.color }}>
                {m.photo ? (
                  <img
                    className="member-row__avatar-img"
                    src={m.photo}
                    alt={m.name}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  m.name.charAt(0).toUpperCase()
                )}
              </span>
              <div className="member-row__info">
                <p className="member-row__name">
                  {m.name}
                  {m.self && ' (Tú)'}
                </p>
                <div className="member-row__contact">
                  <p className="member-row__email">{m.email}</p>
                  <span className={`member-row__badge member-row__badge--${m.status}`}>
                    {m.status === 'pending' ? 'Invitación enviada' : 'Admin'}
                  </span>
                </div>
              </div>
            </button>
          ))}

          {members.length < 2 && (
            <button type="button" className="member-row member-row--add" onClick={() => setOpenAdd(true)}>
              <span className="member-row__avatar member-row__avatar--add">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <div className="member-row__info">
                <p className="member-row__name">Agregar persona</p>
              </div>
            </button>
          )}
        </div>
      </section>

      <section className="settings__section">
        <h2 className="settings__section-title">Notificaciones</h2>
        {notif.supported ? (
          <button
            type="button"
            className="settings__notif"
            role="switch"
            aria-checked={notif.on}
            onClick={handleToggleNotif}
            disabled={notif.busy}
          >
            <span className="settings__notif-info">
              <span className="settings__notif-title">Recordatorio de pagos</span>
              <span className="settings__notif-desc">
                Aviso diario (~8:00 a. m.) con los pagos que vencen ese día.
              </span>
            </span>
            <span
              className={`settings__notif-switch${notif.on ? ' settings__notif-switch--on' : ''}`}
            />
          </button>
        ) : (
          <p className="settings__notif-desc">
            Tu dispositivo o navegador no soporta notificaciones push.
          </p>
        )}
        {notif.permission === 'denied' && (
          <p className="settings__notif-hint">
            Bloqueaste las notificaciones. Actívalas en los ajustes del navegador para recibir
            recordatorios.
          </p>
        )}
      </section>

      {familyId && (
        <button type="button" className="settings__export" onClick={handleExport}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Exportar presupuesto
        </button>
      )}

      <button type="button" className="settings__logout" onClick={handleLogout}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        Cerrar sesión
      </button>

      <SideDrawer open={openAdd} onClose={() => setOpenAdd(false)} title="Agregar persona">
        <AddMemberDrawer onAdd={addMember} onClose={() => setOpenAdd(false)} />
      </SideDrawer>

      <SideDrawer open={!!editing} onClose={() => setEditing(null)} title="Editar persona">
        {editing && (
          <EditMemberDrawer
            member={editing}
            onSave={updateMember}
            onRemove={removeMember}
            onChangeInvite={() => setOpenAdd(true)}
            onClose={() => setEditing(null)}
          />
        )}
      </SideDrawer>
    </section>
  )
}
