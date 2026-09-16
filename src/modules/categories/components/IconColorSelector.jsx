import { useEffect, useRef, useState } from 'react'
import { CategoryGlyph, categoryIconKeys, colorPalette } from '../categories.constants'
import './IconColorSelector.css'

export default function IconColorSelector({ icon, backgroundColor, onDone }) {
  const [open, setOpen] = useState(false)
  const [currentIcon, setCurrentIcon] = useState(icon || 'cat1')
  const [currentBg, setCurrentBg] = useState(backgroundColor || colorPalette[8])
  const rootRef = useRef(null)

  useEffect(() => {
    setCurrentIcon(icon || 'cat1')
    setCurrentBg(backgroundColor || colorPalette[8])
  }, [icon, backgroundColor])

  useEffect(() => {
    if (!open) return undefined
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const submit = () => {
    setOpen(false)
    onDone?.({ icon: currentIcon, backgroundColor: currentBg, iconColor: '#ffffff' })
  }

  return (
    <div className="icon-color" ref={rootRef}>
      <button
        type="button"
        className="icon-color__button"
        style={{ backgroundColor: currentBg }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Seleccionar icono y color"
      >
        <CategoryGlyph name={currentIcon} color="#ffffff" size={22} />
      </button>

      {open && (
        <div className="icon-color__popover">
          <p className="icon-color__title">Seleccione el icono</p>
          <div className="icon-color__grid">
            {categoryIconKeys.map((key) => (
              <button
                type="button"
                key={key}
                className={`icon-color__icon ${key === currentIcon ? 'icon-color__icon--active' : ''}`}
                onClick={() => setCurrentIcon(key)}
              >
                <CategoryGlyph name={key} color="#6b6b80" size={20} />
              </button>
            ))}
          </div>

          <p className="icon-color__title icon-color__title--spaced">Seleccione el color</p>
          <div className="icon-color__grid">
            {colorPalette.map((color) => (
              <button
                type="button"
                key={color}
                className={`icon-color__color ${color === currentBg ? 'icon-color__color--active' : ''}`}
                style={{ background: color }}
                onClick={() => setCurrentBg(color)}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>

          <div className="icon-color__actions">
            <button type="button" className="icon-color__btn" onClick={() => setOpen(false)}>
              Cerrar
            </button>
            <button type="button" className="icon-color__btn icon-color__btn--primary" onClick={submit}>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
