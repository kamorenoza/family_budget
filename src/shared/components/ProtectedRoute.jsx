import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Loader from './Loader/Loader.jsx'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loader message="Cargando tu sesión…" />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
