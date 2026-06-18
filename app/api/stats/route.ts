import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const tenantId = session.tenantId

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    activeRentals,
    overdueRentals,
    bikesAvailable,
    bikesTotal,
    todayInvoices,
    monthInvoices,
    recentRentals,
  ] = await Promise.all([
    prisma.rental.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.rental.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        expectedReturnAt: { lt: now },
      },
    }),
    prisma.bike.count({ where: { tenantId, status: 'AVAILABLE' } }),
    prisma.bike.count({ where: { tenantId } }),
    prisma.invoice.aggregate({
      where: { tenantId, issuedAt: { gte: todayStart } },
      _sum: { amountTtc: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { tenantId, issuedAt: { gte: monthStart } },
      _sum: { amountTtc: true },
      _count: true,
    }),
    prisma.rental.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { startAt: 'desc' },
      take: 5,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        bike: { select: { name: true, code: true } },
      },
    }),
  ])

  return NextResponse.json({
    activeRentals,
    overdueRentals,
    bikesAvailable,
    bikesTotal,
    today: {
      revenue: Number(todayInvoices._sum.amountTtc ?? 0),
      count: todayInvoices._count,
    },
    month: {
      revenue: Number(monthInvoices._sum.amountTtc ?? 0),
      count: monthInvoices._count,
    },
    recentRentals,
  })
}
