import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import {
  updateMemberStatus,
  removeMemberFromFamily,
  addOwner,
  createFamily,
  getFamily,
} from '../services/familyService'
import {
  registerUser,
  setUserFamilyId,
  clearUserPending,
  subscribeUser,
} from '../services/usersService'

const FamilyContext = createContext({ familyId: null, pendingFamilyId: null, loading: true })

export function FamilyProvider({ children }) {
  const { user } = useAuth()
  const [familyId, setFamilyId] = useState(null)
  const [pendingFamilyId, setPendingFamilyId] = useState(null)
  const [pendingInviter, setPendingInviter] = useState(null)
  const [loading, setLoading] = useState(true)
  const creatingRef = useRef(false)
  const email = user?.email?.toLowerCase() || ''

  useEffect(() => {
    if (!email) {
      setFamilyId(null)
      setPendingFamilyId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    creatingRef.current = false
    registerUser(user)
    // Escucha reactiva del propio doc: familyId y pendingFamilyId.
    return subscribeUser(email, async (data) => {
      setPendingFamilyId(data?.pendingFamilyId || null)
      if (data?.familyId) {
        setFamilyId(data.familyId)
        setLoading(false)
        return
      }
      // Todo usuario tiene su propia familia (id + él como miembro).
      if (creatingRef.current) return
      creatingRef.current = true
      const selfMember = {
        email,
        name: user.displayName || email.split('@')[0],
        role: 'admin',
        status: 'active',
      }
      const newId = await createFamily(email, [selfMember])
      await setUserFamilyId(email, newId) // el snapshot volverá con el familyId
    })
  }, [user, email])

  // Nombre de quien invita: su data es la que persiste al aceptar.
  useEffect(() => {
    if (!pendingFamilyId) {
      setPendingInviter(null)
      return
    }
    let cancelled = false
    getFamily(pendingFamilyId).then((fam) => {
      if (cancelled || !fam) return
      const inviter = (fam.members || []).find((m) => m.status === 'active' && m.email !== email)
      setPendingInviter(inviter ? { name: inviter.name, email: inviter.email } : null)
    })
    return () => {
      cancelled = true
    }
  }, [pendingFamilyId, email])

  // Acepta la invitación: me uno a la familia, quedo activo y co-propietario.
  const acceptInvitation = async () => {
    if (!email || !pendingFamilyId) return
    await updateMemberStatus(pendingFamilyId, email, 'active')
    await addOwner(pendingFamilyId, email)
    await setUserFamilyId(email, pendingFamilyId)
    await clearUserPending(email)
  }

  // Rechaza la invitación: me quitan de la familia.
  const declineInvitation = async () => {
    if (!email || !pendingFamilyId) return
    await removeMemberFromFamily(pendingFamilyId, email)
    await clearUserPending(email)
  }

  return (
    <FamilyContext.Provider
      value={{
        familyId,
        pendingFamilyId,
        pendingInviter,
        loading,
        acceptInvitation,
        declineInvitation,
      }}
    >
      {children}
    </FamilyContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useFamily = () => useContext(FamilyContext)
