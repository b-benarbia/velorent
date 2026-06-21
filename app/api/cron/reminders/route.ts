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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseWhere = (extraWhere: Record<string, any>) => ({
    status:    { in: ['PENDING', 'CONFIRMED'] as ('PENDING' | 'CONFIRMED')[] },
    ...extraWhere,
  })

  const [res24h, res2h] = await Promise.all([
    prisma.reservation.findMany({
      where: baseWhere({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reminderSentAt: null as any,
        startAt: { gte: from24, lte: until24 },
      }),
      include: { tenant: { select: { name: true, phone: true } } },
    }),
    prisma.reservation.findMany({
      where: baseWhere({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reminder2hSentAt: null as any,
        startAt: { gte: from2h, lte: until2h },
      }),
      include: { tenant: { select: { name: true, phone: true } } },
    }),
  ])

  // Filter out reservations without a customer email
  const needs24h = res24h.filter(r => r.customerEmail)
  const needs2h  = res2h.filter(r => r.customerEmail)

  let sent = 0
  let errors = 0

  await Promise.allSettled([
    ...needs24h.map(async (r) => {
      try {
        await sendReminderToCustomer({
          to:           r.customerEmail,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { reminderSentAt: new Date() } as any,
        })
        sent++
      } catch { errors++ }
    }),

    ...needs2h.map(async (r) => {
      try {
        await sendReminderToCustomer({
          to:           r.customerEmail,
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { reminder2hSentAt: new Date() } as any,
        })
        sent++
      } catch { errors++ }
    }),
  ])

  return NextResponse.json({
    ok:      true,
    sent,
    errors,
    checked: { '24h': needs24h.length, '2h': needs2h.length },
  })
}
