import { useMemo, useState } from 'react'
import AccountCard from './AccountCard.jsx'
import AccountsFilter from './AccountsFilter.jsx'
import { accountTypeLabel } from '../accounts.constants'
import { useUserPrefs } from '../../../shared/hooks/useUserPrefs'
import { useFamilyPrefs } from '../../../shared/hooks/useFamilyPrefs'
import { useDragOrder } from '../../../shared/hooks/useDragOrder'

export default function AccountsList({ accounts, scope, onScope, onOpen, onEdit, onDelete, onAdd }) {
  const [query, setQuery] = useState('')
  const [reorderMode, setReorderMode] = useState(false)
  // Cuentas familiares: preferencia compartida. Personales: propia de cada usuario.
  const userPrefs = useUserPrefs()
  const familyPrefs = useFamilyPrefs()
  const { prefs, setPref } = scope === 'family' ? familyPrefs : userPrefs
  const typeFilter = prefs.accTypeFilter ?? 'all'
  const sortBy = prefs.accSortBy ?? 'name'
  const accOrder = prefs.accOrder || []
  const setTypeFilter = (v) => setPref('accTypeFilter', v)
  // Al cambiar el orden manual queda sin efecto para respetar el criterio elegido.
  const setSortBy = (v) => {
    setPref('accSortBy', v)
    setPref('accOrder', [])
    setReorderMode(false)
  }

  const orderKey = accOrder.join(',')
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = accounts.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (q && !a.name.toLowerCase().includes(q)) return false
      return true
    })
    const manual = orderKey ? orderKey.split(',') : []
    if (manual.length) {
      list = [...list].sort((a, b) => {
        const ia = manual.indexOf(a.id)
        const ib = manual.indexOf(b.id)
        const na = ia === -1 ? Infinity : ia
        const nb = ib === -1 ? Infinity : ib
        if (na !== nb) return na - nb
        return a.name.localeCompare(b.name)
      })
    } else {
      list = [...list].sort((a, b) => {
        if (sortBy === 'type') {
          return accountTypeLabel(a.type).localeCompare(accountTypeLabel(b.type)) ||
            a.name.localeCompare(b.name)
        }
        return a.name.localeCompare(b.name)
      })
    }
    return list
  }, [accounts, query, typeFilter, sortBy, orderKey])

  // Guarda el orden manual (los no visibles se conservan al final).
  const saveOrder = (ids) => {
    const prev = prefs.accOrder || []
    const seen = new Set(ids)
    setPref('accOrder', [...ids, ...prev.filter((id) => !seen.has(id))])
  }
  const { order: dragOrder, dragPropsFor } = useDragOrder(visible.map((a) => a.id), saveOrder)
  const byId = useMemo(() => new Map(visible.map((a) => [a.id, a])), [visible])
  const rendered = reorderMode ? dragOrder.map((id) => byId.get(id)).filter(Boolean) : visible
  const canReorder = visible.length > 1 && !query.trim()

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
            onQuery={(v) => {
              setQuery(v)
              if (v.trim()) setReorderMode(false)
            }}
            typeFilter={typeFilter}
            onType={setTypeFilter}
            sortBy={sortBy}
            onSort={setSortBy}
            onClear={() => {
              setTypeFilter('all')
              setSortBy('name')
            }}
          />
          {canReorder && (
            <button
              type="button"
              className={`acc-reorder${reorderMode ? ' acc-reorder--on' : ''}`}
              onClick={() => setReorderMode((v) => !v)}
              aria-label={reorderMode ? 'Listo' : 'Reordenar'}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                {reorderMode ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" />
                )}
              </svg>
            </button>
          )}
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
          {rendered.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onOpen={() => onOpen(account)}
              showMenu={false}
              dragMode={reorderMode}
              dragProps={reorderMode ? dragPropsFor(account.id) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
