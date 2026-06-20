/**
 * POST /api/public/[tenant]/reserve
 *
 * Crée une réservation publique depuis le widget /[tenant]/book.
 * Valide la disponibilité, crée la Reservation et envoie l'email de confirmation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: slug } = await params
    const body = await req.json()

    const {
      bikeId,
      bikeType,
      startAt: startAtStr,
      endAt: endAtStr,
      customerName,
      customerEmail,
      customerPhone,
      totalPrice,
    } = body

    // Validation basique
    if (!startAtStr || !endAtStr || !customerName || !customerEmail) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const startAt = new Date(startAtStr)
    const endAt   = new Date(endAtStr)

    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt <= startAt) {
      return NextResponse.json({ error: 'Dates invalides' }, { status: 400 })
    }

    // Trouver le tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, email: true, currency: true },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Shop introuvable' }, { status: 404 })
    }

    // Vérifier que le vélo est toujours dispo (protection race condition)
    if (bikeId) {
      const conflict = await prisma.reservation.findFirst({
        where: {
          tenantId: tenant.id,
          bikeId,
          status: { in: ['CONFIRMED', 'PENDING', 'CHECKED_IN'] },
          AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
        },
      })
      if (conflict) {
        return NextResponse.json({ error: 'Ce vélo n\'est plus disponible pour ces dates. Veuillez en choisir un autre.' }, { status: 409 })
      }
    }

    // Créer ou trouver le client
    let customer = customerPhone
      ? await prisma.customer.findFirst({
          where: {
            tenantId: tenant.id,
            OR: [
              { email: customerEmail },
              { phone: { contains: customerPhone.replace(/\s+/g, '').replace(/^\+/, '') } },
            ],
          },
        })
      : await prisma.customer.findFirst({
          where: { tenantId: tenant.id, email: customerEmail },
        })

    if (!customer) {
      const nameParts = customerName.trim().split(' ')
      const firstName = nameParts[0]
      const lastName  = nameParts.slice(1).join(' ') || '-'
      customer = await prisma.customer.create({
        data: {
          tenantId:  tenant.id,
          firstName,
          lastName,
          email:     customerEmail,
          phone:     customerPhone ?? null,
        },
      })
    }

    // Générer un code de confirmation lisible
    const confirmationCode = `VR-${Date.now().toString(36).toUpperCase().slice(-6)}`

    // Créer la réservation
    const reservation = await prisma.reservation.create({
      data: {
        tenantId:      tenant.id,
        bikeId:        bikeId ?? null,
        bikeType:      bikeType ?? null,
        customerId:    customer.id,
        customerName,
        customerEmail,
        customerPhone: customerPhone ?? null,
        status:        'PENDING',
        source:        'ONLINE',
        startAt,
        endAt,
        amountPaid:    0,
        notes:         `Réservation en ligne — code: ${confirmationCode}${totalPrice ? ` — prix estimé: ${totalPrice}${tenant.currency}` : ''}`,
      },
    })

    // Email de confirmation
    if (resend && customerEmail) {
      const formattedStart = startAt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      const formattedEnd   = endAt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

      await resend.emails.send({
        from:    'VeloRent <reservations@velorent.app>',
        to:      customerEmail,
        subject: `Réservation confirmée — ${tenant.name}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#6366F1,#4F46E5);padding:40px 32px;text-align:center">
      <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:28px">🚲</div>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:700">Réservation reçue</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px">${tenant.name}</p>
    </div>
    <div style="padding:32px">
      <p style="color:#374151;font-size:16px;margin:0 0 24px">Bonjour <strong>${customerName}</strong>,</p>
      <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.6">Votre demande de réservation a bien été reçue. Le shop va la confirmer dans les plus brefs délais.</p>

      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Code</span>
          <span style="color:#6366F1;font-size:15px;font-weight:700;font-family:monospace">${confirmationCode}</span>
        </div>
        <div style="height:1px;background:#e5e7eb;margin:12px 0"></div>
        <div style="margin-bottom:8px">
          <span style="color:#6b7280;font-size:13px">Début</span><br>
          <span style="color:#111827;font-size:15px;font-weight:600">${formattedStart}</span>
        </div>
        <div>
          <span style="color:#6b7280;font-size:13px">Fin</span><br>
          <span style="color:#111827;font-size:15px;font-weight:600">${formattedEnd}</span>
        </div>
        ${totalPrice ? `
        <div style="height:1px;background:#e5e7eb;margin:12px 0"></div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#6b7280;font-size:13px">Prix estimé</span>
          <span style="color:#111827;font-size:16px;font-weight:700">${totalPrice} ${tenant.currency}</span>
        </div>` : ''}
      </div>

      ${tenant.email || tenant.name ? `
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0">
        Des questions ? Contactez <strong>${tenant.name}</strong>${tenant.email ? ` à <a href="mailto:${tenant.email}" style="color:#6366F1">${tenant.email}</a>` : ''}.
      </p>` : ''}
    </div>
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">Propulsé par <strong>VeloRent</strong></p>
    </div>
  </div>
</body>
</html>`,
      }).catch(err => console.error('[reserve] Email error:', err))
    }

    return NextResponse.json({
      success:         true,
      reservationId:   reservation.id,
      confirmationCode,
      startAt:         reservation.startAt,
      endAt:           reservation.endAt,
    })

  } catch (err) {
    console.error('[reserve]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
