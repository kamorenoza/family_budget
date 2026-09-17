import { NavLink, Outlet, useLocation } from 'react-router-dom'
import CalendarIcon from '../icons/CalendarIcon.jsx'
import UserIcon from '../icons/UserIcon.jsx'
import BudgetIcon from '../icons/BudgetIcon.jsx'
import ExpenseHandIcon from '../icons/ExpenseHandIcon.jsx'
import ShoppingIcon from '../icons/ShoppingIcon.jsx'
import TopActions from '../TopActions/TopActions.jsx'
import './Layout.css'

const COLOR_PRIMARY = '#2d7797'
const COLOR_GREY = '#9e9e9e'
// Color activo del menú inferior
const COLOR_MENU_ACTIVE = '#2d7797'

const navItems = [
  { to: '/calendario', label: 'Calendario', Icon: CalendarIcon },
  { to: '/personal', label: 'Personal', Icon: UserIcon, user: true },
  { to: '/presupuesto', label: 'Presupuesto', Icon: BudgetIcon },
  { to: '/movimientos', label: 'Cuentas', Icon: ExpenseHandIcon },
  { to: '/compras', label: 'Compras', Icon: ShoppingIcon },
]

export default function Layout() {
  const location = useLocation()
  const onConfig = location.pathname.startsWith('/configuracion')

  return (
    <div className={`app ${onConfig ? 'app--config' : ''}`}>
      {/* Acciones superiores (categorías + configuración) */}
      <TopActions activeSettings={onConfig} />

      {/* Menú lateral (desktop) — siempre colapsado con label bajo el icono */}
      <aside className="side-menu">
        <nav className="side-menu__list">
          {navItems.map(({ to, label, Icon, user }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'side-menu__item side-menu__item--active' : 'side-menu__item'
              }
              title={label}
            >
              {({ isActive }) => (
                <>
                  <span className={`side-menu__icon ${user ? 'side-menu__icon--user' : ''}`}>
                    <Icon color={isActive ? COLOR_PRIMARY : COLOR_GREY} />
                  </span>
                  <span className="side-menu__label">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="app__main">
        <Outlet />
      </main>

      {/* Menú inferior (mobile) */}
      <nav className="bottom-menu">
        <div className="bottom-menu__items">
          {navItems.map((item) => {
            const { to, label, Icon, user } = item
            if (to === '/presupuesto') {
              return (
                <div key={to} className="bottom-menu__fab-container">
                  <NavLink to={to} className="bottom-menu__fab" aria-label={label}>
                    <Icon color="#ffffff" />
                  </NavLink>
                  <span className="bottom-menu__fab-label">{label}</span>
                </div>
              )
            }
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? 'bottom-menu__btn bottom-menu__btn--active' : 'bottom-menu__btn'
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`bottom-menu__icon ${user ? 'bottom-menu__icon--user' : ''}`}>
                      <Icon color={isActive ? COLOR_MENU_ACTIVE : COLOR_GREY} />
                    </span>
                    <span className="bottom-menu__label">{label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
