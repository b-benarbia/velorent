import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReminderToCustomer } from '@/lib/email'

// ── Security ───────────────────────────────────────────────────────────────
// Vercel passes Authorization: Bearer <CRON_SECRET> on every cron invocation.
// In dev you can hit the route directly (no secret required).
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // dev — no secret configured, allow
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now   = new Date()
  // Window: reservations starting between now+1h and now+25h
  // → catches the "24h before" window in a 1-hour cron cadence
  const from  = new Date(now.getTime() + 1  * 60 * 60 * 1000)   // +1h
  const until = new Date(now.getTime() + 25 * 60 * 60 * 1000)   // +25h

  // Find PENDING or CONFIRMED reservations with an email, no reminder sent yet
  const reservations = await prisma.reservation.findMany({
    where: {
      status:        { in: ['PENDING', 'CONFIRMED'] },
      customerEmail: { not: null },
      reminderSentAt: null,
      startAt: { gte: from, lte: until },
    },
    include: {
      tenant: { select: { name: true, phone: true } },
    },
  })

  let sent  = 0
  let errors = 0

  await Promise.allSettled(
    reservations.map(async (r) => {
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
          locale:       'fr', // default — customer locale not stored yet
        })
        await prisma.reservation.update({
          where: { id: r.id },
          data:  { reminderSentAt: new Date() },
        })
        sent++
      } catch {
        errors++
      }
    })
  )

  return NextResponse.json({
    ok:     true,
    sent,
    errors,
    checked: reservations.length,
    window: { from: from.toISOString(), until: until.toISOString() },
  })
}
