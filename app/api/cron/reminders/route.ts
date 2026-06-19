import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReminderToCustomer } from '@/lib/email'

// ── Security ───────────────────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // ── Window 24h : startAt dans 23h–25h ─────────────────────────────────
  const from24  = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const until24 = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // ── Window 2h : startAt dans 1h–3h ────────────────────────────────────
  const from2h  = new Date(now.getTime() + 1 * 60 * 60 * 1000)
  const until2h = new Date(now.getTime() + 3 * 60 * 60 * 1000)

  const [res24h, res2h] = await Promise.all([
    // Rappels 24h — pas encore envoyés
    prisma.reservation.findMany({
      where: {
        status:          { in: ['PENDING', 'CONFIRMED'] },
        customerEmail:   { not: null },
        reminderSentAt:  null,
        startAt:         { gte: from24, lte: until24 },
      },
      include: { tenant: { select: { name: true, phone: true } } },
    }),
    // Rappels 2h — pas encore envoyés
    prisma.reservation.findMany({
      where: {
        status:            { in: ['PENDING', 'CONFIRMED'] },
        customerEmail:     { not: null },
        reminder2hSentAt:  null,
        startAt:           { gte: from2h, lte: until2h },
      },
      include: { tenant: { select: { name: true, phone: true } } },
    }),
  ])

  let sent = 0
  let errors = 0

  await Promise.allSettled([
    ...res24h.map(async (r) => {
      try {
        await sendReminderToCustomer({
          to:           r.customerEmail!,
          customerName: r.customerName,
          shopName:     r.tenant.name,
          shopPhone:    r.tenant.phone,
          bikeType:     r.bikeType ?? 'CITY',
          startAt:      r.startAt,
          endAt:        r.endAt,
          notes:        r.notes,
          locale:       'fr',
        })
        await prisma.reservation.update({
          where: { id: r.id },
          data:  { reminderSentAt: new Date() },
        })
        sent++
      } catch { errors++ }
    }),

    ...res2h.map(async (r) => {
      try {
        await sendReminderToCustomer({
          to:           r.customerEmail!,
          customerName: r.customerName,
          shopName:     r.tenant.name,
          shopPhone:    r.tenant.phone,
          bikeType:     r.bikeType ?? 'CITY',
          startAt:      r.startAt,
          endAt:        r.endAt,
          notes:        r.notes,
          locale:       'fr',
        })
        await prisma.reservation.update({
          where: { id: r.id },
          data:  { reminder2hSentAt: new Date() },
        })
        sent++
      } catch { errors++ }
    }),
  ])

  return NextResponse.json({
    ok:      true,
    sent,
    errors,
    checked: { '24h': res24h.length, '2h': res2h.length },
  })
}
