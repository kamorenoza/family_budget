import { useMemo, useState } from 'react'
import AccountCard from './AccountCard.jsx'
import AccountsFilter from './AccountsFilter.jsx'
import { accountTypeLabel } from '../accounts.constants'
import { useUserPrefs } from '../../../shared/hooks/useUserPrefs'
import { useFamilyPrefs } from '../../../shared/hooks/useFamilyPrefs'

export default function AccountsList({ accounts, scope, onScope, onOpen, onEdit, onDelete, onAdd }) {
  const [query, setQuery] = useState('')
  // Cuentas familiares: preferencia compartida. Personales: propia de cada usuario.
  const userPrefs = useUserPrefs()
  const familyPrefs = useFamilyPrefs()
  const { prefs, setPref } = scope === 'family' ? familyPrefs : userPrefs
  const typeFilter = prefs.accTypeFilter ?? 'all'
  const sortBy = prefs.accSortBy ?? 'name'
  const setTypeFilter = (v) => setPref('accTypeFilter', v)
  const setSortBy = (v) => setPref('accSortBy', v)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = accounts.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (q && !a.name.toLowerCase().includes(q)) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sortBy === 'type') {
        return accountTypeLabel(a.type).localeCompare(accountTypeLabel(b.type)) ||
          a.name.localeCompare(b.name)
      }
      return a.name.localeCompare(b.name)
    })
    return list
  }, [accounts, query, typeFilter, sortBy])

  return (
    <div className="acc-list">
      <div className="acc-list__head">
        <h1 className="acc-list__title">Mis cuentas</h1>
      </div>

      <div className="acc-list__toolbar">
        <div className="acc-scope">
          <button
            type="button"
            className={`acc-scope__tab${scope === 'personal' ? ' acc-scope__tab--on' : ''}`}
            onClick={() => onScope('personal')}
          >
            Personales
          </button>
          <button
            type="button"
            className={`acc-scope__tab${scope === 'family' ? ' acc-scope__tab--on' : ''}`}
            onClick={() => onScope('family')}
          >
            Familiares
          </button>
        </div>
        <div className="acc-list__actions">
          <AccountsFilter
            query={query}
            onQuery={setQuery}
            typeFilter={typeFilter}
            onType={setTypeFilter}
            sortBy={sortBy}
            onSort={setSortBy}
            onClear={() => {
              setTypeFilter('all')
              setSortBy('name')
            }}
          />
          <button type="button" className="acc-add" onClick={onAdd} aria-label="Agregar cuenta">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="acc-add__label">Agregar</span>
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="acc-list__empty">
          {accounts.length === 0 ? 'Aún no tienes cuentas' : 'No hay cuentas que coincidan.'}
        </p>
      ) : (
        <div className="acc-list__grid" key={scope}>
          {visible.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onOpen={() => onOpen(account)}
              showMenu={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}
