import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Bike, AlertTriangle, Plus } from 'lucide-react'
import { getServerT } from '@/lib/server-t'

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    'bg-indigo-50 text-indigo-600',
  COMPLETED: 'bg-slate-100 text-slate-500',
  OVERDUE:   'bg-red-50 text-red-500',
  CANCELLED: 'bg-red-50 text-red-500',
}

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
    include: { bike: true, customer: true },
    orderBy: { startAt: 'desc' },
    take: 50,
  })

  const active = rentals.filter(r => r.status === 'ACTIVE' || r.status === 'OVERDUE')
  const closed = rentals.filter(r => r.status !== 'ACTIVE' && r.status !== 'OVERDUE')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{active.length} {t('inProgress')}</p>
        </div>
        <Link
          href={`/${tenant}/rentals/new`}
          className="flex items-center gap-1.5 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8b5cf6)' }}
        >
          <Plus size={14} /> {t('new')}
        </Link>
      </div>

      {/* En cours */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
          {t('active')} — {active.length}
        </p>
        {active.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <Bike size={24} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">{t('noActive')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(rental => {
              const elapsedMs = Date.now() - new Date(rental.startAt).getTime()
              const hours = Math.floor(elapsedMs / 3600000)
              const minutes = Math.floor((elapsedMs % 3600000) / 60000)
              const durationLabel = hours > 0 ? `${hours}J · ${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes}min`
              const isOverdue = rental.status === 'OVERDUE' || (rental.expectedReturnAt && new Date(rental.expectedReturnAt) < new Date())
              return (
                <div
                  key={rental.id}
                  className={`bg-white rounded-2xl border p-3.5 flex items-center justify-between gap-3 ${isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {rental.customer.firstName} {rental.customer.lastName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {rental.bike.name} · <span className="font-mono">{rental.bike.code}</span> · {durationLabel} en cours
                      </p>
                      {isOverdue && (
                        <p className="text-xs text-red-500 font-medium mt-0.5 flex items-center gap-1">
                          <AlertTriangle size={10} /> {t('lateReturn')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/${tenant}/rentals/${rental.id}`}
                    className="text-white text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0"
                    style={{ background: '#6366F1' }}
                  >
                    {t('closeArrow')}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Historique — cards sur mobile, table sur desktop */}
      {closed.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">{t('history')}</p>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">{t('client')}</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{t('bike')}</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">€</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {closed.map(rental => {
                  const statusColor = STATUS_COLOR[rental.status] ?? 'bg-slate-100 text-slate-500'
                  const statusLabel = tStatus(rental.status.toLowerCase() as Parameters<typeof tStatus>[0])
                  return (
                    <tr key={rental.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-900">
                        {rental.customer.firstName} {rental.customer.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{rental.bike.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(rental.startAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                        {rental.amountPaid ? `${Number(rental.amountPaid).toFixed(2)} €` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/${tenant}/rentals/${rental.id}`}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full hover:opacity-80 ${statusColor}`}
                        >
                          {statusLabel ?? rental.status}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {closed.map(rental => {
              const statusColor = STATUS_COLOR[rental.status] ?? 'bg-slate-100 text-slate-500'
              const statusLabel = tStatus(rental.status.toLowerCase() as Parameters<typeof tStatus>[0])
              return (
                <Link
                  key={rental.id}
                  href={`/${tenant}/rentals/${rental.id}`}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 block"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {rental.customer.firstName} {rental.customer.lastName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {rental.bike.name} · {new Date(rental.startAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-slate-700">
                      {rental.amountPaid ? `${Number(rental.amountPaid).toFixed(0)} €` : '—'}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                      {statusLabel ?? rental.status}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
