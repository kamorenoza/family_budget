import './DrawerHeader.css'

export default function DrawerHeader({ title, onClose, children }) {
  return (
    <div className="drawer-header">
      <div className="drawer-header__left">
        <button type="button" className="drawer-header__back" onClick={onClose} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="drawer-header__title">{title}</h2>
      </div>
      {children && <div className="drawer-header__actions">{children}</div>}
    </div>
  )
}
