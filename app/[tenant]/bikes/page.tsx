import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Bike, Zap, Mountain, Package, Heart, Gauge, Flag, Wrench, Plus } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  AVAILABLE:   { label: 'Disponible',  color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-400' },
  RENTED:      { label: 'En location', color: 'bg-indigo-50 text-indigo-600',   dot: 'bg-indigo-400' },
  MAINTENANCE: { label: 'Maintenance', color: 'bg-amber-50 text-amber-600',     dot: 'bg-amber-400' },
  RETIRED:     { label: 'Retiré',      color: 'bg-slate-100 text-slate-400',    dot: 'bg-slate-300' },
}

const TYPE_CONFIG: Record<string, { label: string; Icon: React.ElementType; bg: string; iconColor: string }> = {
  CITY:     { label: 'Vélos de ville',    Icon: Bike,     bg: 'bg-indigo-50',  iconColor: 'text-indigo-500' },
  ELECTRIC: { label: 'Vélos électriques', Icon: Zap,      bg: 'bg-amber-50',   iconColor: 'text-amber-500' },
  MOUNTAIN: { label: 'VTT',               Icon: Mountain, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  CARGO:    { label: 'Vélos cargo',       Icon: Package,  bg: 'bg-purple-50',  iconColor: 'text-purple-500' },
  KIDS:     { label: 'Vélos enfant',      Icon: Heart,    bg: 'bg-pink-50',    iconColor: 'text-pink-500' },
  ESCOOTER: { label: 'Trottinettes',      Icon: Gauge,    bg: 'bg-slate-100',  iconColor: 'text-slate-500' },
  ROAD:     { label: 'Vélos de route',    Icon: Flag,     bg: 'bg-red-50',     iconColor: 'text-red-500' },
}

const TYPE_ORDER = ['CITY', 'ELECTRIC', 'MOUNTAIN', 'ROAD', 'CARGO', 'KIDS', 'ESCOOTER']

export default async function BikesPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Flotte</h1>
          <p className="text-sm text-slate-400 mt-0.5">{stats.total} véhicule{stats.total !== 1 ? 's' : ''} au total</p>
        </div>
        <Link
          href={`/${tenant}/bikes/new`}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-opacity"
          style={{ background: '#6366F1' }}
        >
          <Plus size={15} /> Ajouter un vélo
        </Link>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">{stats.total}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Total</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-emerald-500 tracking-tight">{stats.available}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Disponibles</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold tracking-tight" style={{ color: '#6366F1' }}>{stats.rented}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">En location</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-amber-500 tracking-tight">{stats.maintenance}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Maintenance</p>
        </div>
      </div>

      {/* Empty state */}
      {bikes.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center">
          <div className="flex justify-center mb-3"><Bike size={36} className="text-slate-200" /></div>
          <p className="text-slate-400 mb-4 text-sm">Aucun vélo dans la flotte</p>
          <Link
            href={`/${tenant}/bikes/new`}
            className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            style={{ background: '#6366F1' }}
          >
            Ajouter le premier vélo
          </Link>
        </div>
      )}

      {/* Grouped sections */}
      <div className="space-y-8">
        {sortedTypes.map(type => {
          const group = grouped[type]
          const config = TYPE_CONFIG[type] ?? { label: type, Icon: Bike, bg: 'bg-slate-50', iconColor: 'text-slate-500' }
          const { Icon, label, bg, iconColor } = config
          const availableCount = group.filter(b => b.status === 'AVAILABLE').length

          return (
            <div key={type}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={15} className={iconColor} />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-900 text-sm">{label}</h2>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {group.length}
                  </span>
                  {availableCount > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {availableCount} dispo
                    </span>
                  )}
                </div>
              </div>

              {/* Bike cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.map(bike => {
                  const status = STATUS_CONFIG[bike.status] ?? STATUS_CONFIG.AVAILABLE
                  return (
                    <Link
                      key={bike.id}
                      href={`/${tenant}/bikes/${bike.id}`}
                      className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 group card-hover"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                            {bike.name}
                          </p>
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            {bike.code}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full ${status.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </div>
                      </div>

                      {bike.status === 'MAINTENANCE' && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-500">
                          <Wrench size={11} /> En maintenance
                        </div>
                      )}
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
