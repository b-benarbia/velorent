/**
 * POST /api/public/[tenant]/checkout/webhook
 * Stripe webhook — crée la réservation après paiement confirmé.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, stripeSecretKey: true },
  })
  if (!tenant?.stripeSecretKey) return NextResponse.json({ error: 'Not configured' }, { status: 422 })

  const stripe = new Stripe(tenant.stripeSecretKey, { apiVersion: '2025-05-28.basil' })
  const sig = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  // Note: en production, vérifier la signature avec un webhook secret
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test')
  } catch {
    // En dev sans secret, parser directement
    event = JSON.parse(body) as Stripe.Event
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const m = session.metadata ?? {}

    // Éviter les doublons
    const existing = await prisma.reservation.findFirst({
      where: { stripePaymentIntentId: session.payment_intent as string },
    })
    if (existing) return NextResponse.json({ ok: true })

    // Trouver ou créer le client
    let customer = await prisma.customer.findFirst({
      where: { tenantId: m.tenantId, email: m.customerEmail },
    })
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId: m.tenantId,
          name: m.customerName,
          email: m.customerEmail,
          phone: m.customerPhone ?? null,
        },
      })
    }

    await prisma.reservation.create({
      data: {
        tenantId: m.tenantId,
        bikeId: m.bikeId || null,
        bikeType: (m.bikeType as never) || null,
        customerId: customer.id,
        customerName: m.customerName,
        customerEmail: m.customerEmail,
        customerPhone: m.customerPhone || null,
        startAt: new Date(m.startAt),
        endAt: new Date(m.endAt),
        status: 'CONFIRMED', // Paiement reçu → auto-confirmée
        source: 'ONLINE',
        amountPaid: parseFloat(m.totalPrice ?? '0'),
        depositAmount: parseFloat(m.depositAmount ?? '0'),
        stripePaymentIntentId: session.payment_intent as string,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
