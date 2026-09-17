import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './shared/components/Layout/Layout.jsx'
import ProtectedRoute from './shared/components/ProtectedRoute.jsx'
import Login from './modules/auth/pages/Login.jsx'
import Calendario from './modules/calendario/pages/Calendario.jsx'
import Personal from './modules/personal/pages/Personal.jsx'
import Presupuesto from './modules/presupuesto/pages/Presupuesto.jsx'
import Movimientos from './modules/movimientos/pages/Movimientos.jsx'
import Compras from './modules/compras/pages/Compras.jsx'
import Configuracion from './modules/settings/pages/Configuracion.jsx'

const APP_ROUTES = ['/calendario', '/personal', '/presupuesto', '/movimientos', '/compras', '/configuracion']

// Redirige a la última página visitada (guardada en localStorage) o al presupuesto.
function RootRedirect() {
  const last = localStorage.getItem('lastRoute')
  const target = last && APP_ROUTES.includes(last) ? last : '/presupuesto'
  return <Navigate to={target} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RootRedirect />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="personal" element={<Personal />} />
        <Route path="presupuesto" element={<Presupuesto />} />
        <Route path="movimientos" element={<Movimientos />} />
        <Route path="compras" element={<Compras />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  )
}
