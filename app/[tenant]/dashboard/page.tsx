import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { AlertTriangle, Clock, Plus, ArrowRight, TrendingUp } from 'lucide-react'
import AutoRefresh from '../_components/AutoRefresh'
import AnimatedNumber from '../_components/AnimatedNumber'
import { getServerT } from '@/lib/server-t'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()
  const tenantId = session.tenantId
  const t = await getServerT('dashboard')
  const tRentals = await getServerT('rentals')
  const tStatus = await getServerT('status')

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
      include: {
        bike:  true,
        bikes: { include: { bike: true } },
        customer: true,
      },
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
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'
  const dayLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="max-w-4xl mx-auto">
      <AutoRefresh />

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
            {greeting} <span style={{ color: '#0D9488' }}>—</span>
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: '#94A3B8' }}>{dayLabel}</p>
        </div>
        <Link
          href={`/${tenant}/rentals/new`}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)', boxShadow: '0 4px 14px rgba(13,148,136,0.35)' }}
        >
          <Plus size={15} /> {tRentals('new')}
        </Link>
      </div>

      {/* ── Overdue alert ── */}
      {overdueRentals.length > 0 && (
        <div
          className="rounded-2xl p-4 mb-5 flex items-start gap-3"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FEE2E2' }}>
            <AlertTriangle size={15} style={{ color: '#DC2626' }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1.5" style={{ color: '#DC2626' }}>
              {overdueRentals.length} retour{overdueRentals.length > 1 ? 's' : ''} en retard
            </p>
            <div className="space-y-1">
              {overdueRentals.map(r => (
                <Link key={r.id} href={`/${tenant}/rentals/${r.id}`} className="block text-xs hover:underline" style={{ color: '#EF4444' }}>
                  {r.customer.firstName} {r.customer.lastName} — {(r.bikes?.[0]?.bike ?? r.bike)?.name} — {new Date(r.expectedReturnAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 stagger">

        {/* EN COURS — hero dark */}
        <Link
          href={`/${tenant}/rentals`}
          className="relative overflow-hidden rounded-2xl p-4 block card-hover col-span-1"
          style={{ background: '#0F172A' }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.25) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#0D9488', boxShadow: '0 0 6px #0D9488', animation: 'pulse 2s infinite' }} />
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#5EEAD4' }}>{tStatus('active')}</p>
          </div>
          <p className="text-4xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>
            <AnimatedNumber value={activeRentals.length} />
          </p>
          <p className="text-[11px] mt-1.5" style={{ color: '#475569' }}>locations actives</p>
        </Link>

        {/* VÉLOS DISPONIBLES */}
        <Link
          href={`/${tenant}/bikes`}
          className="rounded-2xl p-4 block card-hover"
          style={{ background: 'white', border: '1.5px solid #E2E8F0', borderTop: '4px solid #0D9488' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>{t('availableBikes')}</p>
          <p className="text-4xl font-bold" style={{ color: '#0D9488', letterSpacing: '-0.03em' }}>
            <AnimatedNumber value={bikesAvailable} />
          </p>
          <p className="text-[11px] mt-1.5" style={{ color: '#94A3B8' }}>/ {bikesTotal} vélos</p>
        </Link>

        {/* AUJOURD'HUI */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'white', border: '1.5px solid #E2E8F0', borderTop: '4px solid #334155' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>{t('today')}</p>
          <p className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
            <AnimatedNumber value={todayRevenue} decimals={2} suffix=" €" duration={800} />
          </p>
          <p className="text-[11px] mt-1.5" style={{ color: '#94A3B8' }}>{todayInvoices._count} clôturée{todayInvoices._count !== 1 ? 's' : ''}</p>
        </div>

        {/* EN RETARD */}
        <div
          className="rounded-2xl p-4"
          style={overdueRentals.length > 0
            ? { background: '#FEF2F2', border: '1.5px solid #FECACA', borderTop: '4px solid #EF4444' }
            : { background: 'white', border: '1.5px solid #E2E8F0', borderTop: '4px solid #E2E8F0' }
          }
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: overdueRentals.length > 0 ? '#EF4444' : '#94A3B8' }}>
            {tStatus('overdue')}
          </p>
          <p className="text-4xl font-bold" style={{ letterSpacing: '-0.03em', color: overdueRentals.length > 0 ? '#EF4444' : '#CBD5E1' }}>
            <AnimatedNumber value={overdueRentals.length} />
          </p>
          <p className="text-[11px] mt-1.5" style={{ color: overdueRentals.length > 0 ? '#FCA5A5' : '#94A3B8' }}>
            {tRentals('lateReturn')}
          </p>
        </div>
      </div>

      {/* ── Month revenue banner ── */}
      <div
        className="rounded-2xl p-5 mb-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #134E4A 100%)' }}
      >
        {/* Decorative glow */}
        <div className="absolute right-0 top-0 w-48 h-48 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.2) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={13} style={{ color: '#5EEAD4' }} />
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#5EEAD4' }}>
                {t('revenueLabel')} — {monthName.toUpperCase()}
              </p>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>
              <AnimatedNumber value={monthRevenue} decimals={2} suffix=" €" duration={900} />
            </p>
          </div>
          <div className="flex sm:block items-center gap-4 sm:text-right border-t border-white/5 pt-2 sm:border-0 sm:pt-0">
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Locations clôturées</p>
            <p className="text-2xl sm:text-3xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>
              <AnimatedNumber value={monthInvoices._count} duration={900} />
            </p>
          </div>
        </div>
      </div>

      {/* ── Active rentals list ── */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #E2E8F0' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">{t('activeRentals')}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{activeRentals.length} en cours</p>
          </div>
          <Link
            href={`/${tenant}/rentals`}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: '#0D9488' }}
          >
            {t('viewAll')} <ArrowRight size={12} />
          </Link>
        </div>

        {activeRentals.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="relative w-14 h-14 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(13,148,136,0.06)' }} />
              <div className="absolute inset-[6px] rounded-full" style={{ background: 'rgba(13,148,136,0.1)' }} />
              <div className="absolute inset-[13px] rounded-full flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.18)' }}>
                <Clock size={13} style={{ color: '#0D9488' }} />
              </div>
            </div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: '#334155' }}>{tRentals('noActive')}</p>
            <p className="text-[11px] mb-5" style={{ color: '#94A3B8' }}>Les locations actives apparaîtront ici en temps réel</p>
            <Link
              href={`/${tenant}/rentals/new`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)', color: 'white', boxShadow: '0 2px 8px rgba(13,148,136,0.3)' }}
            >
              <Plus size={11} /> {tRentals('new')}
            </Link>
          </div>
        ) : (
          <div className="stagger">
            {activeRentals.map((rental, i) => {
              const elapsedMs = now.getTime() - new Date(rental.startAt).getTime()
              const hours = Math.floor(elapsedMs / 3600000)
              const minutes = Math.floor((elapsedMs % 3600000) / 60000)
              const durationLabel = hours > 0 ? `${hours}h${minutes > 0 ? `${minutes}` : ''}` : `${minutes}min`
              const isOverdue = rental.expectedReturnAt && new Date(rental.expectedReturnAt) < now
              const bikeDisplay = (rental.bikes?.[0]?.bike ?? rental.bike)
              return (
                <Link
                  key={rental.id}
                  href={`/${tenant}/rentals/${rental.id}`}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50"
                  style={{
                    borderBottom: i < activeRentals.length - 1 ? '1px solid #F8FAFC' : 'none',
                    background: isOverdue ? '#FFF8F8' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: isOverdue ? '#EF4444' : '#10B981', boxShadow: `0 0 6px ${isOverdue ? '#EF4444' : '#10B981'}` }}
                    />
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{rental.customer.firstName} {rental.customer.lastName}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {bikeDisplay?.name}
                        {bikeDisplay?.code && <span className="font-mono ml-1 text-[10px]">{bikeDisplay.code}</span>}
                        {(rental.bikes?.length ?? 0) > 1 && <span className="ml-1">+{rental.bikes.length - 1}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold flex items-center gap-1 justify-end" style={{ color: isOverdue ? '#EF4444' : '#334155' }}>
                      {isOverdue && <AlertTriangle size={12} />}
                      {durationLabel}
                    </p>
                    {rental.expectedReturnAt && (
                      <p className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>
                        retour {new Date(rental.expectedReturnAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
