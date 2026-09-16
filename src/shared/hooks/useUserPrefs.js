import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { subscribeUser, setUserPrefs } from '../services/usersService'

// Preferencias personales del usuario (orden/agrupación) en Firebase; no se comparten con la familia.
export function useUserPrefs() {
  const { user } = useAuth()
  const email = user?.email
  const [prefs, setPrefs] = useState(null)

  useEffect(() => {
    if (!email) return undefined
    return subscribeUser(email, (data) => setPrefs(data?.prefs || {}))
  }, [email])

  const setPref = (key, value) => {
    if (!email) return
    setPrefs((p) => ({ ...(p || {}), [key]: value })) // optimista
    setUserPrefs(email, { [key]: value })
  }

  return { prefs: prefs || {}, setPref }
}
