import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Bike, AlertTriangle, Plus } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ACTIVE:    { label: 'En cours',  color: 'bg-indigo-50 text-indigo-600' },
  COMPLETED: { label: 'Clôturée', color: 'bg-slate-100 text-slate-500' },
  OVERDUE:   { label: 'En retard', color: 'bg-red-50 text-red-500' },
  CANCELLED: { label: 'Annulée',  color: 'bg-red-50 text-red-500' },
}

export default async function RentalsPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()

  const rentals = await prisma.rental.findMany({
    where: { tenantId: session.tenantId },
    include: { bike: true, customer: true },
    orderBy: { startAt: 'desc' },
    take: 50,
  })

  const active = rentals.filter(r => r.status === 'ACTIVE')
  const closed = rentals.filter(r => r.status !== 'ACTIVE')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Locations</h1>
          <p className="text-sm text-slate-400 mt-0.5">{active.length} en cours</p>
        </div>
        <Link
          href={`/${tenant}/rentals/new`}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          style={{ background: '#6366F1' }}
        >
          <Plus size={15} /> Nouvelle location
        </Link>
      </div>

      {/* Active */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
          En cours — {active.length}
        </p>
        {active.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <div className="flex justify-center mb-2"><Bike size={28} className="text-slate-200" /></div>
            <p className="text-sm text-slate-400">Aucune location active</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {active.map(rental => {
              const elapsedMs = Date.now() - new Date(rental.startAt).getTime()
              const hours = Math.floor(elapsedMs / 3600000)
              const minutes = Math.floor((elapsedMs % 3600000) / 60000)
              const durationLabel = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes}min`
              const isOverdue = rental.expectedReturnAt && new Date(rental.expectedReturnAt) < new Date()
              return (
                <div
                  key={rental.id}
                  className={`bg-white rounded-2xl border p-4 flex items-center justify-between ${isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {rental.customer.firstName} {rental.customer.lastName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {rental.bike.name} · <span className="font-mono">{rental.bike.code}</span> · {durationLabel} en cours
                      </p>
                      {isOverdue && (
                        <p className="text-xs text-red-500 font-medium mt-0.5 flex items-center gap-1">
                          <AlertTriangle size={11} />Retour en retard
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/${tenant}/rentals/${rental.id}`}
                    className="text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex-shrink-0"
                    style={{ background: '#6366F1' }}
                  >
                    Clôturer →
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* History */}
      {closed.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Historique</p>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Client</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Vélo</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Montant</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {closed.map(rental => {
                  const status = STATUS_LABEL[rental.status]
                  return (
                    <tr key={rental.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-900">
                        {rental.customer.firstName} {rental.customer.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{rental.bike.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(rental.startAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">
                        {rental.amountPaid ? `${Number(rental.amountPaid).toFixed(2)} €` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/${tenant}/rentals/${rental.id}`}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full hover:opacity-80 ${status?.color ?? 'bg-slate-100 text-slate-500'}`}
                        >
                          {status?.label ?? rental.status}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
