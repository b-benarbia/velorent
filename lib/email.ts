import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'VeloRent <onboarding@resend.dev>'

type Locale = 'fr' | 'en' | 'es'

const BIKE_LABELS: Record<string, Record<Locale, string>> = {
  CITY:     { fr: 'Vélo de ville',    en: 'City bike',       es: 'Bici urbana' },
  ELECTRIC: { fr: 'Vélo électrique',  en: 'Electric bike',   es: 'Bici eléctrica' },
  MOUNTAIN: { fr: 'VTT',              en: 'Mountain bike',   es: 'Bici de montaña' },
  ROAD:     { fr: 'Vélo de route',    en: 'Road bike',       es: 'Bici de carretera' },
  CARGO:    { fr: 'Vélo cargo',       en: 'Cargo bike',      es: 'Bici de carga' },
  KIDS:     { fr: 'Vélo enfant',      en: 'Kids bike',       es: 'Bici infantil' },
  ESCOOTER: { fr: 'Trottinette',      en: 'E-scooter',       es: 'Patinete' },
  TANDEM:   { fr: 'Tandem',           en: 'Tandem',          es: 'Tándem' },
  FATBIKE:  { fr: 'Fat Bike',         en: 'Fat Bike',        es: 'Fat Bike' },
  EMTB:     { fr: 'VTT Électrique',   en: 'Electric MTB',    es: 'MTB Eléctrica' },
}

function bikeLabel(type: string, locale: Locale) {
  return BIKE_LABELS[type]?.[locale] ?? type
}

function fmtDate(d: Date, locale: Locale) {
  const l = locale === 'es' ? 'es-ES' : locale === 'en' ? 'en-GB' : 'fr-FR'
  return d.toLocaleDateString(l, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

function fmtDateShort(d: Date, locale: Locale) {
  const l = locale === 'es' ? 'es-ES' : locale === 'en' ? 'en-GB' : 'fr-FR'
  return d.toLocaleDateString(l, { weekday: 'long', day: 'numeric', month: 'long' })
}

const EMAIL_T = {
  booking: {
    subject: { fr: (s: string) => `✅ Réservation confirmée — ${s}`, en: (s: string) => `✅ Booking confirmed — ${s}`, es: (s: string) => `✅ Reserva confirmada — ${s}` },
    title:   { fr: 'Réservation confirmée 🎉', en: 'Booking confirmed 🎉', es: 'Reserva confirmada 🎉' },
    greeting:{ fr: (n: string) => `Bonjour <strong>${n}</strong>,`, en: (n: string) => `Hello <strong>${n}</strong>,`, es: (n: string) => `Hola <strong>${n}</strong>,` },
    body:    { fr: (s: string) => `Votre réservation chez <strong>${s}</strong> a bien été enregistrée. La boutique vous contactera pour confirmer les détails.`, en: (s: string) => `Your booking at <strong>${s}</strong> has been received. The shop will contact you to confirm the details.`, es: (s: string) => `Tu reserva en <strong>${s}</strong> ha sido registrada. La tienda te contactará para confirmar los detalles.` },
    details: { fr: 'Détails de la réservation', en: 'Booking details', es: 'Detalles de la reserva' },
    bikeType:{ fr: 'Type de vélo', en: 'Bike type', es: 'Tipo de bici' },
    start:   { fr: 'Début', en: 'Start', es: 'Inicio' },
    end:     { fr: 'Fin prévue', en: 'Expected end', es: 'Fin prevista' },
    notes:   { fr: 'Notes', en: 'Notes', es: 'Notas' },
    warning: { fr: '⚠️ <strong>Pas de paiement maintenant.</strong> Vous payerez directement en boutique au moment du retrait.', en: '⚠️ <strong>No payment now.</strong> You will pay directly at the shop when picking up.', es: '⚠️ <strong>Sin pago ahora.</strong> Pagarás directamente en la tienda al recoger.' },
    footer:  { fr: (s: string) => `Cet email a été envoyé automatiquement. Pour annuler, contactez directement <strong>${s}</strong>.`, en: (s: string) => `This email was sent automatically. To cancel, contact <strong>${s}</strong> directly.`, es: (s: string) => `Este correo fue enviado automáticamente. Para cancelar, contacta directamente con <strong>${s}</strong>.` },
  },
  confirmed: {
    subject: { fr: (s: string) => `🎉 C'est confirmé — ${s}`, en: (s: string) => `🎉 Confirmed — ${s}`, es: (s: string) => `🎉 Confirmado — ${s}` },
    title:   { fr: "C'est confirmé !", en: "It's confirmed!", es: '¡Confirmado!' },
    greeting:{ fr: (n: string) => `Bonjour <strong>${n}</strong>,`, en: (n: string) => `Hello <strong>${n}</strong>,`, es: (n: string) => `Hola <strong>${n}</strong>,` },
    body:    { fr: (s: string) => `Bonne nouvelle — <strong>${s}</strong> a confirmé votre réservation. Votre vélo sera prêt à l'heure convenue.`, en: (s: string) => `Great news — <strong>${s}</strong> has confirmed your booking. Your bike will be ready at the agreed time.`, es: (s: string) => `Buenas noticias — <strong>${s}</strong> ha confirmado tu reserva. Tu bici estará lista a la hora acordada.` },
    details: { fr: 'Votre réservation', en: 'Your booking', es: 'Tu reserva' },
    bikeType:{ fr: 'Type de vélo', en: 'Bike type', es: 'Tipo de bici' },
    start:   { fr: 'Début', en: 'Start', es: 'Inicio' },
    end:     { fr: 'Fin prévue', en: 'Expected end', es: 'Fin prevista' },
    notes:   { fr: 'Notes', en: 'Notes', es: 'Notas' },
    bringTitle: { fr: 'À prévoir le jour J', en: 'What to bring', es: 'Qué traer' },
    bring:   { fr: ['Une pièce d\'identité', 'Un moyen de paiement', 'Une tenue adaptée 🚴'], en: ['A valid ID', 'A payment method', 'Suitable clothing 🚴'], es: ['Un documento de identidad', 'Un medio de pago', 'Ropa adecuada 🚴'] },
    footer:  { fr: (s: string) => `Pour toute question, contactez directement <strong>${s}</strong>.`, en: (s: string) => `For any questions, contact <strong>${s}</strong> directly.`, es: (s: string) => `Para cualquier pregunta, contacta directamente con <strong>${s}</strong>.` },
  },
  cancelled: {
    subject: { fr: (s: string) => `Réservation annulée — ${s}`, en: (s: string) => `Booking cancelled — ${s}`, es: (s: string) => `Reserva cancelada — ${s}` },
    title:   { fr: 'Réservation annulée', en: 'Booking cancelled', es: 'Reserva cancelada' },
    greeting:{ fr: (n: string) => `Bonjour <strong>${n}</strong>,`, en: (n: string) => `Hello <strong>${n}</strong>,`, es: (n: string) => `Hola <strong>${n}</strong>,` },
    body:    { fr: (b: string, d: string, s: string) => `Nous sommes désolés de vous informer que votre réservation d'un <strong>${b}</strong> prévue le <strong>${d}</strong> chez <strong>${s}</strong> a été annulée.`, en: (b: string, d: string, s: string) => `We're sorry to inform you that your booking for a <strong>${b}</strong> on <strong>${d}</strong> at <strong>${s}</strong> has been cancelled.`, es: (b: string, d: string, s: string) => `Lamentamos informarte de que tu reserva de una <strong>${b}</strong> prevista el <strong>${d}</strong> en <strong>${s}</strong> ha sido cancelada.` },
    reasonTitle: { fr: 'Motif', en: 'Reason', es: 'Motivo' },
    rebook: { fr: 'Vous pouvez effectuer une nouvelle réservation directement sur notre page, ou contacter la boutique pour trouver une autre date.', en: 'You can make a new booking directly on our page, or contact the shop to find another date.', es: 'Puedes realizar una nueva reserva directamente en nuestra página, o contactar con la tienda para encontrar otra fecha.' },
    footer:  { fr: (s: string) => `Pour toute question, contactez <strong>${s}</strong> directement.`, en: (s: string) => `For any questions, contact <strong>${s}</strong> directly.`, es: (s: string) => `Para cualquier pregunta, contacta directamente con <strong>${s}</strong>.` },
  },
}

// ── Email au CLIENT après réservation ──
export async function sendBookingConfirmationToCustomer({
  to, customerName, shopName, bikeType, startAt, endAt, notes, locale = 'fr',
}: {
  to: string; customerName: string; shopName: string; bikeType: string
  startAt: Date; endAt: Date; notes?: string | null; locale?: string
}) {
  if (!to || !process.env.RESEND_API_KEY) return
  const l = (['fr','en','es'].includes(locale) ? locale : 'fr') as Locale
  const T = EMAIL_T.booking
  await resend.emails.send({
    from: FROM, to,
    subject: T.subject[l](shopName),
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
  <div style="background:linear-gradient(135deg,#0D9488,#0891B2);padding:36px 32px 32px;text-align:center">
    <p style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px">VeloRent · ${shopName}</p>
    <h1 style="color:white;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.02em">${T.title[l]}</h1>
  </div>
  <div style="padding:32px">
    <p style="color:#374151;font-size:15px;margin:0 0 12px">${T.greeting[l](customerName)}</p>
    <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.6">${T.body[l](shopName)}</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:22px;margin-bottom:24px">
      <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px">${T.details[l]}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:40%">${T.bikeType[l]}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600">${bikeLabel(bikeType,l)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;border-top:1px solid #f1f5f9">${T.start[l]}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;border-top:1px solid #f1f5f9">${fmtDate(startAt,l)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;border-top:1px solid #f1f5f9">${T.end[l]}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;border-top:1px solid #f1f5f9">${fmtDate(endAt,l)}</td></tr>
        ${notes ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;border-top:1px solid #f1f5f9">${T.notes[l]}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;border-top:1px solid #f1f5f9">${notes}</td></tr>` : ''}
      </table>
    </div>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:24px">
      <p style="color:#92400e;font-size:13px;margin:0">${T.warning[l]}</p>
    </div>
    <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0">${T.footer[l](shopName)}</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center">
    <p style="color:#94a3b8;font-size:11px;margin:0">Powered by <strong>VeloRent</strong></p>
  </div>
</div></body></html>`,
  })
}

// ── Email au CLIENT quand le gérant CONFIRME ──
export async function sendReservationConfirmedToCustomer({
  to, customerName, shopName, bikeType, startAt, endAt, notes, locale = 'fr',
}: {
  to: string; customerName: string; shopName: string; bikeType: string
  startAt: Date; endAt: Date; notes?: string | null; locale?: string
}) {
  if (!to || !process.env.RESEND_API_KEY) return
  const l = (['fr','en','es'].includes(locale) ? locale : 'fr') as Locale
  const T = EMAIL_T.confirmed
  await resend.emails.send({
    from: FROM, to,
    subject: T.subject[l](shopName),
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(16,185,129,0.10)">
  <div style="background:linear-gradient(135deg,#10b981,#059669);padding:36px 32px 32px;text-align:center">
    <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px"><span style="font-size:28px;line-height:1">✓</span></div>
    <p style="color:rgba(255,255,255,0.75);font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px">VeloRent · ${shopName}</p>
    <h1 style="color:white;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.02em">${T.title[l]}</h1>
  </div>
  <div style="padding:32px">
    <p style="color:#374151;font-size:15px;margin:0 0 12px">${T.greeting[l](customerName)}</p>
    <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.6">${T.body[l](shopName)}</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:22px;margin-bottom:24px">
      <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px">${T.details[l]}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;width:38%">${T.bikeType[l]}</td><td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:700">${bikeLabel(bikeType,l)}</td></tr>
        <tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;border-top:1px solid #f1f5f9">${T.start[l]}</td><td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;border-top:1px solid #f1f5f9">${fmtDate(startAt,l)}</td></tr>
        <tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;border-top:1px solid #f1f5f9">${T.end[l]}</td><td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;border-top:1px solid #f1f5f9">${fmtDate(endAt,l)}</td></tr>
        ${notes ? `<tr><td style="padding:7px 0;color:#94a3b8;font-size:13px;border-top:1px solid #f1f5f9">${T.notes[l]}</td><td style="padding:7px 0;color:#0f172a;font-size:13px;border-top:1px solid #f1f5f9">${notes}</td></tr>` : ''}
      </table>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px;margin-bottom:24px">
      <p style="color:#166534;font-size:13px;font-weight:700;margin:0 0 8px">${T.bringTitle[l]}</p>
      <ul style="margin:0;padding:0 0 0 16px;color:#15803d;font-size:13px;line-height:1.8">
        ${T.bring[l].map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0">${T.footer[l](shopName)}</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center">
    <p style="color:#94a3b8;font-size:11px;margin:0">Powered by <strong>VeloRent</strong></p>
  </div>
</div></body></html>`,
  })
}

// ── Email au CLIENT quand le gérant ANNULE ──
export async function sendReservationCancelledToCustomer({
  to, customerName, shopName, bikeType, startAt, cancelReason, locale = 'fr',
}: {
  to: string; customerName: string; shopName: string; bikeType: string
  startAt: Date; cancelReason?: string | null; locale?: string
}) {
  if (!to || !process.env.RESEND_API_KEY) return
  const l = (['fr','en','es'].includes(locale) ? locale : 'fr') as Locale
  const T = EMAIL_T.cancelled
  await resend.emails.send({
    from: FROM, to,
    subject: T.subject[l](shopName),
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
  <div style="background:#1e293b;padding:32px 32px 28px;text-align:center">
    <p style="color:#475569;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px">VeloRent · ${shopName}</p>
    <h1 style="color:white;font-size:20px;font-weight:800;margin:0;letter-spacing:-0.01em">${T.title[l]}</h1>
  </div>
  <div style="padding:32px">
    <p style="color:#374151;font-size:15px;margin:0 0 12px">${T.greeting[l](customerName)}</p>
    <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.6">${T.body[l](bikeLabel(bikeType,l), fmtDateShort(startAt,l), shopName)}</p>
    ${cancelReason ? `<div style="background:#fef9f0;border:1px solid #fed7aa;border-left:4px solid #f97316;border-radius:0 10px 10px 0;padding:16px 18px;margin-bottom:24px">
      <p style="color:#9a3412;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px">${T.reasonTitle[l]}</p>
      <p style="color:#7c2d12;font-size:14px;margin:0;line-height:1.6">${cancelReason}</p>
    </div>` : ''}
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:24px">
      <p style="color:#374151;font-size:13px;margin:0;line-height:1.7">${T.rebook[l]}</p>
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0">${T.footer[l](shopName)}</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center">
    <p style="color:#94a3b8;font-size:11px;margin:0">Powered by <strong>VeloRent</strong></p>
  </div>
</div></body></html>`,
  })
}

// ── Email CONTRAT signé au CLIENT ─────────────────────────────────────────
export async function sendContractToCustomer({
  to, customerName, shopName, contractNumber, pdfBuffer,
}: {
  to: string
  customerName: string
  shopName: string
  contractNumber: string
  pdfBuffer: Buffer
}) {
  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#0f172a">
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:16px;padding:28px 32px;margin-bottom:24px">
      <p style="font-size:26px;margin:0 0 4px;font-weight:800;color:#fff;letter-spacing:-0.5px">📄 Votre contrat</p>
      <p style="font-size:14px;color:#64748b;margin:0">${shopName}</p>
    </div>
    <p style="font-size:15px;line-height:1.6">Bonjour <strong>${customerName}</strong>,</p>
    <p style="font-size:15px;line-height:1.6;color:#475569">
      Merci pour votre location chez <strong>${shopName}</strong>. Vous trouverez ci-joint votre contrat signé
      <strong>N° ${contractNumber}</strong> au format PDF.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:20px 0">
      <p style="font-size:12px;color:#64748b;margin:0 0 4px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">Conservez ce document</p>
      <p style="font-size:13px;color:#475569;margin:0">
        Ce contrat constitue la preuve de votre location et liste le matériel qui vous a été confié.
        Gardez-le précieusement, notamment en cas de vol ou sinistre.
      </p>
    </div>
    <p style="font-size:13px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px;margin-top:24px">
      Envoyé automatiquement par VeloRent · ${shopName}
    </p>
  </div>`

  return resend.emails.send({
    from:    FROM,
    to,
    subject: `📄 Votre contrat de location — ${shopName} (N° ${contractNumber})`,
    html,
    attachments: [{
      filename: `contrat-${contractNumber}.pdf`,
      content:  pdfBuffer.toString('base64'),
    }],
  })
}

// ── Email REÇU de retour au CLIENT ────────────────────────────────────────
export async function sendReceiptToCustomer({
  to, customerName, shopName, shopPhone, bikeName, bikeCode,
  startAt, endAt, amountPaid, depositAmount, depositReturned,
  contractNumber,
}: {
  to:              string
  customerName:    string
  shopName:        string
  shopPhone?:      string | null
  bikeName:        string
  bikeCode:        string
  startAt:         Date
  endAt:           Date
  amountPaid:      number
  depositAmount:   number
  depositReturned: boolean
  contractNumber:  string
}) {
  const fmtFR  = (d: Date) => d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  const duration = (() => {
    const ms = endAt.getTime() - startAt.getTime()
    const h  = Math.floor(ms / 3_600_000)
    const d  = Math.floor(h / 24)
    if (d >= 1) return `${d} jour${d > 1 ? 's' : ''}`
    return `${h}h`
  })()

  const depositLine = depositAmount > 0
    ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">Caution</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:700;color:${depositReturned ? '#16a34a' : '#dc2626'}">${depositReturned ? `✅ ${depositAmount.toFixed(2)} € rendue` : `⚠️ ${depositAmount.toFixed(2)} € retenue`}</td></tr>`
    : ''

  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#0f172a">
    <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);border-radius:16px;padding:28px 32px;margin-bottom:24px">
      <p style="font-size:26px;margin:0 0 4px;font-weight:800;color:#fff;letter-spacing:-0.5px">✅ Merci pour votre location !</p>
      <p style="font-size:14px;color:rgba(255,255,255,0.7);margin:0">${shopName}</p>
    </div>

    <p style="font-size:15px;line-height:1.6">Bonjour <strong>${customerName}</strong>,</p>
    <p style="font-size:15px;line-height:1.6;color:#475569">
      Votre vélo <strong>${bikeName}</strong> (${bikeCode}) a bien été restitué.
      Merci d'avoir choisi <strong>${shopName}</strong> — à bientôt !
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin:20px 0">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#94a3b8;margin:0 0 12px">Récapitulatif · Contrat N° ${contractNumber}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Véhicule</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:700">${bikeName} <span style="color:#0d9488">${bikeCode}</span></td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Départ</td><td style="padding:6px 0;text-align:right;font-size:13px">${fmtFR(startAt)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Retour</td><td style="padding:6px 0;text-align:right;font-size:13px">${fmtFR(endAt)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Durée</td><td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600">${duration}</td></tr>
        <tr style="border-top:1px solid #e2e8f0"><td style="padding:10px 0 6px;color:#64748b;font-size:13px">Montant payé</td><td style="padding:10px 0 6px;text-align:right;font-size:16px;font-weight:800;color:#16a34a">${amountPaid.toFixed(2)} €</td></tr>
        ${depositLine}
      </table>
    </div>

    ${shopPhone ? `<p style="font-size:13px;color:#64748b;margin-top:16px">📞 Une question ? Contactez-nous : <strong>${shopPhone}</strong></p>` : ''}

    <p style="font-size:12px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px;margin-top:24px">
      Reçu envoyé automatiquement par VeloRent · ${shopName}
    </p>
  </div>`

  return resend.emails.send({
    from:    FROM,
    to,
    subject: `✅ Retour confirmé — ${bikeName} · ${shopName}`,
    html,
  })
}

// ── Email RAPPEL au CLIENT (envoi manuel par le gérant) ──
export async function sendReminderToCustomer({
  to, customerName, shopName, shopPhone, bikeType, startAt, endAt, notes, locale = 'fr',
}: {
  to: string; customerName: string; shopName: string; shopPhone?: string | null
  bikeType: string; startAt: Date; endAt: Date; notes?: string | null; locale?: string
}) {
  if (!to || !process.env.RESEND_API_KEY) return
  const l = (['fr','en','es'].includes(locale) ? locale : 'fr') as Locale

  const T = {
    subject: { fr: `⏰ Rappel — votre location chez ${shopName}`, en: `⏰ Reminder — your rental at ${shopName}`, es: `⏰ Recordatorio — tu alquiler en ${shopName}` },
    title:   { fr: 'Rappel de réservation', en: 'Booking reminder', es: 'Recordatorio de reserva' },
    greeting:{ fr: `Bonjour <strong>${customerName}</strong>,`, en: `Hello <strong>${customerName}</strong>,`, es: `Hola <strong>${customerName}</strong>,` },
    body:    {
      fr: `Votre location d'un <strong>${bikeLabel(bikeType, l)}</strong> chez <strong>${shopName}</strong> arrive bientôt. Voici un rappel des détails.`,
      en: `Your <strong>${bikeLabel(bikeType, l)}</strong> rental at <strong>${shopName}</strong> is coming up soon. Here's a reminder of the details.`,
      es: `Tu alquiler de <strong>${bikeLabel(bikeType, l)}</strong> en <strong>${shopName}</strong> se acerca. Aquí tienes un recordatorio de los detalles.`,
    },
    details: { fr: 'Votre réservation', en: 'Your booking', es: 'Tu reserva' },
    bikeType:{ fr: 'Type de vélo', en: 'Bike type', es: 'Tipo de bici' },
    start:   { fr: 'Début', en: 'Start', es: 'Inicio' },
    end:     { fr: 'Fin prévue', en: 'Expected end', es: 'Fin prevista' },
    notes:   { fr: 'Notes', en: 'Notes', es: 'Notas' },
    bringTitle: { fr: 'À prévoir le jour J', en: 'What to bring', es: 'Qué traer' },
    bring: {
      fr: ["Une pièce d'identité", 'Un moyen de paiement', 'Une tenue adaptée 🚴'],
      en: ['A valid ID', 'A payment method', 'Suitable clothing 🚴'],
      es: ['Un documento de identidad', 'Un medio de pago', 'Ropa adecuada 🚴'],
    },
    contact: { fr: `Pour toute question, contactez <strong>${shopName}</strong>${shopPhone ? ` au ${shopPhone}` : ''}.`, en: `For any questions, contact <strong>${shopName}</strong>${shopPhone ? ` at ${shopPhone}` : ''}.`, es: `Para cualquier pregunta, contacta con <strong>${shopName}</strong>${shopPhone ? ` en ${shopPhone}` : ''}.` },
  }

  await resend.emails.send({
    from: FROM, to,
    subject: T.subject[l],
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fffbeb;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(251,191,36,0.15)">
  <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:36px 32px 32px;text-align:center">
    <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:28px;line-height:1">⏰</div>
    <p style="color:rgba(255,255,255,0.8);font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 6px">VeloRent · ${shopName}</p>
    <h1 style="color:white;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.02em">${T.title[l]}</h1>
  </div>
  <div style="padding:32px">
    <p style="color:#374151;font-size:15px;margin:0 0 12px">${T.greeting[l]}</p>
    <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.6">${T.body[l]}</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:22px;margin-bottom:22px">
      <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px">${T.details[l]}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;width:38%">${T.bikeType[l]}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700">${bikeLabel(bikeType,l)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;border-top:1px solid #f1f5f9">${T.start[l]}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;border-top:1px solid #f1f5f9">${fmtDate(startAt,l)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;border-top:1px solid #f1f5f9">${T.end[l]}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;border-top:1px solid #f1f5f9">${fmtDate(endAt,l)}</td></tr>
        ${notes ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px;border-top:1px solid #f1f5f9">${T.notes[l]}</td><td style="padding:6px 0;color:#475569;font-size:13px;border-top:1px solid #f1f5f9;font-style:italic">${notes}</td></tr>` : ''}
      </table>
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 18px;margin-bottom:24px">
      <p style="color:#92400e;font-size:13px;font-weight:700;margin:0 0 8px">${T.bringTitle[l]}</p>
      <ul style="margin:0;padding:0 0 0 16px;color:#b45309;font-size:13px;line-height:1.8">
        ${T.bring[l].map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0">${T.contact[l]}</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center">
    <p style="color:#94a3b8;font-size:11px;margin:0">Powered by <strong>VeloRent</strong></p>
  </div>
</div></body></html>`,
  })
}

// ── Email au GÉRANT après réservation ──
export async function sendBookingAlertToShop({
  shopEmail, shopName, customerName, customerPhone, customerEmail,
  bikeType, startAt, endAt, notes,
}: {
  shopEmail: string
  shopName: string
  customerName: string
  customerPhone?: string | null
  customerEmail?: string
  bikeType: string
  startAt: Date
  endAt: Date
  notes?: string | null
}) {
  if (!shopEmail || !process.env.RESEND_API_KEY) return

  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  const BIKE_LABELS: Record<string, string> = {
    CITY: 'Vélo de ville', ELECTRIC: 'Vélo électrique', MOUNTAIN: 'VTT',
    ROAD: 'Vélo de route', CARGO: 'Vélo cargo', KIDS: 'Vélo enfant', ESCOOTER: 'Trottinette',
    TANDEM: 'Tandem', FATBIKE: 'Fat Bike', EMTB: 'VTT Électrique',
  }

  await resend.emails.send({
    from: FROM,
    to: shopEmail,
    subject: `🔔 Nouvelle réservation — ${customerName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
    <div style="background:#0f172a;padding:24px 32px">
      <p style="color:#475569;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 4px">VeloRent · ${shopName}</p>
      <h1 style="color:white;font-size:20px;font-weight:800;margin:0">🔔 Nouvelle réservation en ligne</h1>
    </div>
    <div style="padding:32px">
      <div style="background:#f0f0ff;border:1px solid #99F6E4;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="color:#134e4a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px">Client</p>
        <p style="color:#0f172a;font-size:18px;font-weight:800;margin:0 0 8px">${customerName}</p>
        ${customerPhone ? `<p style="color:#374151;font-size:14px;margin:0 0 4px">📞 ${customerPhone}</p>` : ''}
        ${customerEmail ? `<p style="color:#374151;font-size:14px;margin:0">✉️ ${customerEmail}</p>` : ''}
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px">Réservation</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:5px 0;color:#94a3b8;font-size:13px;width:35%">Vélo</td>
            <td style="padding:5px 0;color:#0f172a;font-size:13px;font-weight:700">${BIKE_LABELS[bikeType] || bikeType}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#94a3b8;font-size:13px">Début</td>
            <td style="padding:5px 0;color:#0f172a;font-size:13px;font-weight:600">${fmt(startAt)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;color:#94a3b8;font-size:13px">Fin prévue</td>
            <td style="padding:5px 0;color:#0f172a;font-size:13px;font-weight:600">${fmt(endAt)}</td>
          </tr>
          ${notes ? `<tr><td style="padding:5px 0;color:#94a3b8;font-size:13px">Notes</td><td style="padding:5px 0;color:#0f172a;font-size:13px">${notes}</td></tr>` : ''}
        </table>
      </div>

      <p style="color:#64748b;font-size:13px;margin:0">Connectez-vous à votre tableau de bord VeloRent pour confirmer ou modifier cette réservation.</p>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center">
      <p style="color:#94a3b8;font-size:11px;margin:0">Powered by VeloRent · velorent.app</p>
    </div>
  </div>
</body>
</html>`,
  })
}
