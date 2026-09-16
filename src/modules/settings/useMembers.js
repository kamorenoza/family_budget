import { useEffect, useState } from 'react'
import { MEMBER_COLORS } from './settings.constants'
import { hiResPhoto } from '../../shared/utils/avatar'
import { useFamily } from '../../shared/context/FamilyContext.jsx'
import {
  getUser,
  setUserPendingFamilyId,
  setUserFamilyId,
  setUserProfile,
} from '../../shared/services/usersService'
import { forkFamily, removeOwner } from '../../shared/services/familyService'
import { subscribeMembers, saveMembers } from './servicios/membersService'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// `currentUser` es el usuario logueado de Firebase.
export function useMembers(currentUser) {
  const { familyId } = useFamily()
  const [remote, setRemote] = useState([])
  const [profileByEmail, setProfileByEmail] = useState({})

  useEffect(() => {
    if (!familyId) {
      setRemote([])
      return
    }
    return subscribeMembers(familyId, (list) => setRemote(list))
  }, [familyId])

  // Perfil (nombre/color/foto) de cada miembro desde su doc de usuario.
  const memberEmails = remote.map((m) => m.email)
  const memberEmailsKey = memberEmails.join(',')
  useEffect(() => {
    let cancelled = false
    Promise.all(memberEmails.map((e) => getUser(e))).then((list) => {
      if (cancelled) return
      const map = {}
      list.forEach((u) => {
        if (u?.email) map[u.email] = { name: u.name, color: u.color, photoURL: u.photoURL }
      })
      setProfileByEmail(map)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberEmailsKey])

  const email = currentUser?.email?.toLowerCase() || ''

  // Yo mismo, aunque todavía no exista una familia.
  const selfMember = email
    ? {
        email,
        name: currentUser?.displayName || email.split('@')[0] || 'Tú',
        color: MEMBER_COLORS[0],
        role: 'admin',
        status: 'active',
      }
    : null

  // Si aún no hay familia, muéstrame solo a mí (sintético, sin persistir).
  const base = remote.length ? remote : selfMember ? [selfMember] : []

  const members = base
    .map((m, i) => {
      const profile = profileByEmail[m.email]
      return {
        ...m,
        id: m.email,
        self: m.email === email,
        name: profile?.name || m.name, // el perfil del usuario manda
        photo: hiResPhoto(m.email === email ? currentUser?.photoURL : profile?.photoURL),
        color: profile?.color || m.color || MEMBER_COLORS[i % MEMBER_COLORS.length],
      }
    })
    .sort((a, b) => (a.self === b.self ? 0 : a.self ? -1 : 1))

  // Devuelve un mensaje de error o null si la invitación se envió.
  const addMember = async (rawEmail) => {
    const value = rawEmail.trim().toLowerCase()
    if (!value) return 'Ingresa un correo.'
    if (!EMAIL_RE.test(value)) return 'El correo no es válido.'
    if (!email) return 'Espera un momento e intenta de nuevo.'
    if (value === email || remote.some((m) => m.email.toLowerCase() === value))
      return 'Esa persona ya está agregada.'
    const invited = await getUser(value)
    if (!invited) return 'Ese correo no está registrado.'
    if (!familyId) return 'Espera un momento e intenta de nuevo.'

    // Se une a MI familia; mi data es la que persiste.
    const current = remote.length ? remote : [selfMember]
    await saveMembers(familyId, [
      ...current,
      {
        email: value,
        name: invited.name || value.split('@')[0],
        color: invited.color || MEMBER_COLORS[1],
        role: 'admin',
        status: 'pending',
      },
    ])
    await setUserPendingFamilyId(value, familyId) // el invitado la verá al entrar
    return null
  }

  // Mi nombre/color se guardan en mi perfil (persiste aunque cambie de familia).
  const updateMember = (id, patch) => {
    if (id === email) {
      setUserProfile(email, patch)
      // Refleja el cambio al instante (el caché de perfiles no se re-suscribe).
      setProfileByEmail((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
    }
    if (!familyId) return
    const exists = remote.some((m) => m.email === id)
    const next = exists
      ? remote.map((m) => (m.email === id ? { ...m, ...patch } : m))
      : [...remote, { email: id, role: 'admin', status: 'active', ...patch }]
    saveMembers(familyId, next)
  }

  // Desvincula a la otra persona de forma justa: cada quien conserva su copia.
  const removeMember = async (id) => {
    if (!familyId) return
    const target = remote.find((m) => m.email === id)
    const rest = remote.filter((m) => m.email !== id)

    // Invitación no aceptada: solo se cancela, no hay nada que copiar.
    if (target?.status === 'pending') {
      await saveMembers(familyId, rest)
      await removeOwner(familyId, id)
      await setUserPendingFamilyId(id, null)
      return
    }

    // Miembro activo: se duplica el presupuesto para el otro y yo me quedo el original.
    const copyId = await forkFamily(familyId, id)
    await setUserFamilyId(id, copyId)
    await setUserPendingFamilyId(id, null)
    await saveMembers(familyId, rest)
    await removeOwner(familyId, id)
  }

  return { members, addMember, updateMember, removeMember }
}
