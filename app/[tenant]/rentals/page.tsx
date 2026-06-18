import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Bike, AlertTriangle } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Clôturée', color: 'bg-gray-100 text-gray-500' },
  OVERDUE: { label: 'En retard', color: 'bg-red-100 text-red-600' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-600' },
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
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <Link
          href={`/${tenant}/rentals/new`}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nouvelle location
        </Link>
      </div>

      {/* Active */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          En cours ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            <div className="flex justify-center mb-2"><Bike size={28} className="text-gray-300" /></div>
            <p>Aucune location active</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(rental => {
              const elapsedMs = Date.now() - new Date(rental.startAt).getTime()
              const hours = Math.floor(elapsedMs / 3600000)
              const minutes = Math.floor((elapsedMs % 3600000) / 60000)
              const durationLabel = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes}min`
              const isOverdue = rental.expectedReturnAt && new Date(rental.expectedReturnAt) < new Date()
              return (
                <div
                  key={rental.id}
                  className={`bg-white rounded-xl border p-4 flex items-center justify-between ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {rental.customer.firstName} {rental.customer.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {rental.bike.name} · {rental.bike.code} · {durationLabel} en cours
                    </p>
                    {isOverdue && (
                      <p className="text-xs text-red-600 font-medium mt-0.5">
                        <AlertTriangle size={12} className="inline mr-1" />Retour en retard
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/${tenant}/rentals/${rental.id}`}
                    className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Historique
          </h2>
          <div className="bg-white rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Vélo</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {closed.map(rental => {
                  const status = STATUS_LABEL[rental.status]
                  return (
                    <tr key={rental.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {rental.customer.firstName} {rental.customer.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{rental.bike.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(rental.startAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {rental.amountPaid ? `${Number(rental.amountPaid).toFixed(2)} €` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/${tenant}/rentals/${rental.id}`} className={`text-xs font-medium px-2 py-1 rounded-full hover:opacity-80 ${status?.color ?? 'bg-gray-100 text-gray-500'}`}>
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
