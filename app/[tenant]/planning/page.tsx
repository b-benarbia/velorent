import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getServerT } from '@/lib/server-t'
import PlanningClient from './PlanningClient'

export default async function PlanningPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()
  const t = await getServerT('planning')

  const [bikes, rentals] = await Promise.all([
    prisma.bike.findMany({
      where: { tenantId: session.tenantId, status: { not: 'RETIRED' } },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    }),
    prisma.rental.findMany({
      where: {
        tenantId: session.tenantId,
        OR: [
          { status: 'ACTIVE' },
          { status: 'OVERDUE' },
          {
            status: { in: ['COMPLETED', 'CANCELLED'] },
            startAt: { gte: new Date(Date.now() - 60 * 86400000) },
          },
        ],
      },
      include: { customer: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { startAt: 'desc' },
    }),
  ])

  // Build group map: same customer + same start day + same expected return day = family rental
  const groupCounts = new Map<string, number>()
  rentals.forEach(r => {
    const key = `${r.customerId}__${r.startAt.toISOString().slice(0, 10)}__${r.expectedReturnAt?.toISOString().slice(0, 10) ?? 'open'}`
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1)
  })

  return (
    <PlanningClient
      tenant={tenant}
      bikes={bikes.map(b => ({ id: b.id, code: b.code, name: b.name, type: b.type }))}
      rentals={rentals.map(r => {
        const groupKey = `${r.customerId}__${r.startAt.toISOString().slice(0, 10)}__${r.expectedReturnAt?.toISOString().slice(0, 10) ?? 'open'}`
        return {
          id: r.id,
          bikeId: r.bikeId,
          customerId: r.customerId,
          customerName: `${r.customer.firstName} ${r.customer.lastName}`,
          status: r.status,
          startAt: r.startAt.toISOString(),
          endAt: (r.endAt ?? r.expectedReturnAt ?? new Date()).toISOString(),
          groupKey,
          groupSize: groupCounts.get(groupKey) ?? 1,
        }
      })}
      labels={{
        title:           t('title'),
        today:           t('today'),
        kpiActive:       t('kpiActive'),
        kpiOverdue:      t('kpiOverdue'),
        kpiAvailable:    t('kpiAvailable'),
        filterAll:       t('filterAll'),
        statusActive:    t('statusActive'),
        statusOverdue:   t('statusOverdue'),
        statusCompleted: t('statusCompleted'),
        statusCancelled: t('statusCancelled'),
        legendActive:    t('legendActive'),
        legendOverdue:   t('legendOverdue'),
        legendCompleted: t('legendCompleted'),
        legendAvailable: t('legendAvailable'),
        legendGroup:     t('legendGroup'),
        groupBikes:      t('groupBikes'),
        noBikes:         t('noBikes'),
      }}
    />
  )
}
