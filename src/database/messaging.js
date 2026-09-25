import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { doc, setDoc, deleteField, serverTimestamp } from 'firebase/firestore'
import { firebaseApp, db } from './firebase'

// Clave pública VAPID (Firebase Console -> Cloud Messaging -> Certificados web push).
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

// Base desde la que se sirve la app (coincide con `base` de Vite). Ubica el
// service worker dedicado de FCM.
const BASE = import.meta.env.BASE_URL || '/'

let messagingPromise = null

// Instancia de messaging solo si el navegador soporta Web Push.
async function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (!(await isSupported())) return null
      return getMessaging(firebaseApp)
    })()
  }
  return messagingPromise
}

export async function notificationsSupported() {
  return (
    typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator &&
    (await isSupported())
  )
}

export function notificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

// Registra el SW de FCM pasando la config web de Firebase por query params para
// que el archivo estático se inicialice sin leer variables de entorno.
async function registerFcmServiceWorker() {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
  return navigator.serviceWorker.register(
    `${BASE}firebase-messaging-sw.js?${params.toString()}`,
    { scope: `${BASE}firebase-cloud-messaging-push-scope` },
  )
}

// Pide permiso, obtiene un token FCM y lo guarda (con la zona horaria del
// dispositivo) en el doc del usuario para que la Cloud Function pueda apuntarle.
// Devuelve el token, o null si no se concede / no hay soporte.
export async function enableNotifications(email) {
  const id = email?.toLowerCase()
  if (!id) return null
  if (!(await notificationsSupported())) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const messaging = await getMessagingInstance()
  if (!messaging) return null

  const swRegistration = await registerFcmServiceWorker()
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swRegistration,
  })
  if (!token) return null

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota'

  // Token indexado por sí mismo para que convivan varios dispositivos, más la
  // zona horaria y el recordatorio diario a las 8:00 por defecto.
  await setDoc(
    doc(db, 'users', id),
    {
      timezone,
      notif: {
        enabled: true,
        dailyHour: 8,
        tokens: { [token]: serverTimestamp() },
      },
    },
    { merge: true },
  )

  return token
}

// Quita un token del doc del usuario (al apagar las notificaciones).
export async function disableNotifications(email, token) {
  const id = email?.toLowerCase()
  if (!id) return
  const update = { 'notif.enabled': false }
  if (token) update[`notif.tokens.${token}`] = deleteField()
  await setDoc(doc(db, 'users', id), update, { merge: true })
}

// Mensajes en primer plano: los muestra como notificación con la app abierta.
export async function listenForegroundMessages() {
  const messaging = await getMessagingInstance()
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    const data = payload.data || {}
    const note = payload.notification || {}
    const title = note.title || data.title
    const body = note.body || data.body
    if (title && Notification.permission === 'granted') {
      new Notification(title, { body, icon: `${BASE}iconpwa.png` })
    }
  })
}
