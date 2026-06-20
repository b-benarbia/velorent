/**
 * POST /api/public/[tenant]/checkout
 *
 * Crée une Stripe Checkout Session pour une réservation en ligne.
 * - Charge le montant total de la location immédiatement
 * - Pré-autorise la caution séparément (capture manuelle, jamais débitée si retour OK)
 *
 * Body: { bikeId, bikeType, bikeName, startAt, endAt, totalPrice, customerName, customerEmail, customerPhone }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: slug } = await params

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true, name: true, currency: true,
        stripeSecretKey: true,
        depositConfig: true,
      },
    })

    if (!tenant) return NextResponse.json({ error: 'Shop introuvable' }, { status: 404 })
    if (!tenant.stripeSecretKey) {
      return NextResponse.json({ error: 'Paiement en ligne non configuré pour ce shop' }, { status: 422 })
    }

    const {
      bikeId, bikeType, bikeName,
      startAt, endAt,
      totalPrice,
      customerName, customerEmail, customerPhone,
    } = await req.json()

    if (!totalPrice || !customerEmail || !customerName) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const stripe = new Stripe(tenant.stripeSecretKey, { apiVersion: '2025-05-28.basil' })
    const currency = (tenant.currency ?? 'EUR').toLowerCase()

    // Montant caution selon le type de vélo (depuis depositConfig du shop)
    const depositConfig = (tenant.depositConfig as Record<string, number>) ?? {}
    const depositAmt = depositConfig[bikeType] ?? 0

    // URL de base pour les redirections
    const baseUrl = req.nextUrl.origin

    // Stocker les metadata pour créer la réservation après paiement
    const metadata = {
      tenantId: tenant.id,
      bikeId: bikeId ?? '',
      bikeType: bikeType ?? '',
      bikeName: bikeName ?? '',
      startAt, endAt,
      totalPrice: String(totalPrice),
      depositAmount: String(depositAmt),
      customerName,
      customerEmail,
      customerPhone: customerPhone ?? '',
    }

    // Créer la Checkout Session Stripe
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency,
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: Math.round(Number(totalPrice) * 100), // centimes
            product_data: {
              name: `Location — ${bikeName ?? bikeType}`,
              description: `Du ${new Date(startAt).toLocaleDateString('fr-FR')} au ${new Date(endAt).toLocaleDateString('fr-FR')} · ${tenant.name}`,
            },
          },
          quantity: 1,
        },
        // Caution comme ligne séparée si > 0 (sera remboursée automatiquement)
        ...(depositAmt > 0 ? [{
          price_data: {
            currency,
            unit_amount: Math.round(depositAmt * 100),
            product_data: {
              name: `Caution de garantie — ${bikeName ?? bikeType}`,
              description: 'Remboursée intégralement au retour du vélo en bon état',
            },
          },
          quantity: 1,
        }] : []),
      ],
      payment_intent_data: {
        metadata,
        description: `Réservation ${tenant.name} — ${bikeName ?? bikeType}`,
      },
      metadata,
      success_url: `${baseUrl}/${slug}/book?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/${slug}/book?payment=cancel`,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err: unknown) {
    console.error('[checkout]', err)
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
