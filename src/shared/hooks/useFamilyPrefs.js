import { useEffect, useState } from 'react'
import { useFamily } from '../context/FamilyContext.jsx'
import { subscribeFamily, setFamilyPrefs } from '../services/familyService'

// Preferencias compartidas por la familia (orden/agrupación de cuentas, presupuesto, etc.).
// A diferencia de useUserPrefs, se guardan en el documento de la familia y son
// iguales para todos sus miembros.
export function useFamilyPrefs() {
  const { familyId } = useFamily()
  const [prefs, setPrefs] = useState(null)

  useEffect(() => {
    if (!familyId) return undefined
    return subscribeFamily(familyId, (data) => setPrefs(data?.prefs || {}))
  }, [familyId])

  const setPref = (key, value) => {
    if (!familyId) return
    setPrefs((p) => ({ ...(p || {}), [key]: value })) // optimista
    setFamilyPrefs(familyId, { [key]: value })
  }

  return { prefs: prefs || {}, setPref }
}
