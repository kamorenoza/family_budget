# Histórico de cambios del agente

Registro cronológico (más reciente arriba) de los cambios realizados por el agente **Family Budget Dev**. Cada entrada explica qué se hizo y por qué, para dar contexto a futuras tareas.

<!-- Nuevas entradas van justo debajo de esta línea, formato definido en el agente. -->

## 2026-09-25 — Notificaciones push: recordatorio diario de pagos
- **Tipo:** feat
- **Petición:** Agregar notificaciones a la PWA (como en otro proyecto propio), pero que al iniciar el día (~8:00 a. m.) recuerde los pagos que vencen ese día.
- **Por qué:** Los usuarios olvidan pagos con fecha de vencimiento; un aviso diario con los gastos del día evita retrasos.
- **Qué se hizo:**
  - Cliente FCM: `src/database/messaging.js` (soporte/permiso, registro del SW dedicado con la config por query params, `enableNotifications(email)` que pide permiso, obtiene token y lo guarda en `users/{email}.notif.tokens` junto a `timezone` y `dailyHour:8`, `disableNotifications`, y `listenForegroundMessages`).
  - Service worker de fondo `public/firebase-messaging-sw.js` (compat 10.x, init por query params, `onBackgroundMessage` sin duplicar cuando ya hay `notification`, `notificationclick` que enfoca/abre la PWA con icono `iconpwa.png`).
  - Cloud Function programada `functions/index.js` (`sendPaymentReminders`, `onSchedule` cada 30 min UTC): por cada usuario con `notif.enabled` y tokens, cuando su hora local == `dailyHour`, lee su `familyId`, consulta la colección `expenses` filtrando por `familyId`, calcula los gastos que vencen hoy y siguen sin pagar (día de `date`, visibilidad del mes por `startMonth/endMonth/excludedMonths` o `monthKey`, `applyMonthOverride`, `paidMonths[monthKey]`/`paid`) y envía UNA notificación "Tienes N pagos hoy" con el detalle; poda tokens inválidos y marca `notif.sent` del día.
  - UI: sección "Notificaciones" en `Configuracion.jsx` con toggle (activar/desactivar) que refleja soporte y permiso; estilos en `Configuracion.css`.
  - Listener de primer plano conectado en `App.jsx`.
  - Config/infra: `functions/package.json`, `functions/.gitignore`, `firebase.json`, `.firebaserc` (proyecto `family-budget-378dd`), `VITE_FIREBASE_VAPID_KEY` añadida a `.env.example` y a `deploy.yml`.
- **Archivos:** `src/database/messaging.js`, `public/firebase-messaging-sw.js`, `functions/index.js`, `functions/package.json`, `functions/.gitignore`, `firebase.json`, `.firebaserc`, `src/modules/settings/pages/Configuracion.jsx`, `src/modules/settings/pages/Configuracion.css`, `src/App.jsx`, `.env.example`, `.github/workflows/deploy.yml`
- **Notas:** Pasos manuales pendientes (no automatizados): (1) en Firebase Console > Cloud Messaging generar un **certificado web push (VAPID)** y ponerlo en `.env` local (`VITE_FIREBASE_VAPID_KEY`) y como secreto de repo del mismo nombre; (2) `cd functions && npm install`; (3) desplegar la función con `firebase deploy --only functions` (el deploy de GitHub Pages NO despliega Cloud Functions); requiere plan **Blaze**. iOS solo recibe push si la PWA está **instalada** en la pantalla de inicio. `.firebaserc` guarda solo el ID de proyecto (público), sin credenciales. La función solo considera **gastos** (no ingresos), según lo pedido.

## 2026-09-25 — Alcance de fijos, menús sin recorte y toggle de compras
- **Tipo:** fix | mejora
- **Petición:** (1) al editar un fijo "solo este mes" y luego otro mes "de este mes en adelante", los meses no afectados deben conservar su config y los afectados sobreescribirse; (2) los menús no deben verse cortados por ningún motivo, deben acomodarse al espacio; (3) que "ocultar completados" en compras sea un toggle y el texto más pequeño.
- **Por qué:** Al cortar un fijo quedaban ajustes "solo este mes" obsoletos en el doc original y la lógica no dejaba explícito que el pasado se conserva; el menú "Ordenar" de presupuesto se salía del contenedor con scroll; el filtro de compras usaba un checkbox poco claro.
- **Qué se hizo:**
  - (1) `splitExpenseFrom`/`splitIncomeFrom` ahora recortan el fijo original dejándole solo los `monthOverrides` (y `paidMonths`/`receivedMonths`) de meses anteriores al corte; los meses desde el corte se sobreescriben con el nuevo fijo (sin overrides). Helper `monthsBefore` agregado en ambos hooks.
  - (2) El menú `.tx-filter__menu` de presupuesto se ancla siempre al borde derecho de `.tx-section__actions` (antes solo en <700px), para que nunca lo recorte `.presupuesto__scroll` (`overflow-y:auto`).
  - (3) El filtro "Ocultar completados" de compras pasa de checkbox a toggle switch (patrón del calendario) con `role="switch"`; texto reducido a 0.78rem.
- **Archivos:** `src/modules/presupuesto/useExpenses.js`, `src/modules/presupuesto/useIncomes.js`, `src/modules/presupuesto/pages/Presupuesto.css`, `src/modules/compras/components/ShoppingDetail.jsx`, `src/modules/compras/pages/Compras.css`
- **Notas:** Como Firestore usa `updateDoc` (merge), el pasado del fijo original ya se conservaba; el cambio añade limpieza de meses obsoletos ≥ corte para que no reaparezcan si luego se extiende `endMonth`.

## 2026-09-25 — Ajustes de UI/UX en movimientos, presupuesto, calendario y compras
- **Tipo:** fix | feat | mejora
- **Petición:** Lote de 9 ajustes: (1) descripciones de movimientos se cortan verticalmente; (2) el panel de meses se sale de pantalla; (3) al editar valor/nombre/origen de un fijo debe respetar el alcance (solo mes) en presupuesto y calendario; (4) en gastos sin agrupar mostrar el avatar del dueño; (5) en el detalle de compras el scroll debe vivir en el contenido; (6) toggle persistente "Solo familiar" en el calendario; (7) el menú (⋮) de cada artículo se recorta abajo; (8) los grupos de compras completos deben ir al final; (9) filtro para ocultar completados en compras.
- **Por qué:** Corregir cortes visuales y desbordes, evitar sobrescribir todos los meses al editar un fijo, y mejorar la usabilidad de compras y calendario.
- **Qué se hizo:**
  - (1) `line-height` de `.mov-item__desc` y `.mov-item__meta` subido a 1.35 para no recortar descendentes.
  - (2) `MonthSelector` mide su posición al abrir y alinea el panel a la derecha si no cabe.
  - (3) `applyMonthOverride` ahora aplica `memberEmail/sourceType/bolsilloId/categoryId`; los submit de ingreso/gasto abren el diálogo de alcance también cuando cambia el origen, y el override de mes guarda esos campos (presupuesto y calendario).
  - (4) `ExpenseItem` recibe `showOwnerAvatar` y la fuente incluye `photo` para los gastos sin agrupar.
  - (5) Se aplicó el patrón de bloqueo de scroll a `.shop-detail`: la lista de artículos es ahora el contenedor con `overflow-y:auto`.
  - (6) Nuevo toggle `onlyFamily` en `MemberFilter`, persistido en `localStorage` (`calOnlyFamily`) y aplicado a ingresos/gastos.
  - (7) `DotMenu` mide el botón al abrir y despliega hacia arriba (`--up`) cuando no cabe abajo.
  - (8) El memo `groups` reordena `groupOrder` enviando al final los grupos sin pendientes.
  - (9) Nuevo botón de filtro con opción "Ocultar completados", persistido en `localStorage` (`shopHideCompleted`).
- **Archivos:** `src/modules/movimientos/components/Movimientos.css`, `src/shared/components/MonthSelector/MonthSelector.jsx`, `src/shared/components/MonthSelector/MonthSelector.css`, `src/modules/presupuesto/presupuesto.utils.js`, `src/modules/presupuesto/pages/Presupuesto.jsx`, `src/modules/calendario/pages/Calendario.jsx`, `src/modules/calendario/pages/Calendario.css`, `src/modules/compras/components/ShoppingDetail.jsx`, `src/modules/compras/components/ShoppingItemRow.jsx`, `src/modules/compras/pages/Compras.css`
- **Notas:** El scope "solo mes" en fijos usa `monthOverrides`; "desde este mes" sigue partiendo el fijo. Al pulsar "Limpiar" en el calendario también se apaga "Solo familiar".

## 2026-09-25 — Creación del agente y del histórico
- **Tipo:** feat
- **Petición:** Crear un agente para corregir/agregar/mejorar cosas en la app con todo el contexto y un histórico de cambios.
- **Por qué:** Centralizar el conocimiento de la arquitectura y dejar trazabilidad de cada modificación.
- **Qué se hizo:** Se creó el agente `.github/agents/family-budget-dev.agent.md` con el contexto completo de la app y este archivo de histórico.
- **Archivos:** `.github/agents/family-budget-dev.agent.md`, `docs/AGENT-CHANGELOG.md`
