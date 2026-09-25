import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();
const db = getFirestore();

// Ruta desde la que se sirve la PWA (GitHub Pages: /family_budget/). Ajusta si
// se publica en un dominio propio en la raíz.
const APP_BASE = "/family_budget/";

// Cada cuántos minutos corre el scheduler. El resumen se manda una vez al día en
// la primera corrida cuya hora local coincida con `dailyHour`.
const RUN_INTERVAL_MIN = 60;

// ---------------------------------------------------------------------------
// Helpers (espejo de src/modules/presupuesto/presupuesto.utils.js)
// ---------------------------------------------------------------------------

// Partes de fecha/hora locales para una zona horaria IANA.
function localParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    monthKey: `${parts.year}-${parts.month}`,
    day: Number(parts.day),
    hour,
  };
}

// Da formato de moneda (es-CO usa puntos de miles).
function formatCurrency(n) {
  return `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;
}

// Día guardado de una fecha "YYYY-MM-DD" (o 1 por defecto).
function dayOfDate(dateStr, fallback = 1) {
  if (!dateStr) return fallback;
  const d = Number(String(dateStr).split("-")[2]);
  return d || fallback;
}

// Aplica el ajuste "solo este mes" guardado en monthOverrides (valor/nombre).
function applyMonthOverride(item, monthKey) {
  const ov = item.monthOverrides && item.monthOverrides[monthKey];
  if (!ov) return item;
  const next = { ...item };
  for (const key of [
    "amount",
    "description",
    "memberEmail",
    "sourceType",
    "bolsilloId",
    "categoryId",
  ]) {
    if (key in ov) next[key] = ov[key];
  }
  return next;
}

// ¿El gasto fijo/variable está visible en el mes indicado?
function isVisibleInMonth(item, monthKey) {
  if (item.fixed) {
    if (item.startMonth && monthKey < item.startMonth) return false;
    if ((item.excludedMonths || {})[monthKey]) return false;
    if (item.endMonth && monthKey > item.endMonth) return false;
    return true;
  }
  return item.monthKey === monthKey;
}

// Gastos que vencen hoy (mismo día del mes visible) y siguen sin pagar.
function duePaymentsFor(expenses, monthKey, day) {
  const out = [];
  for (const raw of expenses) {
    if (!isVisibleInMonth(raw, monthKey)) continue;
    if (dayOfDate(raw.date) !== day) continue;
    const paid = raw.fixed ? !!(raw.paidMonths || {})[monthKey] : !!raw.paid;
    if (paid) continue;
    out.push(applyMonthOverride(raw, monthKey));
  }
  return out;
}

// Manda un mensaje a todos los tokens de un usuario, podando los inválidos.
async function sendToUser(userId, tokensMap, message) {
  const tokens = Object.keys(tokensMap || {});
  if (tokens.length === 0) return;

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    // iOS Web Push EXIGE una `notification` visible; mandamos notificación +
    // data de respaldo. El service worker NO la vuelve a mostrar cuando ya hay
    // `notification` (evita duplicar).
    data: {
      title: String(message.title || ""),
      body: String(message.body || ""),
    },
    webpush: {
      notification: {
        title: String(message.title || "Family Budget"),
        body: String(message.body || ""),
        icon: `${APP_BASE}iconpwa.png`,
        badge: `${APP_BASE}iconpwa.png`,
      },
      fcmOptions: { link: APP_BASE },
    },
  });

  const invalid = {};
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument") ||
        code.includes("invalid-registration-token")
      ) {
        invalid[`notif.tokens.${tokens[i]}`] = FieldValue.delete();
      }
    }
  });
  if (Object.keys(invalid).length) {
    await db
      .doc(`users/${userId}`)
      .update(invalid)
      .catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Función programada: recordatorio diario de pagos (~8:00 hora local)
// ---------------------------------------------------------------------------

export const sendPaymentReminders = onSchedule(
  {
    schedule: `every ${RUN_INTERVAL_MIN} minutes`,
    timeZone: "Etc/UTC",
    region: "us-central1",
    retryCount: 0,
    memory: "256MiB",
    minInstances: 0,
    maxInstances: 1,
  },
  async () => {
    const now = new Date();
    const snap = await db.collection("users").get();

    // Cache de gastos por familia: varias personas comparten familyId y no hace
    // falta releer la colección para cada una.
    const expensesByFamily = new Map();
    async function getExpenses(familyId) {
      if (expensesByFamily.has(familyId)) return expensesByFamily.get(familyId);
      const q = await db
        .collection("expenses")
        .where("familyId", "==", familyId)
        .get();
      const list = q.docs.map((d) => ({ id: d.id, ...d.data() }));
      expensesByFamily.set(familyId, list);
      return list;
    }

    const jobs = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data() || {};
      const notif = data.notif;
      if (!notif || notif.enabled === false) continue;
      const tokens = notif.tokens || {};
      if (Object.keys(tokens).length === 0) continue;
      if (!data.familyId) continue;

      const timezone = data.timezone || "America/Bogota";
      const dailyHour = Number.isInteger(notif.dailyHour) ? notif.dailyHour : 8;
      const { dateKey, monthKey, day, hour } = localParts(now, timezone);
      if (hour !== dailyHour) continue;

      const sent = notif.sent || {};
      const dailyKey = `daily-${dateKey}`;
      if (sent[dailyKey]) continue;

      jobs.push(
        (async () => {
          const expenses = await getExpenses(data.familyId);
          const due = duePaymentsFor(expenses, monthKey, day);

          if (due.length > 0) {
            const body = due
              .map(
                (e) =>
                  `• ${e.description || "Pago"} · ${formatCurrency(e.amount)}`,
              )
              .join("\n");
            const title =
              due.length === 1
                ? "Tienes un pago hoy"
                : `Tienes ${due.length} pagos hoy`;
            await sendToUser(docSnap.id, tokens, { title, body });
          }

          // Marca enviado (aunque no hubiera pagos) para no reintentar toda la
          // hora. Conserva solo las marcas de hoy para no crecer sin límite.
          const newSent = { [dailyKey]: true };
          await db
            .doc(`users/${docSnap.id}`)
            .update({ "notif.sent": newSent })
            .catch(() => {});
        })(),
      );
    }

    await Promise.all(jobs);
    logger.info(
      `Recordatorios de pago: ${jobs.length} usuario(s) procesado(s).`,
    );
  },
);
