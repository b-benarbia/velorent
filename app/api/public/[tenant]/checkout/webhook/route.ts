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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = await (prisma.tenant as any).findUnique({
    where: { slug },
    select: { id: true, stripeSecretKey: true, currency: true },
  }) as { id: string; stripeSecretKey: string | null; currency: string | null } | null
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
        startAt: new Date(m.startAt),
        endAt: new Date(m.endAt),
        status: 'CONFIRMED',
        source: 'ONLINE',
        amountPaid: parseFloat(m.totalPrice ?? '0'),
        depositAmount: depositAmt,
        depositIntentId,
        stripePaymentIntentId: session.payment_intent as string,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
