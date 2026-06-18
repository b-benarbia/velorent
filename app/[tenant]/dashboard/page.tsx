import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { AlertTriangle, Clock, Plus } from 'lucide-react'
import AutoRefresh from '../_components/AutoRefresh'
import AnimatedNumber from '../_components/AnimatedNumber'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()
  const tenantId = session.tenantId

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [bikes, activeRentals, todayInvoices, monthInvoices] = await Promise.all([
    prisma.bike.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    }),
    prisma.rental.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: { bike: true, customer: true },
      orderBy: { startAt: 'desc' },
    }),
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
  ])

  const bikesAvailable = bikes.find(b => b.status === 'AVAILABLE')?._count ?? 0
  const bikesTotal = bikes.reduce((s, b) => s + b._count, 0)
  const todayRevenue = Number(todayInvoices._sum.amountTtc ?? 0)
  const monthRevenue = Number(monthInvoices._sum.amountTtc ?? 0)
  const overdueRentals = activeRentals.filter(r => r.expectedReturnAt && new Date(r.expectedReturnAt) < now)
  const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto">
      <AutoRefresh />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link
          href={`/${tenant}/rentals/new`}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          style={{ background: '#6366F1' }}
        >
          <Plus size={15} /> Nouvelle location
        </Link>
      </div>

      {/* Overdue alert */}
      {overdueRentals.length > 0 && (
        <div className="border rounded-xl p-4 mb-5" style={{ background: '#fff5f5', borderColor: '#fecaca' }}>
          <p className="font-semibold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle size={15} />
            {overdueRentals.length} vélo{overdueRentals.length > 1 ? 's' : ''} en retard
          </p>
          <div className="space-y-1">
            {overdueRentals.map(r => (
              <Link key={r.id} href={`/${tenant}/rentals/${r.id}`} className="block text-sm text-red-600 hover:underline">
                {r.customer.firstName} {r.customer.lastName} — {r.bike.name} — prévu {new Date(r.expectedReturnAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 stagger">
        <Link href={`/${tenant}/rentals`} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 block card-hover">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">En cours</p>
          <p className="text-3xl font-semibold tracking-tight" style={{ color: '#6366F1' }}>
            <AnimatedNumber value={activeRentals.length} />
          </p>
          <p className="text-xs text-slate-400 mt-1">location{activeRentals.length !== 1 ? 's' : ''}</p>
        </Link>

        <Link href={`/${tenant}/bikes`} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-300 block card-hover">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Disponibles</p>
          <p className="text-3xl font-semibold tracking-tight text-emerald-500">
            <AnimatedNumber value={bikesAvailable} />
          </p>
          <p className="text-xs text-slate-400 mt-1">sur {bikesTotal} véhicule{bikesTotal !== 1 ? 's' : ''}</p>
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">{"Aujourd'hui"}</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">
            <AnimatedNumber value={todayRevenue} decimals={2} suffix=" €" duration={800} />
          </p>
          <p className="text-xs text-slate-400 mt-1">{todayInvoices._count} clôturée{todayInvoices._count !== 1 ? 's' : ''}</p>
        </div>

        <div className={`border rounded-2xl p-4 ${overdueRentals.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">En retard</p>
          <p className={`text-3xl font-semibold tracking-tight ${overdueRentals.length > 0 ? 'text-red-500' : 'text-slate-200'}`}>
            <AnimatedNumber value={overdueRentals.length} />
          </p>
          <p className="text-xs text-slate-400 mt-1">non rendu{overdueRentals.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Month revenue */}
      <div className="rounded-2xl p-5 mb-5 flex items-center justify-between" style={{ background: '#6366F1' }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>CA — {monthName}</p>
          <p className="text-3xl font-semibold text-white tracking-tight">
            <AnimatedNumber value={monthRevenue} decimals={2} suffix=" €" duration={900} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>Locations clôturées</p>
          <p className="text-2xl font-semibold text-white">
            <AnimatedNumber value={monthInvoices._count} duration={900} />
          </p>
        </div>
      </div>

      {/* Active rentals list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Locations en cours ({activeRentals.length})</h2>
          <Link href={`/${tenant}/rentals`} className="text-xs font-medium hover:underline" style={{ color: '#6366F1' }}>Voir toutes →</Link>
        </div>

        {activeRentals.length === 0 ? (
          <div className="p-10 text-center">
            <div className="flex justify-center mb-2"><Clock size={28} className="text-slate-200" /></div>
            <p className="text-sm text-slate-400">Aucune location active</p>
            <Link href={`/${tenant}/rentals/new`} className="text-xs hover:underline mt-1 block" style={{ color: '#6366F1' }}>Créer une location</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 stagger">
            {activeRentals.map(rental => {
              const elapsedMs = now.getTime() - new Date(rental.startAt).getTime()
              const hours = Math.floor(elapsedMs / 3600000)
              const minutes = Math.floor((elapsedMs % 3600000) / 60000)
              const durationLabel = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes}min`
              const isOverdue = rental.expectedReturnAt && new Date(rental.expectedReturnAt) < now
              return (
                <Link
                  key={rental.id}
                  href={`/${tenant}/rentals/${rental.id}`}
                  className={`flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    <div>
                      <p className="font-medium text-sm text-slate-900">{rental.customer.firstName} {rental.customer.lastName}</p>
                      <p className="text-xs text-slate-400">{rental.bike.name} · <span className="font-mono">{rental.bike.code}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isOverdue ? 'text-red-500' : 'text-slate-700'}`}>
                      {durationLabel} {isOverdue ? <AlertTriangle size={13} className="inline ml-1 text-red-400" /> : ''}
                    </p>
                    {rental.expectedReturnAt && (
                      <p className="text-xs text-slate-400">
                        Retour {new Date(rental.expectedReturnAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
