import { subscribeFamily, updateFamily } from '../../../shared/services/familyService'

// Los miembros viven dentro del documento de la familia (campo `members`).
export function subscribeMembers(familyId, onChange) {
  return subscribeFamily(familyId, (data) => onChange(data?.members || []))
}

// Guarda la lista completa de miembros.
export function saveMembers(familyId, members) {
  return updateFamily(familyId, { members })
}
