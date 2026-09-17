import { useEffect, useMemo, useRef, useState } from 'react'
import SideDrawer from '../../../shared/components/SideDrawer/SideDrawer.jsx'
import { confirm } from '../../../shared/components/ConfirmDialog/confirm.jsx'
import { useShopping } from '../useShopping'
import ShoppingListCard from '../components/ShoppingListCard.jsx'
import ShoppingListDrawer from '../components/ShoppingListDrawer.jsx'
import ShoppingDetail from '../components/ShoppingDetail.jsx'
import ShoppingItemDrawer from '../components/ShoppingItemDrawer.jsx'
import './Compras.css'

export default function Compras() {
  const { lists, myEmail, addList, updateList, deleteList, addItem, updateItem, deleteItem, toggleItem, reorderItems } = useShopping()

  const [scope, setScope] = useState(() => localStorage.getItem('comprasScope') || 'personal')
  const [selectedId, setSelectedId] = useState(null)
  const [listDrawer, setListDrawer] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [itemDrawer, setItemDrawer] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const selected = useMemo(() => lists.find((l) => l.id === selectedId) || null, [lists, selectedId])

  // Recuerda la pestaña elegida.
  useEffect(() => {
    localStorage.setItem('comprasScope', scope)
  }, [scope])

  // Personales: solo mías. Familiares (o listas antiguas sin scope): de todos.
  const visibleLists = useMemo(
    () =>
      lists.filter((l) => {
        const isPersonal = l.scope === 'personal'
        return scope === 'personal' ? isPersonal && l.owner === myEmail : !isPersonal
      }),
    [lists, scope, myEmail],
  )

  // Una lista está completada cuando tiene artículos y todos están marcados.
  const isListDone = (l) => {
    const items = l.items || []
    return items.length > 0 && items.every((i) => i.checked)
  }

  const activeLists = useMemo(() => visibleLists.filter((l) => !isListDone(l)), [visibleLists])
  const doneLists = useMemo(() => visibleLists.filter((l) => isListDone(l)), [visibleLists])
  const totalItems = useMemo(
    () => visibleLists.reduce((sum, l) => sum + (l.items?.length || 0), 0),
    [visibleLists],
  )

  // Al cargar elige la pestaña con listas: personales si tengo, si no familiares.
  const pickedDefault = useRef(false)
  useEffect(() => {
    if (pickedDefault.current || lists.length === 0) return
    pickedDefault.current = true
    const hasPersonal = lists.some((l) => l.scope === 'personal' && l.owner === myEmail)
    if (!hasPersonal && lists.some((l) => l.scope !== 'personal')) setScope('family')
  }, [lists, myEmail])

  const openAddList = () => {
    setEditingList(null)
    setListDrawer(true)
  }
  const openEditList = (list) => {
    setEditingList(list)
    setListDrawer(true)
  }
  const closeListDrawer = () => {
    setListDrawer(false)
    setEditingList(null)
  }
  const submitList = (data) => {
    if (editingList) return updateList(editingList, data)
    return addList(data)
  }
  const removeList = async (list) => {
    if (!list) return
    const ok = await confirm({
      title: 'Eliminar lista',
      message: `¿Eliminar "${list.name}" y todos sus artículos?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    deleteList(list)
    if (selectedId === list.id) setSelectedId(null)
    closeListDrawer()
  }

  const openAddItem = () => {
    setEditingItem(null)
    setItemDrawer(true)
  }
  const openEditItem = (item) => {
    setEditingItem(item)
    setItemDrawer(true)
  }
  const closeItemDrawer = () => {
    setItemDrawer(false)
    setEditingItem(null)
  }
  const submitItem = (data) => {
    if (!selected) return
    if (editingItem) updateItem(selected, { ...editingItem, ...data })
    else addItem(selected, data)
  }
  const removeItem = async () => {
    if (!selected || !editingItem) return
    const ok = await confirm({
      title: 'Eliminar artículo',
      message: `¿Eliminar "${editingItem.name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    deleteItem(selected, editingItem.id)
    closeItemDrawer()
  }
  const removeItemById = async (item) => {
    if (!selected || !item) return
    const ok = await confirm({
      title: 'Eliminar artículo',
      message: `¿Eliminar "${item.name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })
    if (!ok) return
    deleteItem(selected, item.id)
  }

  return (
    <section className="compras">
      {selected ? (
        <ShoppingDetail
          list={selected}
          onBack={() => setSelectedId(null)}
          onEdit={openEditList}
          onDelete={removeList}
          onAddItem={openAddItem}
          onEditItem={openEditItem}
          onDeleteItem={removeItemById}
          onToggleItem={(itemId) => toggleItem(selected, itemId)}
          onReorder={(ids) => reorderItems(selected, ids)}
        />
      ) : (
        <>
          <div className="compras__head">
            <h1 className="compras__title">Compras</h1>
          </div>

          <div className="compras__toolbar">
            <div className="acc-scope">
              <button
                type="button"
                className={`acc-scope__tab${scope === 'personal' ? ' acc-scope__tab--on' : ''}`}
                onClick={() => setScope('personal')}
              >
                Personales
              </button>
              <button
                type="button"
                className={`acc-scope__tab${scope === 'family' ? ' acc-scope__tab--on' : ''}`}
                onClick={() => setScope('family')}
              >
                Familiares
              </button>
            </div>
            <button type="button" className="acc-add" onClick={openAddList} aria-label="Agregar lista">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="acc-add__label">Agregar</span>
            </button>
          </div>

          {visibleLists.length === 0 ? (
            <p className="compras__empty">
              {lists.length === 0 ? 'Aún no tienes listas' : 'No hay listas en esta sección.'}
            </p>
          ) : (
            <div className="compras__body">
              <div className="compras__side">
                <div className="compras__summary">
                  <div className="compras__sum-card">
                    <span className="compras__sum-label">Listas activas</span>
                    <span className="compras__sum-value">{activeLists.length}</span>
                  </div>
                  <div className="compras__sum-card">
                    <span className="compras__sum-label">Total items</span>
                    <span className="compras__sum-value">{totalItems}</span>
                  </div>
                </div>
              </div>

              <div className="compras__main">
                {activeLists.length > 0 && (
                  <>
                    <h2 className="compras__subtitle">Activas</h2>
                    <div className="compras__lists">
                      {activeLists.map((list) => (
                        <ShoppingListCard key={list.id} list={list} onOpen={(l) => setSelectedId(l.id)} />
                      ))}
                    </div>
                  </>
                )}

                {doneLists.length > 0 && (
                  <>
                    <h2 className="compras__subtitle">Completadas</h2>
                    <div className="compras__lists compras__lists--done">
                      {doneLists.map((list) => (
                        <ShoppingListCard key={list.id} list={list} onOpen={(l) => setSelectedId(l.id)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <SideDrawer open={listDrawer} onClose={closeListDrawer} title="Lista">
        <ShoppingListDrawer
          list={editingList}
          defaultScope={scope}
          onSubmit={submitList}
          onDelete={() => removeList(editingList)}
          onClose={closeListDrawer}
        />
      </SideDrawer>

      <SideDrawer open={itemDrawer} onClose={closeItemDrawer} title="Artículo">
        {selected && (
          <ShoppingItemDrawer
            item={editingItem}
            onSubmit={submitItem}
            onDelete={removeItem}
            onClose={closeItemDrawer}
          />
        )}
      </SideDrawer>
    </section>
  )
}
