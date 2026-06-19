import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'VeloRent <noreply@velorent.app>'

// ── Email au CLIENT après réservation ──
export async function sendBookingConfirmationToCustomer({
  to, customerName, shopName, bikeType, startAt, endAt, notes,
}: {
  to: string
  customerName: string
  shopName: string
  bikeType: string
  startAt: Date
  endAt: Date
  notes?: string | null
}) {
  if (!to || !process.env.RESEND_API_KEY) return

  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  const BIKE_LABELS: Record<string, string> = {
    CITY: 'Vélo de ville', ELECTRIC: 'Vélo électrique', MOUNTAIN: 'VTT',
    ROAD: 'Vélo de route', CARGO: 'Vélo cargo', KIDS: 'Vélo enfant', ESCOOTER: 'Trottinette',
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `✅ Réservation confirmée — ${shopName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366F1,#8b5cf6);padding:32px 32px 28px;text-align:center">
      <p style="color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 6px">VeloRent</p>
      <h1 style="color:white;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.02em">Réservation confirmée 🎉</h1>
    </div>
    <!-- Body -->
    <div style="padding:32px">
      <p style="color:#374151;font-size:15px;margin:0 0 24px">Bonjour <strong>${customerName}</strong>,</p>
      <p style="color:#374151;font-size:15px;margin:0 0 24px">Votre réservation chez <strong>${shopName}</strong> a bien été enregistrée. La boutique vous contactera pour confirmer les détails.</p>

      <!-- Details card -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px">Détails de la réservation</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:13px;width:40%">Type de vélo</td>
            <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600">${BIKE_LABELS[bikeType] || bikeType}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:13px">Début</td>
            <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600">${fmt(startAt)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:13px">Fin prévue</td>
            <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600">${fmt(endAt)}</td>
          </tr>
          ${notes ? `<tr><td style="padding:6px 0;color:#94a3b8;font-size:13px">Notes</td><td style="padding:6px 0;color:#0f172a;font-size:13px">${notes}</td></tr>` : ''}
        </table>
      </div>

      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:24px">
        <p style="color:#92400e;font-size:13px;margin:0">⚠️ <strong>Pas de paiement maintenant.</strong> Vous payerez directement en boutique au moment du retrait.</p>
      </div>

      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0">Cet email a été envoyé automatiquement. Pour annuler ou modifier votre réservation, contactez directement <strong>${shopName}</strong>.</p>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px 32px;text-align:center">
      <p style="color:#94a3b8;font-size:11px;margin:0">Powered by VeloRent · velorent.app</p>
    </div>
  </div>
</body>
</html>`,
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
      <div style="background:#f0f0ff;border:1px solid #c7d2fe;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="color:#4338ca;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px">Client</p>
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
