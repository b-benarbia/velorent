/**
 * POST /api/reservations/[id]/deposit
 * Action sur la caution Stripe d'une réservation.
 * Body: { action: 'capture' | 'release' }
 * - capture : encaisse la caution (dommage ou vol)
 * - release : libère le blocage (retour OK)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import Stripe from 'stripe'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const { action } = await req.json() // 'capture' | 'release'

  if (!['capture', 'release'].includes(action)) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  }

  const reservation = await prisma.reservation.findFirst({
    where: { id, tenantId: session.tenantId },
    select: {
      id: true,
      stripePaymentIntentId: true,
      depositIntentId: true,
      depositAmount: true,
      depositCaptured: true,
    },
  })

  if (!reservation) return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })

  const intentId = reservation.depositIntentId ?? reservation.stripePaymentIntentId
  if (!intentId) {
    return NextResponse.json({ error: 'Aucun paiement Stripe associé' }, { status: 422 })
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { stripeSecretKey: true },
  })
  if (!tenant?.stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 422 })
  }

  const stripe = new Stripe(tenant.stripeSecretKey, { apiVersion: '2026-05-27.dahlia' })

  try {
    if (action === 'capture') {
      // Encaisser la caution
      await stripe.paymentIntents.capture(intentId)
      await prisma.reservation.update({
        where: { id },
        data: { depositCaptured: true },
      })
      return NextResponse.json({ ok: true, message: 'Caution encaissée avec succès' })
    } else {
      // Libérer le blocage (annuler le payment intent si pas encore capturé)
      await stripe.paymentIntents.cancel(intentId)
      await prisma.reservation.update({
        where: { id },
        data: { depositCaptured: false },
      })
      return NextResponse.json({ ok: true, message: 'Caution libérée avec succès' })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur Stripe'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
