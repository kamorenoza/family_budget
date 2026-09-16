import { createRoot } from 'react-dom/client'
import ConfirmDialog from './ConfirmDialog.jsx'

// Promise-based confirm dialog (mirrors the reference app's useConfirm).
export function confirm(options) {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const close = (result) => {
      root.unmount()
      container.remove()
      resolve(result)
    }

    root.render(
      <ConfirmDialog
        {...options}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    )
  })
}
