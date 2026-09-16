import { useEffect } from 'react'
import './SideDrawer.css'

export default function SideDrawer({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={`side-drawer__overlay ${open ? 'side-drawer__overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`side-drawer ${open ? 'side-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="side-drawer__body">{open && children}</div>
      </aside>
    </>
  )
}
