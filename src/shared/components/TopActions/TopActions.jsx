import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CategoriesIcon from '../icons/CategoriesIcon.jsx'
import SettingsIcon from '../icons/SettingsIcon.jsx'
import SideDrawer from '../SideDrawer/SideDrawer.jsx'
import CategoryDrawer from '../../../modules/categories/components/CategoryDrawer.jsx'
import './TopActions.css'

export default function TopActions({ activeSettings = false }) {
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(null)
  const close = () => setDrawer(null)

  return (
    <>
      <div className="top-actions">
        <button
          type="button"
          className="top-actions__btn top-actions__btn--categories"
          onClick={() => setDrawer('categories')}
          aria-label="Categorías"
        >
          <CategoriesIcon color="#8e7cc3" />
          <span className="top-actions__label">Categorías</span>
        </button>
        <button
          type="button"
          className={`top-actions__btn${activeSettings ? ' top-actions__btn--active' : ''}`}
          onClick={() => navigate('/configuracion')}
          aria-label="Configuración"
          aria-current={activeSettings ? 'page' : undefined}
        >
          <SettingsIcon color="#2d7797" />
        </button>
      </div>

      <SideDrawer open={drawer === 'categories'} onClose={close} title="Categorías">
        <CategoryDrawer onClose={close} />
      </SideDrawer>
    </>
  )
}
