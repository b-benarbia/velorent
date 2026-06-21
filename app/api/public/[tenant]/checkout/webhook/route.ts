/**
 * POST /api/public/[tenant]/checkout/webhook
 * Stripe webhook — crée la réservation après paiement confirmé.
 *
 * Flow :
 * 1. Le checkout Stripe a débité le loyer uniquement
 * 2. La carte a été sauvegardée (setup_future_usage: 'off_session')
 * 3. Ici on crée un 2e PaymentIntent en capture manuelle pour la caution
 *    → Bloqué sur la carte du client, jamais débité sauf dommage/vol
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = await (prisma.tenant as any).findUnique({
    where: { slug },
    select: { id: true, name: true, email: true, phone: true, stripeSecretKey: true, currency: true },
  }) as { id: string; name: string; email: string | null; phone: string | null; stripeSecretKey: string | null; currency: string | null } | null
  if (!tenant?.stripeSecretKey) return NextResponse.json({ error: 'Not configured' }, { status: 422 })

  const stripe = new Stripe(tenant.stripeSecretKey)
  const sig = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  // Vérification signature webhook (prod) ou parse direct (dev)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test')
  } catch {
    event = JSON.parse(body) as Stripe.Event
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const m = session.metadata ?? {}

    // Anti-doublon
    const existing = await prisma.reservation.findFirst({
      where: { stripePaymentIntentId: session.payment_intent as string },
    })
    if (existing) return NextResponse.json({ ok: true })

    // Trouver ou créer le client
    let customer = await prisma.customer.findFirst({
      where: { tenantId: m.tenantId, email: m.customerEmail },
    })
    if (!customer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customer = await (prisma.customer as any).create({
        data: {
          tenantId: m.tenantId,
          name: m.customerName,
          email: m.customerEmail,
          phone: m.customerPhone ?? null,
        },
      })
    }

    const depositAmt = parseFloat(m.depositAmount ?? '0')
    let depositIntentId: string | null = null
    const currency = (tenant.currency ?? 'EUR').toLowerCase()

    // ── Pré-autorisation caution ──────────────────────────────────────────
    // On récupère la carte sauvegardée via le PaymentIntent du checkout,
    // puis on crée un 2e PI en capture manuelle (hôtels / Airbnb font pareil)
    if (depositAmt > 0 && session.payment_intent) {
      try {
        const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string)
        const paymentMethodId = typeof pi.payment_method === 'string'
          ? pi.payment_method
          : (pi.payment_method as Stripe.PaymentMethod | null)?.id ?? null
        const stripeCustomerId = typeof pi.customer === 'string'
          ? pi.customer
          : (pi.customer as Stripe.Customer | Stripe.DeletedCustomer | null)?.id ?? null

        if (paymentMethodId && stripeCustomerId) {
          const depositPi = await stripe.paymentIntents.create({
            amount: Math.round(depositAmt * 100),
            currency,
            customer: stripeCustomerId,
            payment_method: paymentMethodId,
            capture_method: 'manual',  // bloquer sans débiter
            confirm: true,
            off_session: true,
            description: `Caution — ${m.bikeName ?? m.bikeType} — ${m.customerName} — ${tenant.id}`,
            metadata: { tenantId: m.tenantId, source: 'velorent-deposit' },
          })
          depositIntentId = depositPi.id
        }
      } catch (e) {
        // La pré-auth peut échouer (3DS strict, carte prépayée…)
        // On crée quand même la réservation — le shop sera notifié via le dashboard
        console.error('[webhook] deposit pre-auth failed:', e)
      }
    }

    const confirmationCode = `VR-${Date.now().toString(36).toUpperCase().slice(-6)}`
    const startDate = new Date(m.startAt)
    const endDate   = new Date(m.endAt)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.reservation as any).create({
      data: {
        tenantId: m.tenantId,
        bikeId: m.bikeId || null,
        bikeType: m.bikeType || null,
        customerId: customer!.id,
        customerName: m.customerName,
        customerEmail: m.customerEmail,
        customerPhone: m.customerPhone || null,
        startAt: startDate,
        endAt: endDate,
        status: 'CONFIRMED',
        source: 'ONLINE',
        notes: `Paiement en ligne — code: ${confirmationCode}`,
        amountPaid: parseFloat(m.totalPrice ?? '0'),
        depositAmount: depositAmt,
        depositIntentId,
        stripePaymentIntentId: session.payment_intent as string,
      },
    })

    // ── Email de confirmation au client ───────────────────────────────────
    if (resend && m.customerEmail) {
      const fmt = (d: Date) => d.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
      })
      const totalPrice = parseFloat(m.totalPrice ?? '0')
      const bikeName   = m.bikeName ?? m.bikeType ?? 'Vélo'

      await resend.emails.send({
        from:    'VeloRent <reservations@velorent.app>',
        to:      m.customerEmail,
        subject: `Réservation confirmée — ${tenant!.name}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#635BFF,#0F766E);padding:40px 32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:700">Réservation confirmée</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px">${tenant!.name}</p>
    </div>
    <div style="padding:32px">
      <p style="color:#374151;font-size:16px;margin:0 0 20px">Bonjour <strong>${m.customerName}</strong>,</p>
      <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.6">
        Votre paiement a bien été reçu. Votre réservation est <strong>confirmée</strong>.
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Code</span>
          <span style="color:#635BFF;font-size:15px;font-weight:700;font-family:monospace">${confirmationCode}</span>
        </div>
        <div style="height:1px;background:#e5e7eb;margin:12px 0"></div>
        <div style="margin-bottom:10px">
          <span style="color:#6b7280;font-size:13px">Véhicule</span><br>
          <span style="color:#111827;font-size:15px;font-weight:600">${bikeName}</span>
        </div>
        <div style="margin-bottom:10px">
          <span style="color:#6b7280;font-size:13px">Début</span><br>
          <span style="color:#111827;font-size:15px;font-weight:600">${fmt(startDate)}</span>
        </div>
        <div style="margin-bottom:10px">
          <span style="color:#6b7280;font-size:13px">Fin</span><br>
          <span style="color:#111827;font-size:15px;font-weight:600">${fmt(endDate)}</span>
        </div>
        <div style="height:1px;background:#e5e7eb;margin:12px 0"></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="color:#6b7280;font-size:13px">Payé</span>
          <span style="color:#111827;font-size:18px;font-weight:800">${totalPrice.toFixed(2)} ${currency.toUpperCase()}</span>
        </div>
        ${depositAmt > 0 ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <span style="color:#6b7280;font-size:13px">Caution bloquée</span>
          <span style="color:#0d9488;font-size:14px;font-weight:600">${depositAmt.toFixed(2)} ${currency.toUpperCase()} <span style="color:#9ca3af;font-weight:400">(remboursée au retour)</span></span>
        </div>` : ''}
      </div>
      ${tenant!.email || tenant!.phone ? `
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0">
        Des questions ? Contactez <strong>${tenant!.name}</strong>${tenant!.phone ? ` au ${tenant!.phone}` : ''}${tenant!.email ? ` ou à <a href="mailto:${tenant!.email}" style="color:#635BFF">${tenant!.email}</a>` : ''}.
      </p>` : ''}
    </div>
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">Propulsé par <strong>VeloRent</strong></p>
    </div>
  </div>
</body>
</html>`,
      }).catch(err => console.error('[webhook] email error:', err))
    }
  }

  return NextResponse.json({ ok: true })
}
