import { useEffect, useRef, useState } from 'react'

// Reordenamiento por arrastre (funciona con mouse y con toque en PWA/móvil).
// Recibe la lista de ids en su orden actual y una función que persiste el nuevo orden.
// Devuelve el orden en vivo (para pintar mientras se arrastra) y las props del "asa".
export function useDragOrder(ids, onCommit) {
  const [order, setOrder] = useState(ids)
  const orderRef = useRef(ids)
  const draggingId = useRef(null)

  const key = ids.join(',')
  useEffect(() => {
    const next = key ? key.split(',') : []
    setOrder(next)
    orderRef.current = next
  }, [key])

  const apply = (next) => {
    orderRef.current = next
    setOrder(next)
  }

  const moveOver = (overId) => {
    const from = orderRef.current.indexOf(draggingId.current)
    const to = orderRef.current.indexOf(overId)
    if (from === -1 || to === -1 || from === to) return
    const next = [...orderRef.current]
    next.splice(to, 0, next.splice(from, 1)[0])
    apply(next)
  }

  const startPointerDrag = (id) => (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    draggingId.current = id
    const move = (ev) => {
      if (!draggingId.current) return
      ev.preventDefault()
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const row = el && el.closest('[data-drag-id]')
      const overId = row && row.getAttribute('data-drag-id')
      if (overId) moveOver(overId)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (draggingId.current) {
        draggingId.current = null
        onCommit(orderRef.current)
      }
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const dragPropsFor = (id) => ({
    'data-drag-id': id,
    handleProps: { onPointerDown: startPointerDrag(id) },
  })

  return { order, dragPropsFor }
}
