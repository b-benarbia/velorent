import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getServerT } from '@/lib/server-t'
import RentalsClient from './RentalsClient'

export default async function RentalsPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()
  const t = await getServerT('rentals')
  const tStatus = await getServerT('status')

  const rentals = await prisma.rental.findMany({
    where: { tenantId: session.tenantId },
    include: {
      bike:  true,  // backward compat
      bikes: { include: { bike: true } },
      customer: true,
    },
    orderBy: { startAt: 'desc' },
  })

  // KPI calculations
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const revenueToday = rentals
    .filter(r => new Date(r.startAt) >= today)
    .reduce((sum, r) => sum + (r.amountPaid ? Number(r.amountPaid) : 0), 0)

  const activeCount = rentals.filter(r => r.status === 'ACTIVE').length
  const overdueCount = rentals.filter(r =>
    r.status === 'OVERDUE' ||
    (r.status === 'ACTIVE' && r.expectedReturnAt && new Date(r.expectedReturnAt) < new Date())
  ).length

  const statusLabels: Record<string, string> = {
    active:    tStatus('active'),
    completed: tStatus('completed'),
    overdue:   tStatus('overdue'),
    cancelled: tStatus('cancelled'),
  }

  return (
    <RentalsClient
      tenant={tenant}
      rentals={rentals.map(r => {
        const firstBike = r.bikes?.[0]?.bike ?? r.bike
        return {
          id: r.id,
          status: r.status,
          startAt: r.startAt.toISOString(),
          expectedReturnAt: r.expectedReturnAt?.toISOString() ?? null,
          amountPaid: r.amountPaid ? Number(r.amountPaid) : null,
          bikeCount: (r.bikes?.length ?? 0) > 0 ? r.bikes.length : 1,
          bike: firstBike ? { name: firstBike.name, code: firstBike.code } : { name: '—', code: '—' },
          customer: { firstName: r.customer.firstName, lastName: r.customer.lastName },
        }
      })}
      kpi={{ revenueToday, activeCount, overdueCount }}
      labels={{
        title:             t('title'),
        new:               t('new'),
        active:            t('active'),
        noActive:          t('noActive'),
        inProgress:        t('inProgress'),
        closeArrow:        t('closeArrow'),
        lateReturn:        t('lateReturn'),
        history:           t('history'),
        client:            t('client'),
        bike:              t('bike'),
        noHistory:         t('noHistory'),
        kpiRevenue:        t('kpiRevenue'),
        kpiActive:         t('kpiActive'),
        kpiOverdue:        t('kpiOverdue'),
        tabAll:            t('tabAll'),
        tabActive:         t('tabActive'),
        tabOverdue:        t('tabOverdue'),
        tabCompleted:      t('tabCompleted'),
        tabCancelled:      t('tabCancelled'),
        searchPlaceholder: t('searchPlaceholder'),
        inProgressLabel:   t('inProgressLabel'),
      }}
      statusLabels={statusLabels}
    />
  )
}
