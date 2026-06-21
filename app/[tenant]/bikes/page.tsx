import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Bike, Zap, Mountain, Package, Heart, Gauge, Flag, Wrench, Plus, ArrowRight } from 'lucide-react'
import { getServerT } from '@/lib/server-t'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; accentColor: string; labelKey: string }> = {
  CITY:     { labelKey: 'city',     icon: Bike,     accentColor: '#0D9488' },
  ELECTRIC: { labelKey: 'electric', icon: Zap,      accentColor: '#F59E0B' },
  MOUNTAIN: { labelKey: 'mountain', icon: Mountain, accentColor: '#10B981' },
  CARGO:    { labelKey: 'cargo',    icon: Package,  accentColor: '#8B5CF6' },
  KIDS:     { labelKey: 'kids',     icon: Heart,    accentColor: '#EC4899' },
  ESCOOTER: { labelKey: 'escooter', icon: Gauge,    accentColor: '#64748B' },
  ROAD:     { labelKey: 'road',     icon: Flag,     accentColor: '#EF4444' },
}

type StatusKey = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED'

const STATUS_CONFIG: Record<StatusKey, { label: string; dotColor: string; textColor: string; bg: string; border: string }> = {
  AVAILABLE:   { label: 'Disponible',  dotColor: '#10B981', textColor: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
  RENTED:      { label: 'En location', dotColor: '#0D9488', textColor: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
  MAINTENANCE: { label: 'Maintenance', dotColor: '#F59E0B', textColor: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  RETIRED:     { label: 'Retiré',      dotColor: '#CBD5E1', textColor: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
}

const TYPE_ORDER = ['CITY', 'ELECTRIC', 'MOUNTAIN', 'ROAD', 'CARGO', 'KIDS', 'ESCOOTER']

export default async function BikesPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()
  const t = await getServerT('bikes')

  const bikes = await prisma.bike.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { code: 'asc' },
  })

  const grouped = bikes.reduce<Record<string, typeof bikes>>((acc, bike) => {
    if (!acc[bike.type]) acc[bike.type] = []
    acc[bike.type].push(bike)
    return acc
  }, {})

  const sortedTypes = [
    ...TYPE_ORDER.filter(t => grouped[t]),
    ...Object.keys(grouped).filter(t => !TYPE_ORDER.includes(t)),
  ]

  const stats = {
    total: bikes.length,
    available: bikes.filter(b => b.status === 'AVAILABLE').length,
    rented: bikes.filter(b => b.status === 'RENTED').length,
    maintenance: bikes.filter(b => b.status === 'MAINTENANCE').length,
  }

  const TYPE_LABELS: Record<string, string> = {
    CITY: 'City', ELECTRIC: 'Electric', MOUNTAIN: 'Mountain', ROAD: 'Road',
    CARGO: 'Cargo', KIDS: 'Kids', ESCOOTER: 'E-Scooter',
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>{t('title')}</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>{stats.total} véhicule{stats.total !== 1 ? 's' : ''} au total</p>
        </div>
        <Link
          href={`/${tenant}/bikes/new`}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)', boxShadow: '0 4px 14px rgba(13,148,136,0.35)' }}
        >
          <Plus size={15} /> {t('add')}
        </Link>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 stagger">
        {/* Total — hero dark */}
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: '#0F172A' }}>
          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.2) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#5EEAD4' }}>Total</p>
          <p className="text-4xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>{stats.total}</p>
          <p className="text-[11px] mt-1.5" style={{ color: '#475569' }}>dans la flotte</p>
        </div>

        {/* Disponible */}
        <div className="rounded-2xl p-4" style={{ background: 'white', border: '1.5px solid #E2E8F0', borderTop: '4px solid #10B981' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>{t('available')}</p>
          <p className="text-4xl font-bold" style={{ color: '#10B981', letterSpacing: '-0.03em' }}>{stats.available}</p>
          <p className="text-[11px] mt-1.5" style={{ color: '#94A3B8' }}>prêts à louer</p>
        </div>

        {/* En location */}
        <div className="rounded-2xl p-4" style={{ background: '#F0FDFA', border: '1.5px solid #99F6E4', borderTop: '4px solid #0D9488' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#5EEAD4' }}>{t('rented')}</p>
          <p className="text-4xl font-bold" style={{ color: '#0D9488', letterSpacing: '-0.03em' }}>{stats.rented}</p>
          <p className="text-[11px] mt-1.5" style={{ color: '#0F766E' }}>en circulation</p>
        </div>

        {/* Maintenance */}
        <div
          className="rounded-2xl p-4"
          style={stats.maintenance > 0
            ? { background: '#FFFBEB', border: '1.5px solid #FDE68A', borderTop: '4px solid #F59E0B' }
            : { background: 'white', border: '1.5px solid #E2E8F0', borderTop: '4px solid #E2E8F0' }
          }
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: stats.maintenance > 0 ? '#D97706' : '#94A3B8' }}>{t('maintenance')}</p>
          <p className="text-4xl font-bold" style={{ letterSpacing: '-0.03em', color: stats.maintenance > 0 ? '#F59E0B' : '#CBD5E1' }}>{stats.maintenance}</p>
          <p className="text-[11px] mt-1.5" style={{ color: stats.maintenance > 0 ? '#D97706' : '#94A3B8' }}>en atelier</p>
        </div>
      </div>

      {/* ── Empty state ── */}
      {bikes.length === 0 && (
        <div className="bg-white rounded-2xl text-center py-16 px-8" style={{ border: '1.5px solid #E2E8F0' }}>
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(13,148,136,0.06)' }} />
            <div className="absolute inset-[7px] rounded-full" style={{ background: 'rgba(13,148,136,0.1)' }} />
            <div className="absolute inset-[15px] rounded-full flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.18)' }}>
              <Bike size={15} style={{ color: '#0D9488' }} />
            </div>
          </div>
          <p className="text-[15px] font-semibold mb-2" style={{ color: '#334155' }}>{t('noNikes')}</p>
          <p className="text-[12px] mb-6" style={{ color: '#94A3B8' }}>Ajoutez votre premier véhicule pour commencer</p>
          <Link
            href={`/${tenant}/bikes/new`}
            className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)', boxShadow: '0 2px 10px rgba(13,148,136,0.35)' }}
          >
            <Plus size={14} /> {t('add')}
          </Link>
        </div>
      )}

      {/* ── Grouped sections ── */}
      <div className="space-y-8">
        {sortedTypes.map(type => {
          const group = grouped[type]
          const config = TYPE_CONFIG[type] ?? { icon: Bike, accentColor: '#64748B' }
          const { icon: Icon, accentColor } = config
          const label = TYPE_LABELS[type] ?? type
          const availableCount = group.filter(b => b.status === 'AVAILABLE').length

          return (
            <div key={type}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
                >
                  <Icon size={14} style={{ color: accentColor }} />
                </div>
                <h2 className="font-semibold text-slate-900 text-sm">{label}</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F1F5F9', color: '#64748B' }}>
                  {group.length}
                </span>
                {availableCount > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }}>
                    {availableCount} dispo
                  </span>
                )}
              </div>

              {/* Bike cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.map(bike => {
                  const sc = STATUS_CONFIG[(bike.status as StatusKey)] ?? STATUS_CONFIG.AVAILABLE
                  return (
                    <Link
                      key={bike.id}
                      href={`/${tenant}/bikes/${bike.id}`}
                      className="group card-hover block"
                      style={{
                        background: 'white',
                        border: '1.5px solid #E2E8F0',
                        borderLeft: `4px solid ${sc.dotColor}`,
                        borderRadius: 16,
                        padding: 16,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-900 truncate group-hover:text-teal-700 transition-colors" style={{ letterSpacing: '-0.01em' }}>
                            {bike.name}
                          </p>
                          <span
                            className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded mt-1"
                            style={{ background: '#F1F5F9', color: '#64748B' }}
                          >
                            {bike.code}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ml-2"
                          style={{ background: sc.bg, color: sc.textColor, border: `1px solid ${sc.border}` }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dotColor }} />
                          {sc.label}
                        </div>
                      </div>

                      {bike.status === 'MAINTENANCE' && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px]" style={{ color: '#D97706' }}>
                          <Wrench size={11} />
                          <span>En atelier</span>
                        </div>
                      )}

                      {/* Hover arrow */}
                      <div className="mt-3 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={13} style={{ color: '#0D9488' }} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
