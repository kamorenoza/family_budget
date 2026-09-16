import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithGoogle } from '../../../database/auth'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      setError('')
      await loginWithGoogle()
      navigate('/', { replace: true })
    } catch {
      setError('No se pudo iniciar sesión. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <h1 className="login__title">Presupuesto familiar</h1>
        <p className="login__subtitle">Iniciar sesión</p>
        <button type="button" className="login__google" onClick={handleLogin}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
          />
          Inicia con Google
        </button>
        {error && <p className="login__error">{error}</p>}
      </div>
    </div>
  )
}
