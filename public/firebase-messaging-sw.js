/* eslint-disable no-undef */
// Service worker dedicado de Firebase Cloud Messaging.
// Recibe los mensajes push cuando la PWA está en segundo plano o cerrada y los
// muestra como notificaciones del sistema (obligatorio para el push en iOS).
//
// La config web de Firebase llega como query params cuando la app registra este
// worker, así que no hace falta guardar credenciales en este archivo estático.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

const params = new URL(self.location).searchParams
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
})

const messaging = firebase.messaging()

// La Cloud Function manda un payload `notification` (necesario para que iOS lo
// muestre). Cuando ese payload está presente el sistema ya muestra la
// notificación, así que NO la volvemos a mostrar aquí (evita duplicados). Solo
// la mostramos manualmente en el respaldo "data-only".
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return
  const title = (payload.data && payload.data.title) || 'Family Budget'
  const body = (payload.data && payload.data.body) || ''
  self.registration.showNotification(title, {
    body,
    icon: './iconpwa.png',
    badge: './iconpwa.png',
    data: payload.data || {},
  })
})

// Enfoca o abre la app al tocar la notificación. En una PWA instalada la
// notificación pertenece a la PWA, así que abre la PWA (no el navegador).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = new URL(
    (event.notification.data && event.notification.data.link) || './',
    self.registration.scope,
  ).href

  event.waitUntil(
    (async () => {
      const list = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of list) {
        if (new URL(client.url).origin === new URL(target).origin) {
          if ('navigate' in client) {
            try {
              await client.navigate(target)
            } catch {
              // navegación no permitida: solo enfocamos
            }
          }
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(target)
    })(),
  )
})
